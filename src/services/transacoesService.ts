import { Pool } from 'pg';

// Conexão com o banco de dados de pagamentos
export const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Interface para transações
export interface Transacao {
  id: string;
  data_criacao: Date;
  valor: number;
  status: string;
  metodo_pagamento: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  produto_id: string;
  produto_nome: string;
  order_id?: string;
}

// Função para buscar todas as transações com filtros
export async function buscarTransacoes(
  filtros: {
    status?: string;
    metodo?: string;
    dataInicio?: string;
    dataFim?: string;
    termoBusca?: string;
  } = {},
  pagina = 1,
  limite = 10
): Promise<{ transacoes: Transacao[]; total: number }> {
  try {
    const offset = (pagina - 1) * limite;
    
    let query = `
      SELECT 
        t.id, 
        t.data_criacao, 
        t.valor, 
        t.status, 
        t.metodo_pagamento,
        t.cliente_id,
        u.nome AS cliente_nome,
        u.email AS cliente_email,
        t.produto_id,
        p.nome AS produto_nome,
        t.order_id
      FROM 
        transacoes t
      LEFT JOIN 
        usuarios u ON t.cliente_id = u.id
      LEFT JOIN 
        produtos p ON t.produto_id = p.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramCount = 1;

    // Aplicar filtros se existirem
    if (filtros.status && filtros.status !== 'todos') {
      query += ` AND t.status = $${paramCount++}`;
      queryParams.push(filtros.status);
    }
    
    if (filtros.metodo && filtros.metodo !== 'todos') {
      query += ` AND t.metodo_pagamento = $${paramCount++}`;
      queryParams.push(filtros.metodo);
    }
    
    if (filtros.dataInicio) {
      query += ` AND t.data_criacao >= $${paramCount++}`;
      queryParams.push(filtros.dataInicio);
    }
    
    if (filtros.dataFim) {
      query += ` AND t.data_criacao <= $${paramCount++}`;
      queryParams.push(filtros.dataFim);
    }
    
    if (filtros.termoBusca) {
      query += ` AND (
        t.id ILIKE $${paramCount} OR 
        u.nome ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR
        p.nome ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filtros.termoBusca}%`);
      paramCount++;
    }
    
    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pagamentosPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY t.data_criacao DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limite);
    queryParams.push(offset);
    
    const result = await pagamentosPool.query(query, queryParams);
    
    return {
      transacoes: result.rows,
      total
    };
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    throw new Error('Erro ao buscar transações do banco de dados');
  }
}

// Função para buscar uma transação específica
export async function buscarTransacaoPorId(id: string): Promise<Transacao | null> {
  try {
    const query = `
      SELECT 
        t.id, 
        t.data_criacao, 
        t.valor, 
        t.status, 
        t.metodo_pagamento,
        t.cliente_id,
        u.nome AS cliente_nome,
        u.email AS cliente_email,
        t.produto_id,
        p.nome AS produto_nome,
        t.order_id
      FROM 
        transacoes t
      LEFT JOIN 
        usuarios u ON t.cliente_id = u.id
      LEFT JOIN 
        produtos p ON t.produto_id = p.id
      WHERE 
        t.id = $1
    `;
    
    const result = await pagamentosPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao buscar transação ${id}:`, error);
    throw new Error(`Erro ao buscar transação ${id}`);
  }
}

// Função para obter estatísticas de transações
export async function obterEstatisticasTransacoes(): Promise<any> {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as total_aprovadas,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'recusado' THEN 1 ELSE 0 END) as total_recusadas,
        SUM(CASE WHEN status = 'aprovado' THEN valor ELSE 0 END) as valor_total_aprovado
      FROM 
        transacoes
      WHERE 
        data_criacao >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await pagamentosPool.query(query);
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao obter estatísticas de transações:', error);
    throw new Error('Erro ao obter estatísticas de transações');
  }
}

// Função para obter transações por período (para gráficos)
export async function obterTransacoesPorPeriodo(dias: number = 7): Promise<any[]> {
  try {
    const query = `
      SELECT 
        DATE(data_criacao) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aprovado' THEN valor ELSE 0 END) as valor_aprovado
      FROM 
        transacoes
      WHERE 
        data_criacao >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(data_criacao)
      ORDER BY 
        data
    `;
    
    const result = await pagamentosPool.query(query);
    
    return result.rows;
  } catch (error) {
    console.error(`Erro ao obter transações por período (${dias} dias):`, error);
    throw new Error(`Erro ao obter transações por período`);
  }
} 