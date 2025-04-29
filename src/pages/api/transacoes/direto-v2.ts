import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  application_name: 'viralizamos_painel_transacoes'
});

// Conexão com o banco de dados de pedidos (orders)
const ordersPool = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  application_name: 'viralizamos_painel_orders'
});

// Verificar conexão inicial
pagamentosPool.on('error', (err) => {
  console.error('[API:TransacoesDiretoV2] Erro no pool de pagamentos:', err.message);
});

ordersPool.on('error', (err) => {
  console.error('[API:TransacoesDiretoV2] Erro no pool de orders:', err.message);
});

// Função para testar a conexão
async function testConnection(pool: Pool, name: string) {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log(`[API:TransacoesDiretoV2] Conexão com ${name} estabelecida com sucesso`);
  } catch (error) {
    console.error(`[API:TransacoesDiretoV2] Erro ao conectar com ${name}:`, error);
  }
}

// Testar conexões na inicialização
testConnection(pagamentosPool, 'banco de pagamentos');
testConnection(ordersPool, 'banco de orders');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { pagina = 1, limite = 10, busca, status, metodoPagamento, dataInicio, dataFim } = req.query;

    // Obter conexão do pool de pagamentos com timeout
    const pagamentosClient = await Promise.race([
      pagamentosPool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao conectar com o banco de pagamentos')), 5000)
      )
    ]) as any;

    // Obter conexão do pool de orders com timeout
    const ordersClient = await Promise.race([
      ordersPool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao conectar com o banco de orders')), 5000)
      )
    ]) as any;

    try {
      // Construir a query base para transações
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

      // Executar query de transações com timeout
      const result = await Promise.race([
        pagamentosClient.query(query, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao executar query de transações')), 10000)
        )
      ]);

      // Contar total de registros
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
      const countResult = await pagamentosClient.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);

      // Buscar informações dos pedidos para cada transação
      const transacoesComPedidos = await Promise.all(
        result.rows.map(async (transacao) => {
          try {
            // Buscar pedido pelo external_id ou reference
            const orderQuery = `
              SELECT id, metadata, status, amount, created_at
              FROM "Order"
              WHERE metadata->>'external_payment_id' = $1
                 OR metadata->>'external_transaction_id' = $1
              LIMIT 1
            `;
            
            const orderResult = await ordersClient.query(orderQuery, [transacao.external_id || transacao.reference]);
            const order = orderResult.rows[0];

            return {
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
              produto: order ? {
                nome: order.metadata?.service_name || 'Serviço não especificado',
                descricao: order.metadata?.service_description || '',
                orderId: order.id,
                orderStatus: order.status,
                orderAmount: order.amount,
                orderCreatedAt: order.created_at
              } : {
                nome: 'Serviço não encontrado',
                descricao: ''
              },
              pixCode: transacao.pix_code,
              pixQrCode: transacao.pix_qr_code
            };
          } catch (error) {
            console.error(`[API:TransacoesDiretoV2] Erro ao buscar pedido para transação ${transacao.id}:`, error);
            return {
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
                nome: 'Erro ao buscar serviço',
                descricao: ''
              },
              pixCode: transacao.pix_code,
              pixQrCode: transacao.pix_qr_code
            };
          }
        })
      );

      return res.status(200).json({
        transacoes: transacoesComPedidos,
        total,
        totalPaginas: Math.ceil(total / Number(limite)),
        paginaAtual: Number(pagina)
      });

    } finally {
      pagamentosClient.release();
      ordersClient.release();
    }

  } catch (error) {
    console.error('[API:TransacoesDiretoV2] Erro:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar transações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
