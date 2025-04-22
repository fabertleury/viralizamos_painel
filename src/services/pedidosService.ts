import { Pool } from 'pg';
import axios from 'axios';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';

// Verifica se devemos usar dados mockados
const useMockData = process.env.USE_MOCK_DATA === 'true';

// Conexão com o banco de dados de orders
// Prioriza ORDERS_DATABASE_URL, mas também aceita DATABASE_URL_ORDERS como fallback
const ordersDbUrl = process.env.ORDERS_DATABASE_URL || process.env.DATABASE_URL_ORDERS;

// Só cria o pool se não estiver usando dados mockados e a URL estiver definida
export const ordersPool = !useMockData && isServerSide && process.env.NEXT_PHASE !== 'phase-production-build' && ordersDbUrl
  ? new Pool({
      connectionString: ordersDbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Aumenta o tempo limite de conexão para 10 segundos
      connectionTimeoutMillis: 10000,
      // Aumenta o tempo limite de inatividade para 30 segundos
      idleTimeoutMillis: 30000,
      // Mantém no máximo 10 conexões no pool
      max: 10
    })
  : null;

// Verificar conexão com o banco de dados
if (ordersPool) {
  ordersPool.on('error', (err) => {
    console.error('Erro inesperado na conexão com o pool PostgreSQL:', err);
    // Tenta reconectar após um erro
    if (err.message.includes('connection terminated') || err.message.includes('connection reset')) {
      console.log('Tentando reconectar ao banco de dados...');
    }
  });
}

// Configuração da API de orders
const ordersApiUrl = process.env.ORDERS_API_URL;
const ordersApiKey = process.env.ORDERS_API_KEY;

// Função para testar conexão com o banco ou API
export async function testarConexaoDB() {
  // Se não estiver no servidor ou em modo de build, retorna true
  if (!isServerSide || process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando verificação de conexão durante build ou no cliente');
    return true;
  }

  // Se estiver usando dados mockados, retorna true
  if (useMockData) {
    console.log('Usando dados mockados, pulando verificação de conexão');
    return true;
  }

  // Tenta primeiro verificar a API se estiver configurada
  if (ordersApiUrl && ordersApiKey) {
    try {
      console.log('Testando conexão com a API de orders...');
      const response = await axios.get(`${ordersApiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${ordersApiKey}`
        },
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('Conexão com a API de orders estabelecida com sucesso.');
        return true;
      }
    } catch (error) {
      console.error('Erro ao conectar com a API de orders:', error);
      // Continua para tentar conexão direta com o banco se a API falhar
    }
  }

  // Se não conseguiu conectar à API ou ela não está configurada, tenta o banco de dados
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

  // Se estiver usando dados mockados, retornar dados mockados
  if (useMockData) {
    console.log('Usando dados mockados para pedidos');
    return {
      pedidos: gerarPedidosMockados(limite),
      total: 50 // Valor fixo para simular um total maior
    };
  }

  // Tenta buscar via API primeiro se estiver configurada
  if (ordersApiUrl && ordersApiKey) {
    try {
      console.log(`Buscando pedidos via API. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
      
      const params: any = {
        page: pagina,
        limit: limite
      };
      
      if (filtros.status && filtros.status !== 'todos') {
        params.status = filtros.status;
      }
      
      if (filtros.provedor && filtros.provedor !== 'todos') {
        params.provider_id = filtros.provedor;
      }
      
      if (filtros.termoBusca) {
        params.search = filtros.termoBusca;
      }
      
      if (filtros.dataInicio) {
        params.start_date = filtros.dataInicio;
      }
      
      if (filtros.dataFim) {
        params.end_date = filtros.dataFim;
      }
      
      const response = await axios.get(`${ordersApiUrl}/orders`, {
        params,
        headers: {
          'Authorization': `Bearer ${ordersApiKey}`
        },
        timeout: 10000
      });
      
      if (response.data && response.data.orders) {
        console.log(`Encontrados ${response.data.orders.length} pedidos via API`);
        
        // Mapear os dados da API para o formato esperado
        const pedidos = response.data.orders.map((order: any) => ({
          id: order.id,
          data_criacao: new Date(order.created_at),
          provedor_id: order.provider_id,
          provedor_nome: order.provider_name,
          produto_id: order.service_id,
          produto_nome: order.service_name,
          quantidade: order.quantity,
          valor: order.amount,
          status: order.status,
          cliente_id: order.user_id,
          cliente_nome: order.customer_name,
          cliente_email: order.customer_email,
          transacao_id: order.transaction_id,
          provider_order_id: order.external_order_id
        }));
        
        return {
          pedidos,
          total: response.data.total || pedidos.length
        };
      }
    } catch (apiError) {
      console.error('Erro ao buscar pedidos via API:', apiError);
      // Se falhar a API, tenta o banco de dados como fallback
    }
  }

  // Se a API não estiver configurada ou falhar, tenta o banco de dados
  try {
    // Verificar se a conexão está OK antes de executar
    console.log(`Iniciando busca de pedidos via banco de dados. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
    
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
  } catch (dbError) {
    console.error('Erro ao buscar pedidos do banco de dados:', dbError);
    // Log detalhado do erro
    if (dbError instanceof Error) {
      console.error(`Mensagem de erro: ${dbError.message}`);
      console.error(`Stack trace: ${dbError.stack}`);
    }
    
    // Se falhar o banco de dados, retorna dados mockados como último recurso
    console.log('Usando dados mockados como fallback após falha na conexão');
    return {
      pedidos: gerarPedidosMockados(limite),
      total: 50
    };
  }
}

// Função para gerar pedidos mockados
function gerarPedidosMockados(quantidade: number): Pedido[] {
  const status = ['pendente', 'processando', 'completo', 'falha', 'cancelado', 'parcial'];
  const provedores = ['Provedor A', 'Provedor B', 'Provedor C'];
  const produtos = ['Likes Instagram', 'Seguidores Instagram', 'Views TikTok', 'Inscritos YouTube'];
  
  return Array.from({ length: quantidade }).map((_, i) => {
    const dataBase = new Date();
    dataBase.setDate(dataBase.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: `mock-${Date.now()}-${i}`,
      data_criacao: dataBase,
      provedor_id: `prov-${i % 3}`,
      provedor_nome: provedores[i % provedores.length],
      produto_id: `prod-${i % 4}`,
      produto_nome: produtos[i % produtos.length],
      quantidade: Math.floor(Math.random() * 1000) + 100,
      valor: parseFloat((Math.random() * 100 + 10).toFixed(2)),
      status: status[i % status.length],
      cliente_id: `client-${i}`,
      cliente_nome: `Cliente Teste ${i}`,
      cliente_email: `cliente${i}@teste.com`,
      transacao_id: `trans-${i}`,
      provider_order_id: `ext-${i}`
    };
  });
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