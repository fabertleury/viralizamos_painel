import { Pool } from 'pg';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';

// Conexão com o banco de dados de orders
export const ordersPool = isServerSide && process.env.NEXT_PHASE !== 'phase-production-build' 
  ? new Pool({
      connectionString: process.env.ORDERS_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

// Verificar conexão com o banco de dados
if (ordersPool) {
  ordersPool.on('error', (err) => {
    console.error('Erro inesperado na conexão com o pool PostgreSQL:', err);
  });
}

// Função para testar conexão com o banco
export async function testarConexaoDB() {
  // Se não estiver no servidor ou em modo de build, retorna true
  if (!isServerSide || process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando verificação de conexão durante build ou no cliente');
    return true;
  }

  if (!ordersPool) {
    console.error('Pool de conexão não foi inicializado');
    return false;
  }

  let client;
  try {
    client = await ordersPool.connect();
    
    // Fazer uma query simples de teste
    await client.query('SELECT 1 AS test');
    
    // Verificar tabelas disponíveis
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tabelas disponíveis:', tablesQuery.rows.map(r => r.table_name).join(', '));
    
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
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando busca de pedidos durante o build');
    return { pedidos: [], total: 0 };
  }

  try {
    // Verificar se a conexão está OK antes de executar
    console.log(`Iniciando busca de pedidos. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
    
    if (!ordersPool) {
      throw new Error('Pool de conexão não inicializado');
    }
    
    const offset = (pagina - 1) * limite;
    
    // Consulta corrigida para a tabela "Order" do Prisma
    let query = `
      SELECT 
        o.id, 
        o.created_at as data_criacao,
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        COALESCE(o.service_name, p.name || ' ' || o.service_type, 'Serviço não especificado') as produto_nome,
        o.quantity as quantidade,
        o.amount as valor,
        o.status,
        o.user_id as cliente_id,
        o.customer_name as cliente_nome,
        o.customer_email as cliente_email,
        o.transaction_id as transacao_id,
        o.external_order_id as provider_order_id
      FROM 
        "Order" o
      LEFT JOIN 
        "Provider" p ON o.provider_id = p.id
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
        o.customer_name ILIKE $${paramCount} OR 
        o.customer_email ILIKE $${paramCount} OR
        o.target_username ILIKE $${paramCount} OR
        o.external_order_id ILIKE $${paramCount}
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
    
    console.log('Executando query final');
    
    const result = await ordersPool.query(query, queryParams);
    console.log(`Encontrados ${result.rows.length} pedidos`);
    
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
  if (!ordersPool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
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
  if (!ordersPool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
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
  if (!ordersPool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
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
  if (!ordersPool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
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
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando busca de provedores durante o build');
    return [];
  }

  try {
    console.log('Iniciando busca de provedores.');
    
    if (!ordersPool) {
      throw new Error('Pool de conexão não inicializado');
    }
    
    const query = `
      SELECT 
        id, 
        name as nome,
        api_url,
        status,
        created_at as data_criacao
      FROM 
        "Provider"
      WHERE 
        status = true
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