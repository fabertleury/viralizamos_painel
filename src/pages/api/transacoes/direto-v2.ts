import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial
pagamentosPool.on('error', (err) => {
  console.error('[API:TransacoesDiretoV2:Pool] Erro no pool de conexão:', err.message);
});

console.log('[API:TransacoesDiretoV2:Init] Pool de conexão inicializado com a abordagem do script de teste');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { pagina = 1, limite = 10, busca, status, metodoPagamento, dataInicio, dataFim } = req.query;

    // Obter conexão do pool
    const client = await pagamentosPool.connect();

    try {
      // Construir a query base
      let query = `
        SELECT 
          t.id,
          t.status,
          t.amount,
          t.method as payment_method,
          t.created_at as data_criacao,
          t.metadata,
          t.customer_phone,
          t.customer_email,
          t.customer_name,
          t.external_id,
          t.reference,
          pr.pix_code,
          pr.pix_qr_code
        FROM transactions t
        LEFT JOIN payment_requests pr ON t.payment_request_id = pr.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      // Adicionar filtros
      if (busca) {
        query += ` AND (
          t.customer_name ILIKE $${paramCount} OR 
          t.customer_email ILIKE $${paramCount} OR 
          t.customer_phone ILIKE $${paramCount} OR
          t.id::text ILIKE $${paramCount} OR
          t.external_id ILIKE $${paramCount} OR
          t.reference ILIKE $${paramCount}
        )`;
        params.push(`%${busca}%`);
        paramCount++;
      }

      if (status) {
        query += ` AND t.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (metodoPagamento) {
        query += ` AND t.method = $${paramCount}`;
        params.push(metodoPagamento);
        paramCount++;
      }

      if (dataInicio) {
        query += ` AND t.created_at >= $${paramCount}`;
        params.push(dataInicio);
        paramCount++;
      }

      if (dataFim) {
        query += ` AND t.created_at <= $${paramCount}`;
        params.push(dataFim);
        paramCount++;
      }

      // Ordenação
      query += ` ORDER BY t.created_at DESC`;

      // Paginação
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(Number(limite), (Number(pagina) - 1) * Number(limite));

      // Executar query
      const result = await client.query(query, params);

      // Contar total de registros
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
      const countResult = await client.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      // Formatar resposta
      const transacoes = result.rows.map(transacao => ({
        id: transacao.id,
        status: transacao.status,
        metodoPagamento: transacao.payment_method,
        valor: transacao.amount,
        dataCriacao: transacao.data_criacao,
        cliente: {
          nome: transacao.customer_name,
          email: transacao.customer_email,
          telefone: transacao.customer_phone
        },
        produto: {
          nome: transacao.metadata?.service_name || 'Serviço não especificado',
          descricao: transacao.metadata?.service_description || ''
        },
        pixCode: transacao.pix_code,
        pixQrCode: transacao.pix_qr_code
      }));

      return res.status(200).json({
        transacoes,
        total,
        totalPaginas: Math.ceil(total / Number(limite)),
        paginaAtual: Number(pagina)
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[API:TransacoesDiretoV2] Erro:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar transações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
