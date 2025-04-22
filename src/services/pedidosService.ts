import { Pool } from 'pg';
import axios from 'axios';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';

// Nunca devemos usar dados mockados
const useMockData = false;

// Conexão com o banco de dados de orders
// Prioriza ORDERS_DATABASE_URL, mas também aceita DATABASE_URL_ORDERS como fallback
const ordersDbUrl = process.env.ORDERS_DATABASE_URL || process.env.DATABASE_URL_ORDERS;

// Log das variáveis de ambiente para depuração (sem exibir valores completos por segurança)
console.log('Variáveis de ambiente:');
console.log('- ORDERS_API_URL definido:', !!process.env.ORDERS_API_URL);
console.log('- ORDERS_API_KEY definido:', !!process.env.ORDERS_API_KEY);
console.log('- ORDERS_DATABASE_URL definido:', !!process.env.ORDERS_DATABASE_URL);
console.log('- DATABASE_URL_ORDERS definido:', !!process.env.DATABASE_URL_ORDERS);
console.log('- URL do banco que será usada:', ordersDbUrl ? `${ordersDbUrl.substring(0, 15)}...` : 'nenhuma');

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
  
console.log('Pool de conexão inicializado:', !!ordersPool);

// Função para obter pedidos recentes
export async function obterPedidosRecentes(limite: number = 5): Promise<Pedido[]> {
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando obtenção de pedidos recentes durante o build');
    return [];
  }

  try {
    // Tentar obter pedidos recentes via API
    if (ordersApiUrl && ordersApiKey) {
      try {
        const response = await axios.get(`${ordersApiUrl}/dashboard/recent-orders`, {
          params: { limit: limite },
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`
          },
          timeout: 5000
        });

        if (response.data && Array.isArray(response.data)) {
          console.log(`Obtidos ${response.data.length} pedidos recentes via API`);
          
          // Mapear os dados da API para o formato esperado
          return response.data.map((order: any) => ({
            id: order.id,
            data_criacao: new Date(order.created_at),
            provedor_id: order.provider_id,
            provedor_nome: order.provider?.name || 'Desconhecido',
            produto_id: order.service_id,
            produto_nome: order.service_name || `Serviço ${order.service_type || ''}`,
            quantidade: order.quantity,
            valor: order.amount,
            status: order.status,
            cliente_id: order.user_id,
            cliente_nome: order.customer_name || 'Cliente',
            cliente_email: order.customer_email || '',
            transacao_id: order.transaction_id,
            provider_order_id: order.external_order_id
          }));
        }
      } catch (error) {
        console.error('Erro ao obter pedidos recentes via API:', error);
        // Se falhar via API, tenta via banco de dados
      }
    }
    
    // Se não conseguiu via API, tenta via banco de dados
    const { success, pool } = await testarConexaoDB();
    if (!success || !pool) {
      throw new Error('Pool de conexão não inicializado');
    }
    
    const query = `
      SELECT 
        o.id, 
        o.created_at as data_criacao, 
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        o.service_type as produto_nome,
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
      ORDER BY 
        o.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limite]);
    console.log(`Obtidos ${result.rows.length} pedidos recentes via banco de dados`);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      data_criacao: new Date(row.data_criacao),
      provedor_id: row.provedor_id,
      provedor_nome: row.provedor_nome || 'Desconhecido',
      produto_id: row.produto_id,
      produto_nome: row.produto_nome || 'Serviço não especificado',
      quantidade: row.quantidade || 0,
      valor: row.valor || 0,
      status: row.status,
      cliente_id: row.cliente_id,
      cliente_nome: row.cliente_nome || 'Cliente',
      cliente_email: row.cliente_email || '',
      transacao_id: row.transacao_id,
      provider_order_id: row.provider_order_id
    }));
  } catch (error) {
    console.error('Erro ao obter pedidos recentes:', error);
    // Em caso de erro, retornar lista vazia
    return [];
  }
}

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
export async function testarConexaoDB(): Promise<{ success: boolean; pool: Pool | null }> {
  // Se não estiver no servidor ou em modo de build, retorna sucesso sem pool
  if (!isServerSide || process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando verificação de conexão durante build ou no cliente');
    return { success: true, pool: null };
  }

  // Tenta primeiro verificar a API se estiver configurada
  if (ordersApiUrl && ordersApiKey) {
    try {
      console.log('Testando conexão com a API de orders...');
      console.log(`URL da API: ${ordersApiUrl}`);
      // Verificando a saúde do serviço
      // Tentando acessar a raiz da API
      const response = await axios.get(`${ordersApiUrl}`, {
        headers: {
          'Authorization': `Bearer ${ordersApiKey}`
        },
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('Conexão com a API de orders estabelecida com sucesso.');
        return { success: true, pool: ordersPool };
      }
    } catch (error) {
      console.error('Erro ao conectar com a API de orders:', error);
      // Continua para tentar conexão direta com o banco se a API falhar
    }
  }

  // Se não conseguiu conectar à API ou ela não está configurada, tenta o banco de dados
  if (!ordersPool) {
    console.error('Pool de conexão não foi inicializado');
    return { success: false, pool: null };
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
    return { success: true, pool: ordersPool };
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return { success: false, pool: null };
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

// Função auxiliar para mapear pedidos para o formato esperado
function mapearPedidosParaFormato(pedidosData: any[], total: number): { pedidos: Pedido[]; total: number } {
  // Traduzir status conforme a convenção definida na memória
  const traduzirStatus = (status: string): string => {
    const statusMap: {[key: string]: string} = {
      'pending': 'pendente',
      'processing': 'processando',
      'in_progress': 'processando',
      'completed': 'concluido',
      'success': 'concluido',
      'failed': 'falhou',
      'rejected': 'falhou',
      'canceled': 'cancelado',
      'partial': 'parcial'
    };
    
    return statusMap[status.toLowerCase()] || status;
  };
  
  const pedidos = pedidosData.map((order: any) => ({
    id: order.id,
    data_criacao: new Date(order.created_at),
    provedor_id: order.provider_id,
    provedor_nome: order.provider?.name || order.provedor_nome || 'Desconhecido',
    produto_id: order.service_id,
    produto_nome: order.service_name || order.produto_nome || `Serviço ${order.service_type || ''}`,
    quantidade: order.quantity || order.quantidade || 0,
    valor: order.amount || order.valor || 0,
    status: traduzirStatus(order.status),
    cliente_id: order.user_id || order.cliente_id || '',
    cliente_nome: order.customer_name || order.cliente_nome || 'Cliente',
    cliente_email: order.customer_email || order.cliente_email || '',
    transacao_id: order.transaction_id || order.transacao_id || '',
    provider_order_id: order.external_order_id || order.provider_order_id || ''
  }));
  
  return {
    pedidos,
    total
  };
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

  // Não usar mais dados mockados, apenas dados reais
  if (useMockData) {
    console.log('Configuração USE_MOCK_DATA está ativa, mas não será usada para pedidos');
    // Continua a execução para buscar dados reais
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
      
      // Tentando acessar a API para buscar pedidos
      // Usamos o endpoint panel-orders que foi criado especificamente para o painel
      try {
        console.log('Tentando acessar o endpoint panel-orders para buscar pedidos...');
        console.log(`URL completa: ${ordersApiUrl}/admin/panel-orders`);
        console.log(`Parâmetros: ${JSON.stringify(params)}`);
        
        const response = await axios.get(`${ordersApiUrl}/admin/panel-orders`, {
          params,
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`
          },
          timeout: 10000
        });
        
        // Se a resposta for bem-sucedida, retornamos os dados
        if (response.data && response.data.orders) {
          console.log(`Encontrados ${response.data.orders.length} pedidos via API panel-orders`);
          console.log(`Total de itens: ${response.data.totalItems}, Página: ${response.data.page}, Total de páginas: ${response.data.totalPages}`);
          
          return mapearPedidosParaFormato(response.data.orders, response.data.totalItems);
        }
      } catch (apiError) {
        console.error('Erro ao acessar o endpoint panel-orders:', apiError);
        // Continua para tentar o banco de dados diretamente
      }
      
      // Se o endpoint panel-orders falhar, tentamos o endpoint dashboard/recent-orders como fallback
      try {
        console.log('Tentando acessar o endpoint dashboard/recent-orders como fallback...');
        const response = await axios.get(`${ordersApiUrl}/dashboard/recent-orders`, {
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`
          },
          timeout: 10000
        });
      
        if (response.data && Array.isArray(response.data)) {
          console.log(`Encontrados ${response.data.length} pedidos via API dashboard/recent-orders`);
          
          // Como este endpoint não suporta paginação, aplicamos os filtros manualmente
          let pedidosFiltrados = response.data;
          
          // Aplicar filtros manualmente se necessário
          if (filtros.status && filtros.status !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(order => order.status === filtros.status);
          }
          
          if (filtros.provedor && filtros.provedor !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(order => order.provider_id === filtros.provedor);
          }
          
          if (filtros.termoBusca) {
            const termoBusca = filtros.termoBusca.toLowerCase();
            pedidosFiltrados = pedidosFiltrados.filter(order => 
              (order.transaction_id && order.transaction_id.toLowerCase().includes(termoBusca)) ||
              (order.customer_email && order.customer_email.toLowerCase().includes(termoBusca)) ||
              (order.customer_name && order.customer_name.toLowerCase().includes(termoBusca))
            );
          }
          
          // Aplicar paginação manualmente
          const total = pedidosFiltrados.length;
          const inicio = (pagina - 1) * limite;
          const fim = Math.min(inicio + limite, total);
          pedidosFiltrados = pedidosFiltrados.slice(inicio, fim);
          
          return mapearPedidosParaFormato(pedidosFiltrados, total);
        }
      } catch (fallbackApiError) {
        console.error('Erro ao acessar o endpoint fallback:', fallbackApiError);
        // Continua para tentar o banco de dados diretamente
      }
    } catch (apiError) {
      console.error('Erro ao buscar pedidos via API:', apiError);
      // Se falhar a API, tenta o banco de dados como fallback
    }

    // Se chegou aqui, nenhuma das tentativas de API funcionou
    // Vamos tentar acessar o banco de dados diretamente como fallback
  }

  // Se a API não estiver configurada ou falhar, tenta o banco de dados
  try {
    // Verificar se a conexão está OK antes de executar
    console.log(`Iniciando busca de pedidos via banco de dados. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
    
    // Obter o pool de conexão através da função testarConexaoDB
    const { success, pool } = await testarConexaoDB();
    if (!success || !pool) {
      console.error('Pool de conexão não inicializado. Verificando variáveis de ambiente:');
      console.error('ORDERS_DATABASE_URL:', process.env.ORDERS_DATABASE_URL ? 'definido' : 'não definido');
      console.error('DATABASE_URL_ORDERS:', process.env.DATABASE_URL_ORDERS ? 'definido' : 'não definido');
      throw new Error('Pool de conexão não inicializado');
    }
    
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    const offset = (pagina - 1) * limite;
    
    // Consulta corrigida para a tabela "Order" do Prisma
    // Usando os nomes exatos das tabelas conforme definidos no banco de dados
    // Importante: No Supabase/Prisma, as tabelas são definidas no singular mas com inicial maiúscula
    let query = `
      SELECT
        o.id,
        o.created_at as data_criacao,
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        COALESCE(p.name, 'Serviço não especificado') as produto_nome,
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
        o.transaction_id ILIKE $${paramCount++} OR
        o.customer_email ILIKE $${paramCount++} OR
        o.customer_name ILIKE $${paramCount++}
      )`;
      const termoBuscaLike = `%${filtros.termoBusca}%`;
      queryParams.push(termoBuscaLike, termoBuscaLike, termoBuscaLike);
    }
    
    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    console.log('Executando query de contagem:', countQuery);
    console.log('Parâmetros:', queryParams);
    
    let total = 0;
    let result;
    
    try {
      const countResult = await pool.query(countQuery, queryParams);
      total = parseInt(countResult.rows[0].count);
      console.log(`Total de pedidos encontrados: ${total}`);
      
      // Adicionar ordenação e paginação
      query += ` ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      queryParams.push(limite);
      queryParams.push(offset);
      
      console.log('Executando query final:', query);
      console.log('Parâmetros finais:', queryParams);
      
      result = await pool.query(query, queryParams);
      console.log(`Resultado da query: ${result.rows.length} pedidos encontrados`);
      
      return {
        pedidos: result.rows,
        total
      };
    } catch (queryError) {
      console.error('Erro ao executar query SQL:', queryError);
      throw queryError;
    }
  } catch (dbError) {
    console.error('Erro ao buscar pedidos do banco de dados:', dbError);
    // Log detalhado do erro
    if (dbError instanceof Error) {
      console.error(`Mensagem de erro: ${dbError.message}`);
      console.error(`Stack trace: ${dbError.stack}`);
    }
    
    // Se falhar o banco de dados, retornar erro em vez de dados mockados
    console.error('Falha na conexão com o banco de dados e API');
    return {
      pedidos: [],
      total: 0
    };
  }
}

// Interface para detalhes completos de um pedido
export interface PedidoDetalhado extends Pedido {
  logs?: Array<{
    id: string;
    level: string;
    message: string;
    data?: any;
    created_at: Date;
  }>;
  cliente?: {
    id: string;
    nome: string;
    email: string;
  };
  metadata?: any;
  provider_response?: any;
  target_username?: string;
  target_url?: string;
}

// Função para buscar um pedido específico
export async function buscarPedidoPorId(id: string): Promise<PedidoDetalhado | null> {
  console.log(`Buscando detalhes do pedido ${id}...`);
  const ordersApiUrl = process.env.ORDERS_API_URL || 'https://orders.viralizamos.com/api';
  const ordersApiKey = process.env.ORDERS_API_KEY || 'vrlzms_api_3ac5b8def47921e6a8b459f45d3c7a2fedcb1284';

  try {
    // Tentando acessar a API para buscar detalhes do pedido
    console.log(`Tentando acessar o endpoint panel-orders/${id} para buscar detalhes do pedido...`);
    const response = await axios.get(`${ordersApiUrl}/admin/panel-orders/${id}`, {
      headers: {
        'Authorization': `Bearer ${ordersApiKey}`
      },
      timeout: 10000
    });

    // Se a resposta for bem-sucedida, retornamos os dados
    if (response.data && response.data.order) {
      console.log(`Detalhes do pedido ${id} obtidos com sucesso via API`);
      
      const pedido = response.data.order;
      
      // Mapear os dados para o formato esperado
      return {
        id: pedido.id,
        data_criacao: new Date(pedido.created_at),
        provedor_id: pedido.provider_id,
        provedor_nome: pedido.provider?.name || 'Provedor não especificado',
        produto_id: pedido.service_id,
        produto_nome: pedido.provider?.name || 'Serviço não especificado',
        quantidade: pedido.quantity,
        valor: pedido.amount,
        status: pedido.status,
        cliente_id: pedido.user_id,
        cliente_nome: pedido.customer_name,
        cliente_email: pedido.customer_email,
        transacao_id: pedido.transaction_id,
        provider_order_id: pedido.external_order_id,
        target_username: pedido.target_username,
        target_url: pedido.target_url,
        logs: pedido.logs?.map((log: any) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          data: log.data,
          created_at: new Date(log.created_at)
        })),
        cliente: pedido.user ? {
          id: pedido.user.id,
          nome: pedido.user.name || '',
          email: pedido.user.email
        } : undefined,
        metadata: pedido.metadata,
        provider_response: pedido.provider_response
      };
    }
  } catch (apiError) {
    console.error(`Erro ao buscar detalhes do pedido ${id} via API:`, apiError);
    // Se falhar via API, tenta via banco de dados
  }

  // Se não conseguiu via API, tenta via banco de dados
  try {
    console.log(`Tentando buscar detalhes do pedido ${id} via banco de dados...`);
    const { success, pool } = await testarConexaoDB();
    
    if (!success || !pool) {
      console.error('Falha na conexão com o banco de dados');
      return null;
    }
    
    // Consulta para buscar detalhes do pedido
    const query = `
      SELECT
        o.id,
        o.created_at as data_criacao,
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        COALESCE(p.name, 'Serviço não especificado') as produto_nome,
        o.quantity as quantidade,
        o.amount as valor,
        o.status,
        o.user_id as cliente_id,
        o.customer_name as cliente_nome,
        o.customer_email as cliente_email,
        o.transaction_id as transacao_id,
        o.external_order_id as provider_order_id,
        o.target_username,
        o.target_url,
        o.metadata,
        o.provider_response
      FROM
        "Order" o
      LEFT JOIN
        "Provider" p ON o.provider_id = p.id
      WHERE
        o.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      console.log(`Pedido ${id} não encontrado no banco de dados`);
      return null;
    }
    
    console.log(`Detalhes do pedido ${id} obtidos com sucesso via banco de dados`);
    
    const pedido = result.rows[0];
    
    // Buscar logs do pedido
    const logsQuery = `
      SELECT
        id,
        level,
        message,
        data,
        created_at
      FROM
        "OrderLog"
      WHERE
        order_id = $1
      ORDER BY
        created_at DESC
    `;
    
    const logsResult = await pool.query(logsQuery, [id]);
    
    return {
      ...pedido,
      logs: logsResult.rows.map((log: any) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        data: log.data,
        created_at: new Date(log.created_at)
      })),
      metadata: pedido.metadata || {},
      provider_response: pedido.provider_response || {}
    };
  } catch (dbError) {
    console.error(`Erro ao buscar detalhes do pedido ${id} via banco de dados:`, dbError);
    console.log('Mensagem de erro:', (dbError as Error).message);
    console.log('Stack trace:', (dbError as Error).stack);
    return null;
  }
}

// Função para reenviar um pedido
export async function reenviarPedido(id: string): Promise<boolean> {
  // Obter o pool de conexão através da função testarConexaoDB
  const { success, pool } = await testarConexaoDB();
  if (!success || !pool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
  try {
    // Atualizando o status do pedido para "processando" e marcando para reprocessamento
    const query = `
      UPDATE "Order"
      SET 
        status = 'processing',
        updated_at = NOW()
      WHERE 
        id = $1 AND 
        (status = 'failed' OR status = 'pending')
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
  // Obter o pool de conexão através da função testarConexaoDB
  const { success, pool } = await testarConexaoDB();
  if (!success || !pool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completos,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as total_processando,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_falhas,
        SUM(amount) as valor_total
      FROM 
        "Order"
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
  // Obter o pool de conexão através da função testarConexaoDB
  const { success, pool } = await testarConexaoDB();
  if (!success || !pool) {
    throw new Error('Pool de conexão não inicializado');
  }
  
  try {
    const query = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completos,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as falhas,
        SUM(amount) as valor_total
      FROM 
        "Order"
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

// Interface para representar um provedor
export interface Provedor {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  logo_url?: string;
  website?: string;
  criado_em: Date;
}

// Função para obter os principais provedores
export async function obterProvedores(): Promise<Provedor[]> {
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando busca de provedores durante o build');
    return [];
  }

  const ordersApiUrl = process.env.ORDERS_API_URL;
  const ordersApiKey = process.env.ORDERS_API_KEY;

  try {
    console.log('Iniciando busca de provedores.');
    
    // Tentar obter provedores via API
    if (ordersApiUrl && ordersApiKey) {
      // Primeiro tentamos o endpoint específico para o painel
      try {
        console.log('Buscando provedores via endpoint panel-providers...');
        const response = await axios.get(`${ordersApiUrl}/admin/panel-providers`, {
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`
          },
          timeout: 10000
        });

        // Verificar se a resposta contém dados
        if (response.data && response.data.providers && Array.isArray(response.data.providers)) {
          console.log(`Provedores encontrados via API panel-providers: ${response.data.providers.length}`);
          
          return response.data.providers.map((provider: any) => ({
            id: provider.id,
            nome: provider.name,
            descricao: '',
            ativo: provider.status === true,
            logo_url: '',
            website: '',
            criado_em: new Date(provider.created_at)
          }));
        }
      } catch (apiError) {
        console.error('Erro ao obter provedores via endpoint panel-providers:', apiError);
        // Se falhar via endpoint específico, tenta os endpoints alternativos
      }
      
      // Tentamos o endpoint público como fallback
      try {
        console.log('Buscando provedores via endpoint público (fallback)...');
        const response = await axios.get(`${ordersApiUrl}/providers`, {
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`
          },
          timeout: 10000
        });

        // Verificar se a resposta contém dados
        if (response.data && Array.isArray(response.data)) {
          console.log(`Provedores encontrados via API pública (fallback): ${response.data.length}`);
          
          // Mapear os dados da API para o formato esperado
          return response.data.map((provider: any) => ({
            id: provider.id,
            nome: provider.name,
            descricao: '',
            ativo: provider.active === true || provider.status === true,
            logo_url: provider.logo_url || '',
            website: provider.website || '',
            criado_em: new Date(provider.created_at)
          }));
        } else if (response.data && response.data.providers && Array.isArray(response.data.providers)) {
          console.log(`Provedores encontrados via API pública (fallback, formato alternativo): ${response.data.providers.length}`);
          
          return response.data.providers.map((provider: any) => ({
            id: provider.id,
            nome: provider.name,
            descricao: '',
            ativo: provider.active === true || provider.status === true,
            logo_url: provider.logo_url || '',
            website: provider.website || '',
            criado_em: new Date(provider.created_at)
          }));
        }
      } catch (fallbackApiError) {
        console.error('Erro ao obter provedores via endpoint público:', fallbackApiError);
        // Se falhar via API pública, tenta via banco de dados
      }
    }
    
    // Se não conseguiu via API, tenta via banco de dados
    console.log('Tentando obter provedores via banco de dados...');
    
    // Verificar se a conexão com o banco de dados está disponível
    const { success, pool } = await testarConexaoDB();
    if (!success || !pool) {
      throw new Error('Pool de conexão não inicializado');
    }
    
    // Consulta para buscar provedores
    // Usando o nome exato da tabela conforme definido no banco de dados
    const query = `
      SELECT 
        id, 
        name as nome, 
        status as ativo, 
        created_at as criado_em
      FROM 
        "Provider"
      WHERE 
        status = true
      ORDER BY 
        name ASC
    `;
    
    const result = await pool.query(query);
    console.log(`Encontrados ${result.rows.length} provedores via banco de dados`);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      nome: row.nome,
      descricao: '',
      ativo: row.ativo === true,
      logo_url: '',
      website: '',
      criado_em: new Date(row.criado_em)
    }));
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error(`Mensagem de erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    // Se todas as tentativas falharem, retorna uma lista vazia
    return [];
  }
}