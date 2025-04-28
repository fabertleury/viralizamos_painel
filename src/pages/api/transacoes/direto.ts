import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';

// Conexão direta com o banco de dados - sempre inicializar em produção
const pagamentosPool = isServerSide
  ? new Pool({
      connectionString: process.env.PAGAMENTOS_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Garantir que estamos usando dados reais em produção
  console.log('[API:TransacoesDireto] Ambiente:', process.env.NODE_ENV);
  console.log('[API:TransacoesDireto] Fase:', process.env.NEXT_PHASE || 'runtime');
  
  // Mesmo durante o build, não usamos dados simulados em produção
  if (process.env.NEXT_PHASE === 'phase-production-build' && process.env.NODE_ENV !== 'production') {
    console.log('[API:TransacoesDireto] Fase de build detectada, mas não estamos em produção');
    return res.status(200).json({
      mensagem: 'Dados reais serão carregados em tempo de execução',
      ambiente: process.env.NODE_ENV,
      fase: process.env.NEXT_PHASE
    });
  }

  try {
    console.log('[API:TransacoesDireto] Iniciando depuração do banco de dados');
    
    if (!pagamentosPool) {
      throw new Error('Pool de conexão não inicializado');
    }

    console.log(`[API:TransacoesDireto] URL DB: ${process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20)}...`);
    
    // Testar conexão com o banco
    const client = await pagamentosPool.connect();
    
    // Verificar conexão sem acessar propriedades problemáticas
    const testQuery = await client.query('SELECT current_database() as db, current_setting(\'server_version\') as version');
    const dbInfo = testQuery.rows[0];
    console.log(`[API:TransacoesDireto] Conexão estabelecida: ${dbInfo.db} (PostgreSQL ${dbInfo.version})`);
    
    client.release();
    
    // Verificar as tabelas existentes
    const tablesQuery = await pagamentosPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesQuery.rows.map(row => row.table_name);
    
    // Obter parâmetros de filtro e paginação
    const { 
      status, 
      metodo, 
      termoBusca, 
      pagina = '1', 
      limite = '50' 
    } = req.query;
    
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
      FROM "transaction" t
      LEFT JOIN "payment_request" pr ON t.payment_request_id = pr.id
      ${whereClause}
    `;
    
    const countResult = await pagamentosPool.query(countQuery, queryParams);
    const totalTransacoes = parseInt(countResult.rows[0].total);
    
    // Consulta principal para buscar as transações com paginação
    const transacoesQuery = await pagamentosPool.query(`
      SELECT t.id, t.external_id, t.amount, t.status, t.method, t.created_at,
             pr.customer_name, pr.customer_email, pr.service_name
      FROM "transaction" t
      LEFT JOIN "payment_request" pr ON t.payment_request_id = pr.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${limiteNum} OFFSET ${offset}
    `, queryParams);
    
    // Mapear as transações para o formato esperado pelo frontend
    const transacoes = transacoesQuery.rows.map(t => ({
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
    
    console.log(`[API:TransacoesDireto] Retornando ${transacoes.length} de ${totalTransacoes} transações`);
    res.status(200).json(response);
  } catch (error) {
    console.error('[API:TransacoesDireto] Erro ao conectar com banco:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null,
      pagamentos_url: process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...'
    });
  }
} 