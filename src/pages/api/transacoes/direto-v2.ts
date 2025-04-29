import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão direta com o banco de dados de pagamentos usando a abordagem que funcionou no script de teste
const pagamentosPool = new Pool({
  // Usar a string de conexão diretamente ou a variável de ambiente
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false }, // Simplificado para sempre aceitar certificados auto-assinados
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
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
    console.log('[API:TransacoesDiretoV2] Iniciando busca de transações diretamente do banco');
    
    // Simplificado: não precisamos verificar se o pool foi inicializado porque 
    // estamos usando a abordagem que funcionou no script de teste
    
    // Testar conexão com o banco - abordagem simplificada como no script de teste
    console.log('[API:TransacoesDiretoV2] Obtendo conexão do pool');
    const client = await pagamentosPool.connect();
    
    try {
      // Verificar conexão de forma simplificada
      const testQuery = await client.query('SELECT current_database() as db');
      console.log(`[API:TransacoesDiretoV2] Conexão estabelecida com o banco: ${testQuery.rows[0].db}`);
      
      // Verificar se a tabela transactions existe - simplificado
      const tableCheckQuery = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'transactions'
        ) as exists
      `);
      
      if (!tableCheckQuery.rows[0].exists) {
        console.error('[API:TransacoesDiretoV2] Tabela transactions não encontrada!');
        return res.status(500).json({ 
          error: 'Tabela transactions não encontrada',
          timestamp: new Date().toISOString()
        });
      }
      
      // Obter parâmetros de filtro e paginação
      const { 
        status, 
        metodo, 
        termoBusca, 
        pagina = '1', 
        limite = '50' 
      } = req.query;
      
      console.log('[API:TransacoesDiretoV2] Parâmetros de busca:', { status, metodo, termoBusca, pagina, limite });
      
      // Construir a consulta com filtros dinâmicos
      let queryParams: any[] = [];
      let whereConditions: string[] = [];
      
      // Filtro por status
      if (status && status !== 'todos') {
        whereConditions.push(`t.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }
      
      // Filtro por método de pagamento
      if (metodo && metodo !== 'todos') {
        whereConditions.push(`t.method = $${queryParams.length + 1}`);
        queryParams.push(metodo);
      }
      
      // Busca por termo (ID, external_id, ou status)
      if (termoBusca) {
        whereConditions.push(`(
          t.id::text ILIKE $${queryParams.length + 1} OR
          t.external_id ILIKE $${queryParams.length + 2} OR
          t.status ILIKE $${queryParams.length + 3}
        )`);
        const searchTerm = `%${termoBusca}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Construir a cláusula WHERE
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Calcular offset para paginação
      const paginaNum = parseInt(pagina as string) || 1;
      const limiteNum = parseInt(limite as string) || 50;
      const offset = (paginaNum - 1) * limiteNum;
      
      // Consulta para contar o total de transações com os filtros aplicados
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "transactions" t
        LEFT JOIN "payment_requests" pr ON t.payment_request_id = pr.id
        ${whereClause}
      `;
      
      console.log('[API:TransacoesDiretoV2] Consulta de contagem:', countQuery, queryParams);
      
      const countResult = await client.query(countQuery, queryParams);
      const totalTransacoes = parseInt(countResult.rows[0].total);
      
      console.log(`[API:TransacoesDiretoV2] Total de transações encontradas: ${totalTransacoes}`);
      
      // Consulta principal para buscar as transações com paginação
      const transacoesQuery = `
        SELECT 
          t.id, 
          t.external_id, 
          t.amount, 
          t.status, 
          t.method, 
          t.created_at,
          pr.customer_name, 
          pr.customer_email, 
          pr.service_name
        FROM "transactions" t
        LEFT JOIN "payment_requests" pr ON t.payment_request_id = pr.id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT ${limiteNum} OFFSET ${offset}
      `;
      
      console.log('[API:TransacoesDiretoV2] Consulta de transações:', transacoesQuery, queryParams);
      
      const transacoesResult = await client.query(transacoesQuery, queryParams);
      
      console.log(`[API:TransacoesDiretoV2] Transações recuperadas: ${transacoesResult.rows.length}`);
      
      // Mapear as transações para o formato esperado pelo frontend
      const transacoes = transacoesResult.rows.map(t => ({
        id: t.id,
        data_criacao: t.created_at,
        valor: t.amount,
        status: t.status,
        metodo_pagamento: t.method,
        cliente_nome: t.customer_name || '',
        cliente_email: t.customer_email || '',
        produto_nome: t.service_name || '',
        order_id: t.external_id || ''
      }));
      
      // Resposta com dados reais e informações de paginação
      const response = {
        transacoes,
        total: totalTransacoes,
        pagina: paginaNum,
        limite: limiteNum,
        total_paginas: Math.ceil(totalTransacoes / limiteNum),
        // Informações adicionais para debug
        debug: {
          conexao: true,
          db_url: process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...',
          ambiente: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log(`[API:TransacoesDiretoV2] Retornando ${transacoes.length} de ${totalTransacoes} transações`);
      return res.status(200).json(response);
    } catch (queryError) {
      console.error('[API:TransacoesDiretoV2] Erro ao executar consultas:', queryError);
      return res.status(500).json({ 
        error: 'Erro ao executar consultas no banco de dados',
        message: queryError instanceof Error ? queryError.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    } finally {
      // Sempre liberar o cliente de volta para o pool
      client.release();
      console.log('[API:TransacoesDiretoV2] Cliente liberado de volta para o pool');
    }
  } catch (error) {
    console.error('[API:TransacoesDiretoV2] Erro geral:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao buscar transações',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}
