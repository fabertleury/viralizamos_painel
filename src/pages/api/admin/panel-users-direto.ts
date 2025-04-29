import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pedidos (orders) usando a abordagem que funcionou no script de teste
const ordersPool = new Pool({
  // Usar a string de conexão diretamente ou a variável de ambiente
  connectionString: process.env.ORDERS_DATABASE_URL || 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false }, // Simplificado para sempre aceitar certificados auto-assinados
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial com o banco de dados de orders
ordersPool.on('error', (err) => {
  console.error('[API:PanelUsersDireto:Pool] Erro no pool de conexão de orders:', err.message);
});

console.log('[API:PanelUsersDireto:Init] Pool de conexão de orders inicializado com a abordagem do script de teste');

// Conexão com o banco de dados de pagamentos usando a abordagem que funcionou no script de teste
const pagamentosPool = new Pool({
  // Usar a string de conexão diretamente ou a variável de ambiente
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false }, // Simplificado para sempre aceitar certificados auto-assinados
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial com o banco de dados de pagamentos
pagamentosPool.on('error', (err) => {
  console.error('[API:PanelUsersDireto:Pool] Erro no pool de conexão de pagamentos:', err.message);
});

console.log('[API:PanelUsersDireto:Init] Pool de conexão de pagamentos inicializado com a abordagem do script de teste');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido', message: 'Este endpoint só aceita requisições GET' });
  }

  try {
    console.log('[API:PanelUsersDireto] Iniciando busca direta de usuários no banco de dados');
    
    // Extrair parâmetros de query
    const { 
      search, 
      role, 
      page = '1', 
      limit = '10' 
    } = req.query;
    
    // Verificar conexão com o banco de dados
    console.log('[API:PanelUsersDireto] Testando conexão com banco de dados de orders');
    const testConnection = await ordersPool.query('SELECT NOW() as time');
    console.log(`[API:PanelUsersDireto] Conexão OK: ${testConnection.rows[0].time}`);
    
    // Construir a consulta com filtros dinâmicos
    let queryParams: any[] = [];
    let whereConditions: string[] = [];
    
    // Filtro por role (tipo de usuário)
    if (role && role !== 'all') {
      whereConditions.push(`u.role = $${queryParams.length + 1}`);
      queryParams.push(role);
    }
    
    // Busca por termo (nome, email)
    if (search) {
      whereConditions.push(`(
        u.name ILIKE $${queryParams.length + 1} OR
        u.email ILIKE $${queryParams.length + 2}
      )`);
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Construir a cláusula WHERE
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Calcular offset para paginação
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    // Consulta para contar o total de usuários com os filtros aplicados
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "User" u
      ${whereClause}
    `;
    
    const countResult = await ordersPool.query(countQuery, queryParams);
    const totalUsers = parseInt(countResult.rows[0].total);
    
    // Consulta principal para buscar os usuários com paginação
    const usersQuery = `
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.phone, 
        u.role, 
        u.created_at, 
        u.updated_at
      FROM "User" u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const usersResult = await ordersPool.query(usersQuery, queryParams);
    
    // Array para armazenar os usuários com métricas
    const usersWithMetrics = [];
    
    // Para cada usuário, buscar suas métricas
    for (const user of usersResult.rows) {
      // Buscar pedidos do usuário com metadata
      const ordersQuery = `
        SELECT id, status, amount, created_at, metadata
        FROM "Order"
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const ordersResult = await ordersPool.query(ordersQuery, [user.id]);
      const ordersCount = ordersResult.rows.length;
      const totalSpent = ordersResult.rows.reduce((sum, order) => {
        return sum + parseFloat(order.amount || '0');
      }, 0);
      
      // Extrair external_payment_ids e external_transaction_ids dos pedidos
      const externalPaymentIds = [];
      const externalTransactionIds = [];
      const userEmails = new Set();
      
      // Coletar todos os IDs externos e emails dos metadados
      ordersResult.rows.forEach(order => {
        try {
          if (order.metadata) {
            const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
            
            // Coletar external_payment_id
            if (metadata.external_payment_id) {
              externalPaymentIds.push(metadata.external_payment_id);
            }
            
            // Coletar external_transaction_id
            if (metadata.external_transaction_id) {
              externalTransactionIds.push(metadata.external_transaction_id);
            }
            
            // Coletar email do usuário
            if (metadata.user_info && metadata.user_info.email) {
              userEmails.add(metadata.user_info.email);
            }
          }
        } catch (error) {
          console.error(`[API:PanelUsersDireto] Erro ao processar metadata do pedido ${order.id}:`, error instanceof Error ? error.message : 'Erro desconhecido');
        }
      });
      
      // Adicionar o email do usuário da tabela User
      if (user.email) {
        userEmails.add(user.email);
      }
      
      // Tentar buscar relação entre payment_requests e transactions
      try {
        // Verificar a estrutura das tabelas primeiro
        const paymentRequestsQuery = `
          SELECT t.id as transaction_id, t.external_id, t.payment_request_id, pr.id as request_id
          FROM "transactions" t
          JOIN "payment_requests" pr ON t.payment_request_id = pr.id
          LIMIT 5
        `;
        const paymentRequestsResult = await pagamentosPool.query(paymentRequestsQuery);
        console.log('[API:PanelUsersDireto] Relação entre payment_requests e transactions:', paymentRequestsResult.rows);
      } catch (error) {
        console.error('[API:PanelUsersDireto] Erro ao buscar relação entre payment_requests e transactions:', error instanceof Error ? error.message : 'Erro desconhecido');
      }
      
      // Buscar último pedido
      const lastOrderQuery = `
        SELECT id, status, amount, created_at, metadata
        FROM "Order"
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const lastOrderResult = await ordersPool.query(lastOrderQuery, [user.id]);
      const lastOrder = lastOrderResult.rows[0] || null;
      
      // Extrair informações adicionais do último pedido
      let lastOrderMetadata = null;
      if (lastOrder && lastOrder.metadata) {
        try {
          lastOrderMetadata = typeof lastOrder.metadata === 'string' ? JSON.parse(lastOrder.metadata) : lastOrder.metadata;
        } catch (error) {
          console.error(`[API:PanelUsersDireto] Erro ao processar metadata do último pedido:`, error instanceof Error ? error.message : 'Erro desconhecido');
        }
      }
      
      // Buscar serviços mais comprados
      const topServicesQuery = `
        SELECT service_id, COUNT(*) as count
        FROM "Order"
        WHERE user_id = $1 AND service_id IS NOT NULL
        GROUP BY service_id
        ORDER BY count DESC
        LIMIT 3
      `;
      const topServicesResult = await ordersPool.query(topServicesQuery, [user.id]);
      
      // Calcular valor médio do pedido
      const avgOrderValue = ordersCount > 0 ? totalSpent / ordersCount : 0;
      
      // Inicializar métricas de pagamentos
      let transactionsCount = 0;
      let totalPayments = 0;
      let lastTransaction = null;
      let paymentMethods = [];
      let preferredPaymentMethod = null;
      let userTransactions = [];
      if (externalPaymentIds.length > 0 || externalTransactionIds.length > 0) {
        try {
          // Construir a lista de condições para a consulta
          const conditions = [];
          const transactionParams = [];
          
          // Adicionar condições para external_payment_ids
          if (externalPaymentIds.length > 0) {
            externalPaymentIds.forEach((id, index) => {
              conditions.push(`external_id LIKE $${index + 1}`);
              transactionParams.push(`%${id}%`);
            });
          }
          
          // Adicionar condições para external_transaction_ids
          if (externalTransactionIds.length > 0) {
            externalTransactionIds.forEach((id, index) => {
              // Converter para número para evitar erro de tipo em operações aritméticas
              const baseIndex = Number(externalPaymentIds.length);
              const currentIndex = Number(index);
              const paramIndex = baseIndex + currentIndex + 1;
              conditions.push(`external_id LIKE $${paramIndex}`);
              transactionParams.push(`%${id}%`);
            });
          }
          
          // Consulta para buscar transações
          if (conditions.length > 0) {
            const transactionsQuery = `
              SELECT id, status, amount, method, created_at, external_id
              FROM "transactions"
              WHERE ${conditions.join(' OR ')}
              ORDER BY created_at DESC
            `;
            
            const transactionsResult = await pagamentosPool.query(transactionsQuery, transactionParams);
            userTransactions = transactionsResult.rows;
          }
        } catch (error) {
          console.error(`[API:PanelUsersDireto] Erro ao buscar dados de transações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          // Não retornar erro para o cliente, apenas continuar com os dados disponíveis
        }
      }
      
      if (userTransactions.length > 0) {
        console.log(`[API:PanelUsersDireto] Encontradas ${userTransactions.length} transações para o usuário ${user.id}`);
        
        // Calcular métricas de transações
        transactionsCount = userTransactions.length;
        totalPayments = userTransactions
          .filter(t => t.status === 'approved' || t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
        
        // Pegar a última transação (já está ordenada por data)
        if (userTransactions.length > 0) {
          const lastTransactionData = userTransactions[0];
          lastTransaction = {
            id: lastTransactionData.id,
            date: lastTransactionData.created_at,
            status: lastTransactionData.status,
            amount: parseFloat(lastTransactionData.amount || '0'),
            method: lastTransactionData.method,
            external_id: lastTransactionData.external_id
          };
        }
        
        // Determinar o método de pagamento preferido
        const methodsMap = userTransactions
          .filter(t => t.method)
          .reduce((methods: Record<string, number>, t) => {
            const method = t.method;
            methods[method] = (methods[method] || 0) + 1;
            return methods;
          }, {});
        
        paymentMethods = Object.entries(methodsMap).map(([method, count]) => ({
          method,
          count: count
        })).sort((a, b) => b.count - a.count);
        
        preferredPaymentMethod = paymentMethods.length > 0 ? paymentMethods[0].method : null;
        
        // Buscar informações adicionais de pagamentos
        // Nota: A tabela 'users' não existe no banco de pagamentos, então não tentaremos buscar informações de usuário lá
        let paymentUserInfo = null;
        try {
          // Em vez de buscar na tabela users, vamos buscar diretamente nas transações
          // para obter informações relevantes sobre o usuário
          if (userTransactions.length > 0) {
            // Extrair informações básicas da primeira transação
            const firstTransaction = userTransactions[0];
            paymentUserInfo = {
              id: firstTransaction.id,
              email: user.email, // Usar o email do usuário da tabela User do orders
              created_at: firstTransaction.created_at,
              transaction_count: userTransactions.length
            };
          }
        } catch (error) {
          console.error(`[API:PanelUsersDireto] Erro ao processar informações de pagamento:`, error instanceof Error ? error.message : 'Erro desconhecido');
        } // Não retornar erro para o cliente, apenas continuar com os dados disponíveis
      }
      
      // Adicionar usuário com métricas ao array, incluindo dados de pagamentos
      usersWithMetrics.push({
        id: user.id,
        email: user.email,
        name: user.name || '',
        phone: user.phone || null,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        metrics: {
          // Métricas de pedidos (orders)
          orders_count: ordersCount,
          total_spent: totalSpent,
          last_purchase: lastOrder ? {
            id: lastOrder.id,
            date: lastOrder.created_at,
            status: lastOrder.status,
            amount: parseFloat(lastOrder.amount || '0')
          } : null,
          top_services: topServicesResult.rows.map(service => ({
            service_name: service.service_id,
            count: parseInt(service.count)
          })),
          avg_order_value: avgOrderValue,
          
          // Métricas de pagamentos
          transactions_count: transactionsCount,
          total_payments: totalPayments,
          last_transaction: lastTransaction,
          payment_methods: paymentMethods,
          user_transactions: userTransactions.map(t => ({
            id: t.id,
            status: t.status,
            amount: parseFloat(t.amount || '0'),
            method: t.method,
            date: t.created_at,
            external_id: t.external_id
          })),
          external_payment_ids: externalPaymentIds,
          user_emails: Array.from(userEmails),
          last_order_metadata: lastOrderMetadata,
          
          // Métricas combinadas
          total_activity: ordersCount + transactionsCount,
          total_value: totalSpent + totalPayments
        }
      });
    }
    
    // Resposta com dados e informações de paginação
    const response = {
      users: usersWithMetrics,
      page: pageNum,
      totalPages: Math.ceil(totalUsers / limitNum),
      totalItems: totalUsers,
      // Informações adicionais para debug
      debug: {
        conexao: true,
        db_url: process.env.ORDERS_DATABASE_URL?.substring(0, 20) + '...',
        ambiente: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log(`[API:PanelUsersDireto] Retornando ${usersWithMetrics.length} registros de usuários com métricas detalhadas`);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[API:PanelUsersDireto] Erro ao buscar usuários:', error);
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : null,
      orders_url: process.env.ORDERS_DATABASE_URL?.substring(0, 20) + '...'
    });
  }
}
