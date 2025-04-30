import { Pool } from 'pg';

// Conexão com o banco de dados Analytics
export const analyticsPool = new Pool({
  connectionString: process.env.ANALYTICS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Aumenta o tempo limite de conexão para 10 segundos
  connectionTimeoutMillis: 10000,
  // Aumenta o tempo limite de inatividade para 30 segundos
  idleTimeoutMillis: 30000,
  // Mantém no máximo 10 conexões no pool
  max: 10
});

// Log de inicialização
console.log('Pool de conexão Analytics inicializado:', !!analyticsPool);

// Interfaces para os dados
export interface Usuario {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  total_orders?: number;
  total_spent?: number;
}

export interface Pedido {
  order_id: string;
  user_id: string;
  transaction_id: string;
  status: string;
  total_amount: number;
  service_id: string;
  quantity: number;
  customer_name: string;
  customer_email: string;
  target_url: string;
  target_username: string;
  provider_id: string;
  external_service_id: string;
  processed: boolean;
  created_at: Date;
  updated_at: Date;
  processed_at: Date;
  completed_at: Date;
}

export interface Transacao {
  transaction_id: string;
  order_id: string;
  payment_request_id: string;
  user_id: string;
  amount: number;
  status: string;
  method: string;
  provider: string;
  pix_code: string;
  pix_qrcode: string;
  created_at: Date;
  updated_at: Date;
  processed_at: Date;
}

export interface Metrica {
  id: number;
  metric_name: string;
  metric_type: string;
  metric_value: number;
  dimension_name: string;
  dimension_value: string;
  period_start: Date;
  period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DashboardData {
  totalVendas: number;
  totalPedidos: number;
  totalUsuarios: number;
  ticketMedio: number;
  vendasPorDia: Array<{
    dia: string;
    valor: number;
    pedidos: number;
  }>;
  pedidosPorStatus: Array<{
    status: string;
    quantidade: number;
    porcentagem: number;
  }>;
  transacoesPorMetodo: Array<{
    metodo: string;
    quantidade: number;
    porcentagem: number;
  }>;
  usuariosRecentes: Usuario[];
  pedidosRecentes: Pedido[];
  transacoesRecentes: Transacao[];
}

// Função para obter dados do dashboard
export async function obterDadosDashboard(): Promise<DashboardData> {
  try {
    // Obter métricas gerais
    const metricasResult = await analyticsPool.query(`
      SELECT metric_name, metric_value
      FROM analytics_metrics
      WHERE metric_name IN ('total_sales', 'total_orders', 'total_users', 'average_order_value')
    `);

    const metricas = metricasResult.rows.reduce((acc, row) => {
      acc[row.metric_name] = parseFloat(row.metric_value);
      return acc;
    }, {} as Record<string, number>);

    // Obter vendas por dia (últimos 30 dias)
    const vendasPorDiaResult = await analyticsPool.query(`
      SELECT 
        day::text as dia,
        total_sales as valor,
        order_count as pedidos
      FROM daily_sales
      WHERE day >= NOW() - INTERVAL '30 days'
      ORDER BY day
    `);

    // Obter pedidos por status
    const pedidosPorStatusResult = await analyticsPool.query(`
      SELECT 
        status,
        order_count as quantidade
      FROM orders_by_status
      ORDER BY order_count DESC
    `);

    const totalPedidos = pedidosPorStatusResult.rows.reduce((acc, row) => acc + parseInt(row.quantidade), 0);
    const pedidosPorStatus = pedidosPorStatusResult.rows.map(row => ({
      status: row.status,
      quantidade: parseInt(row.quantidade),
      porcentagem: totalPedidos > 0 ? (parseInt(row.quantidade) / totalPedidos) * 100 : 0
    }));

    // Obter transações por método
    const transacoesPorMetodoResult = await analyticsPool.query(`
      SELECT 
        method as metodo,
        transaction_count as quantidade
      FROM transactions_by_method
      ORDER BY transaction_count DESC
    `);

    const totalTransacoes = transacoesPorMetodoResult.rows.reduce((acc, row) => acc + parseInt(row.quantidade), 0);
    const transacoesPorMetodo = transacoesPorMetodoResult.rows.map(row => ({
      metodo: row.metodo,
      quantidade: parseInt(row.quantidade),
      porcentagem: totalTransacoes > 0 ? (parseInt(row.quantidade) / totalTransacoes) * 100 : 0
    }));

    // Obter usuários recentes
    const usuariosRecentesResult = await analyticsPool.query(`
      SELECT 
        u.user_id, 
        u.email, 
        u.name, 
        u.phone, 
        u.role, 
        u.created_at, 
        u.updated_at,
        ua.total_orders,
        ua.total_spent
      FROM analytics_users u
      LEFT JOIN user_analysis ua ON u.user_id = ua.user_id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    // Obter pedidos recentes
    const pedidosRecentesResult = await analyticsPool.query(`
      SELECT *
      FROM analytics_orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Obter transações recentes
    const transacoesRecentesResult = await analyticsPool.query(`
      SELECT *
      FROM analytics_transactions
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return {
      totalVendas: metricas.total_sales || 0,
      totalPedidos: metricas.total_orders || 0,
      totalUsuarios: metricas.total_users || 0,
      ticketMedio: metricas.average_order_value || 0,
      vendasPorDia: vendasPorDiaResult.rows,
      pedidosPorStatus,
      transacoesPorMetodo,
      usuariosRecentes: usuariosRecentesResult.rows,
      pedidosRecentes: pedidosRecentesResult.rows,
      transacoesRecentes: transacoesRecentesResult.rows
    };
  } catch (error) {
    console.error('Erro ao obter dados do dashboard:', error);
    throw error;
  }
}

// Função para obter usuários com paginação e filtros
export async function obterUsuarios(
  filtros: {
    termoBusca?: string;
    role?: string;
    dataInicio?: string;
    dataFim?: string;
  } = {},
  pagina = 1,
  limite = 10
): Promise<{ usuarios: Usuario[]; total: number }> {
  try {
    const offset = (pagina - 1) * limite;
    
    // Construir a query com filtros
    let query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.name, 
        u.phone, 
        u.role, 
        u.created_at, 
        u.updated_at,
        ua.total_orders,
        ua.total_spent
      FROM analytics_users u
      LEFT JOIN user_analysis ua ON u.user_id = ua.user_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Adicionar filtros
    if (filtros.termoBusca) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${filtros.termoBusca}%`);
      paramIndex++;
    }
    
    if (filtros.role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(filtros.role);
      paramIndex++;
    }
    
    if (filtros.dataInicio) {
      query += ` AND u.created_at >= $${paramIndex}`;
      params.push(filtros.dataInicio);
      paramIndex++;
    }
    
    if (filtros.dataFim) {
      query += ` AND u.created_at <= $${paramIndex}`;
      params.push(filtros.dataFim);
      paramIndex++;
    }
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limite, offset);
    
    // Executar a query
    const result = await analyticsPool.query(query, params);
    
    // Obter o total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM analytics_users u
      WHERE 1=1
    `;
    
    // Remover os últimos 2 parâmetros (limite e offset)
    const countParams = params.slice(0, -2);
    const countResult = await analyticsPool.query(countQuery, countParams);
    
    return {
      usuarios: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    throw error;
  }
}

// Função para obter pedidos com paginação e filtros
export async function obterPedidos(
  filtros: {
    status?: string;
    userId?: string;
    dataInicio?: string;
    dataFim?: string;
    termoBusca?: string;
  } = {},
  pagina = 1,
  limite = 10
): Promise<{ pedidos: Pedido[]; total: number }> {
  try {
    const offset = (pagina - 1) * limite;
    
    // Construir a query com filtros
    let query = `
      SELECT *
      FROM analytics_orders
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Adicionar filtros
    if (filtros.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filtros.status);
      paramIndex++;
    }
    
    if (filtros.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filtros.userId);
      paramIndex++;
    }
    
    if (filtros.dataInicio) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filtros.dataInicio);
      paramIndex++;
    }
    
    if (filtros.dataFim) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filtros.dataFim);
      paramIndex++;
    }
    
    if (filtros.termoBusca) {
      query += ` AND (customer_name ILIKE $${paramIndex} OR customer_email ILIKE $${paramIndex} OR order_id ILIKE $${paramIndex})`;
      params.push(`%${filtros.termoBusca}%`);
      paramIndex++;
    }
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limite, offset);
    
    // Executar a query
    const result = await analyticsPool.query(query, params);
    
    // Obter o total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM analytics_orders
      WHERE 1=1
    `;
    
    // Remover os últimos 2 parâmetros (limite e offset)
    const countParams = params.slice(0, -2);
    const countResult = await analyticsPool.query(countQuery, countParams);
    
    return {
      pedidos: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (error) {
    console.error('Erro ao obter pedidos:', error);
    throw error;
  }
}

// Função para obter transações com paginação e filtros
export async function obterTransacoes(
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
    
    // Construir a query com filtros
    let query = `
      SELECT t.*, u.name as cliente_nome, u.email as cliente_email
      FROM analytics_transactions t
      LEFT JOIN analytics_users u ON t.user_id = u.user_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Adicionar filtros
    if (filtros.status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(filtros.status);
      paramIndex++;
    }
    
    if (filtros.metodo) {
      query += ` AND t.method = $${paramIndex}`;
      params.push(filtros.metodo);
      paramIndex++;
    }
    
    if (filtros.dataInicio) {
      query += ` AND t.created_at >= $${paramIndex}`;
      params.push(filtros.dataInicio);
      paramIndex++;
    }
    
    if (filtros.dataFim) {
      query += ` AND t.created_at <= $${paramIndex}`;
      params.push(filtros.dataFim);
      paramIndex++;
    }
    
    if (filtros.termoBusca) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR t.transaction_id ILIKE $${paramIndex} OR t.order_id ILIKE $${paramIndex})`;
      params.push(`%${filtros.termoBusca}%`);
      paramIndex++;
    }
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limite, offset);
    
    // Executar a query
    const result = await analyticsPool.query(query, params);
    
    // Obter o total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM analytics_transactions t
      LEFT JOIN analytics_users u ON t.user_id = u.user_id
      WHERE 1=1
    `;
    
    // Remover os últimos 2 parâmetros (limite e offset)
    const countParams = params.slice(0, -2);
    const countResult = await analyticsPool.query(countQuery, countParams);
    
    return {
      transacoes: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  } catch (error) {
    console.error('Erro ao obter transações:', error);
    throw error;
  }
}

// Função para obter detalhes de um usuário específico
export async function obterUsuarioPorId(userId: string): Promise<Usuario | null> {
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.name, 
        u.phone, 
        u.role, 
        u.created_at, 
        u.updated_at,
        ua.total_orders,
        ua.total_spent,
        ua.average_order_value,
        ua.first_order_date,
        ua.last_order_date,
        ua.days_since_last_order
      FROM analytics_users u
      LEFT JOIN user_analysis ua ON u.user_id = ua.user_id
      WHERE u.user_id = $1
    `;
    
    const result = await analyticsPool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao obter usuário com ID ${userId}:`, error);
    throw error;
  }
}

// Função para obter detalhes de um pedido específico
export async function obterPedidoPorId(orderId: string): Promise<Pedido | null> {
  try {
    const query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM analytics_orders o
      LEFT JOIN analytics_users u ON o.user_id = u.user_id
      WHERE o.order_id = $1
    `;
    
    const result = await analyticsPool.query(query, [orderId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao obter pedido com ID ${orderId}:`, error);
    throw error;
  }
}

// Função para obter detalhes de uma transação específica
export async function obterTransacaoPorId(transactionId: string): Promise<Transacao | null> {
  try {
    const query = `
      SELECT t.*, u.name as user_name, u.email as user_email, o.status as order_status
      FROM analytics_transactions t
      LEFT JOIN analytics_users u ON t.user_id = u.user_id
      LEFT JOIN analytics_orders o ON t.order_id = o.order_id
      WHERE t.transaction_id = $1
    `;
    
    const result = await analyticsPool.query(query, [transactionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao obter transação com ID ${transactionId}:`, error);
    throw error;
  }
}

// Função para obter estatísticas de vendas por período
export async function obterEstatisticasVendas(
  periodo: 'diario' | 'semanal' | 'mensal' = 'diario',
  dataInicio?: string,
  dataFim?: string
): Promise<Array<{ periodo: string; vendas: number; pedidos: number }>> {
  try {
    let groupBy = '';
    let dateFormat = '';
    
    switch (periodo) {
      case 'diario':
        groupBy = 'day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'semanal':
        groupBy = 'week';
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'mensal':
        groupBy = 'month';
        dateFormat = 'YYYY-MM';
        break;
    }
    
    let query = `
      SELECT 
        TO_CHAR(day, '${dateFormat}') as periodo,
        SUM(total_sales) as vendas,
        SUM(order_count) as pedidos
      FROM daily_sales
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (dataInicio) {
      query += ` AND day >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }
    
    if (dataFim) {
      query += ` AND day <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }
    
    if (periodo !== 'diario') {
      query += ` GROUP BY TO_CHAR(day, '${dateFormat}')`;
    }
    
    query += ` ORDER BY periodo`;
    
    const result = await analyticsPool.query(query, params);
    
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter estatísticas de vendas:', error);
    throw error;
  }
}

// Exportar todas as funções
export default {
  obterDadosDashboard,
  obterUsuarios,
  obterPedidos,
  obterTransacoes,
  obterUsuarioPorId,
  obterPedidoPorId,
  obterTransacaoPorId,
  obterEstatisticasVendas
};
