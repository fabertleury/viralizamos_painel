import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';

// Conexão direta com o banco de dados para depuração
const pagamentosPool = isServerSide && process.env.NEXT_PHASE !== 'phase-production-build' 
  ? new Pool({
      connectionString: process.env.PAGAMENTOS_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verifica se está em fase de build e retorna dados simulados
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return res.status(200).json({
      conexao: true,
      tables: ['transaction', 'payment_request'],
      db_url: 'simulado-durante-build',
      total_transactions: 0,
      schema: { transaction_columns: [] },
      transacoes: []
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
    
    // Buscar as 10 transações mais recentes diretamente
    const transacoesQuery = await pagamentosPool.query(`
      SELECT t.id, t.external_id, t.amount, t.status, t.method, t.created_at,
             pr.customer_name, pr.customer_email, pr.service_name
      FROM "transaction" t
      LEFT JOIN "payment_request" pr ON t.payment_request_id = pr.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    const debug = {
      conexao: true,
      tables,
      db_url: process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...',
      total_transactions: transacoesQuery.rows.length,
      schema: {
        transaction_columns: Object.keys(transacoesQuery.rows[0] || {}),
      },
      transacoes: transacoesQuery.rows.map(t => ({
        id: t.id,
        data_criacao: t.created_at,
        valor: t.amount,
        status: t.status,
        metodo_pagamento: t.method,
        cliente_nome: t.customer_name || 'N/A',
        cliente_email: t.customer_email || 'N/A',
        produto_nome: t.service_name || 'N/A',
        order_id: t.external_id || 'N/A'
      }))
    };
    
    res.status(200).json(debug);
  } catch (error) {
    console.error('[API:TransacoesDireto] Erro ao conectar com banco:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null,
      pagamentos_url: process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 20) + '...'
    });
  }
} 