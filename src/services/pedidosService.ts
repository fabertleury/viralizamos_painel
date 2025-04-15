import { Pool } from 'pg';

// Conexão com o banco de dados de orders
export const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Verificar conexão com o banco de dados
ordersPool.on('error', (err) => {
  console.error('Erro inesperado na conexão com o pool PostgreSQL:', err);
});

// Função para testar conexão com o banco
export async function testarConexaoDB() {
  let client;
  try {
    client = await ordersPool.connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Interface para pedidos
export interface Pedido {
  id: string;
  data_criacao: Date;
  provedor_id: string;
  provedor_nome: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor: number;
  status: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  transacao_id?: string;
  provider_order_id?: string;
  api_response?: any;
  error_message?: string;
  last_check?: Date;
}

// Função para buscar pedidos com filtros
export async function buscarPedidos(
  filtros: {
    status?: string;
    provedor?: string;
    dataInicio?: string;
    dataFim?: string;
    termoBusca?: string;
  } = {},
  pagina = 1,
  limite = 10
): Promise<{ pedidos: Pedido[]; total: number }> {
  try {
    // Verificar se a conexão está OK antes de executar
    console.log(`Iniciando busca de pedidos. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
    console.log(`URL do banco de dados: ${process.env.ORDERS_DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
    
    const offset = (pagina - 1) * limite;
    
    let query = `
      SELECT 
        o.id, 
        o.created_at as data_criacao, 
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        s.name as produto_nome,
        o.quantity as quantidade,
        o.price as valor,
        o.status,
        o.user_id as cliente_id,
        u.name as cliente_nome,
        u.email as cliente_email,
        o.transaction_id as transacao_id,
        o.provider_order_id,
        o.api_response,
        o.error_message,
        o.last_check
      FROM 
        orders o
      LEFT JOIN 
        providers p ON o.provider_id = p.id
      LEFT JOIN 
        services s ON o.service_id = s.id
      LEFT JOIN 
        users u ON o.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramCount = 1;

    // Aplicar filtros se existirem
    if (filtros.status && filtros.status !== 'todos') {
      query += ` AND o.status = $${paramCount++}`;
      queryParams.push(filtros.status);
    }
    
    if (filtros.provedor && filtros.provedor !== 'todos') {
      query += ` AND o.provider_id = $${paramCount++}`;
      queryParams.push(filtros.provedor);
    }
    
    if (filtros.dataInicio) {
      query += ` AND o.created_at >= $${paramCount++}`;
      queryParams.push(filtros.dataInicio);
    }
    
    if (filtros.dataFim) {
      query += ` AND o.created_at <= $${paramCount++}`;
      queryParams.push(filtros.dataFim);
    }
    
    if (filtros.termoBusca) {
      query += ` AND (
        o.id::text ILIKE $${paramCount} OR 
        u.name ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR
        s.name ILIKE $${paramCount} OR
        o.provider_order_id ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filtros.termoBusca}%`);
      paramCount++;
    }
    
    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await ordersPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limite);
    queryParams.push(offset);
    
    const result = await ordersPool.query(query, queryParams);
    
    return {
      pedidos: result.rows,
      total
    };
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error(`Mensagem de erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw new Error('Erro ao buscar pedidos do banco de dados');
  }
}

// Função para buscar um pedido específico
export async function buscarPedidoPorId(id: string): Promise<Pedido | null> {
  try {
    const query = `
      SELECT 
        o.id, 
        o.created_at as data_criacao, 
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        s.name as produto_nome,
        o.quantity as quantidade,
        o.price as valor,
        o.status,
        o.user_id as cliente_id,
        u.name as cliente_nome,
        u.email as cliente_email,
        o.transaction_id as transacao_id,
        o.provider_order_id,
        o.api_response,
        o.error_message,
        o.last_check
      FROM 
        orders o
      LEFT JOIN 
        providers p ON o.provider_id = p.id
      LEFT JOIN 
        services s ON o.service_id = s.id
      LEFT JOIN 
        users u ON o.user_id = u.id
      WHERE 
        o.id = $1
    `;
    
    const result = await ordersPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao buscar pedido ${id}:`, error);
    throw new Error(`Erro ao buscar pedido ${id}`);
  }
}

// Função para reenviar um pedido
export async function reenviarPedido(id: string): Promise<boolean> {
  try {
    // Atualizando o status do pedido para "processando" e marcando para reprocessamento
    const query = `
      UPDATE orders
      SET 
        status = 'processando',
        retry_count = 0,
        last_check = NULL,
        error_message = NULL,
        updated_at = NOW()
      WHERE 
        id = $1 AND 
        (status = 'falha' OR status = 'pendente')
      RETURNING id
    `;
    
    const result = await ordersPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Notificar o serviço de orders via API para reprocessar
    // Isso normalmente seria feito por uma chamada HTTP para a API de orders
    // Mas para simplificar, aqui estamos apenas marcando para reprocessamento no banco
    
    console.log(`Pedido ${id} marcado para reprocessamento`);
    return true;
  } catch (error) {
    console.error(`Erro ao reenviar pedido ${id}:`, error);
    throw new Error(`Erro ao reenviar pedido ${id}`);
  }
}

// Função para obter estatísticas de pedidos
export async function obterEstatisticasPedidos(): Promise<any> {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(CASE WHEN status = 'completo' THEN 1 ELSE 0 END) as total_completos,
        SUM(CASE WHEN status = 'processando' THEN 1 ELSE 0 END) as total_processando,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'falha' THEN 1 ELSE 0 END) as total_falhas,
        SUM(price) as valor_total
      FROM 
        orders
      WHERE 
        created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await ordersPool.query(query);
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    throw new Error('Erro ao obter estatísticas de pedidos');
  }
}

// Função para obter pedidos por período (para gráficos)
export async function obterPedidosPorPeriodo(dias: number = 7): Promise<any[]> {
  try {
    const query = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completo' THEN 1 ELSE 0 END) as completos,
        SUM(CASE WHEN status = 'falha' THEN 1 ELSE 0 END) as falhas,
        SUM(price) as valor_total
      FROM 
        orders
      WHERE 
        created_at >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    const result = await ordersPool.query(query);
    
    return result.rows;
  } catch (error) {
    console.error(`Erro ao obter pedidos por período (${dias} dias):`, error);
    throw new Error(`Erro ao obter pedidos por período`);
  }
}

// Função para obter os principais provedores
export async function obterProvedores(): Promise<any[]> {
  try {
    console.log('Iniciando busca de provedores.');
    console.log(`URL do banco de dados: ${process.env.ORDERS_DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
    
    const query = `
      SELECT 
        id, 
        name as nome,
        api_url,
        status,
        created_at as data_criacao
      FROM 
        providers
      WHERE 
        status = 'active'
      ORDER BY 
        name
    `;
    
    const result = await ordersPool.query(query);
    console.log(`Provedores encontrados: ${result.rows.length}`);
    
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter provedores:', error);
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error(`Mensagem de erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    throw new Error('Erro ao obter provedores');
  }
} 