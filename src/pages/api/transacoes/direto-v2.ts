import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão direta com o banco de dados de pagamentos
// Inicialização fora do handler para manter a conexão entre requisições
let pagamentosPool: Pool | null = null;

try {
  console.log('[API:TransacoesDiretoV2:Init] Inicializando pool de conexão com o banco de dados de pagamentos');
  console.log('[API:TransacoesDiretoV2:Init] URL:', process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...');
  
  pagamentosPool = new Pool({
    connectionString: process.env.PAGAMENTOS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10, // reduzido o número máximo de conexões para evitar sobrecarga
    idleTimeoutMillis: 10000, // reduzido o tempo de inatividade
    connectionTimeoutMillis: 5000, // reduzido o timeout de conexão
    keepAlive: true, // manter conexões vivas
    keepAliveInitialDelayMillis: 10000 // delay inicial para o keepalive
  });
  
  // Verificar conexão inicial
  pagamentosPool.on('error', (err) => {
    console.error('[API:TransacoesDiretoV2:Pool] Erro no pool de conexão:', err.message);
  });
  
  console.log('[API:TransacoesDiretoV2:Init] Pool de conexão inicializado com sucesso');
} catch (error) {
  console.error('[API:TransacoesDiretoV2:Init] Erro ao inicializar pool de conexão:', error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    console.log('[API:TransacoesDiretoV2] Iniciando busca de transações diretamente do banco');
    
    // Verificar se o pool de conexão foi inicializado
    if (!pagamentosPool) {
      console.error('[API:TransacoesDiretoV2] Pool de conexão não inicializado, tentando reinicializar');
      
      try {
        pagamentosPool = new Pool({
          connectionString: process.env.PAGAMENTOS_DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          max: 10,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000
        });
        console.log('[API:TransacoesDiretoV2] Pool de conexão reinicializado com sucesso');
      } catch (poolError) {
        console.error('[API:TransacoesDiretoV2] Falha ao reinicializar pool:', poolError);
        return res.status(500).json({ 
          error: 'Erro de conexão com o banco de dados',
          message: poolError instanceof Error ? poolError.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Testar conexão com o banco
    console.log('[API:TransacoesDiretoV2] Testando conexão com o banco de dados');
    const client = await pagamentosPool.connect();
    
    try {
      // Verificar conexão
      const testQuery = await client.query('SELECT current_database() as db, current_setting(\'server_version\') as version');
      const dbInfo = testQuery.rows[0];
      console.log(`[API:TransacoesDiretoV2] Conexão estabelecida: ${dbInfo.db} (PostgreSQL ${dbInfo.version})`);
      
      // Verificar as tabelas existentes
      const tablesQuery = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tables = tablesQuery.rows.map(row => row.table_name);
      console.log('[API:TransacoesDiretoV2] Tabelas disponíveis:', tables);
      
      // Verificar se a tabela transactions existe
      if (!tables.includes('transactions')) {
        console.error('[API:TransacoesDiretoV2] Tabela transactions não encontrada!');
        return res.status(500).json({ 
          error: 'Tabela transactions não encontrada',
          tabelas_disponiveis: tables,
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
      
      // Busca por termo (ID, nome do cliente, email ou serviço)
      if (termoBusca) {
        whereConditions.push(`(
          t.id::text ILIKE $${queryParams.length + 1} OR
          pr.customer_name ILIKE $${queryParams.length + 2} OR
          pr.customer_email ILIKE $${queryParams.length + 3} OR
          pr.service_name ILIKE $${queryParams.length + 4}
        )`);
        const searchTerm = `%${termoBusca}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
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
        LEFT JOIN "payment_request" pr ON t.payment_request_id = pr.id
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
        LEFT JOIN "payment_request" pr ON t.payment_request_id = pr.id
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
          timestamp: new Date().toISOString(),
          tabelas: tables
        }
      };
      
      console.log(`[API:TransacoesDiretoV2] Retornando ${transacoes.length} de ${totalTransacoes} transações`);
      return res.status(200).json(response);
    } catch (queryError) {
      console.error('[API:TransacoesDiretoV2] Erro ao executar consultas:', queryError);
      return res.status(500).json({ 
        error: 'Erro ao executar consultas no banco de dados',
        message: queryError instanceof Error ? queryError.message : 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' && queryError instanceof Error ? queryError.stack : null,
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
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : null,
      pagamentos_url: process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
  }
}
