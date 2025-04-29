import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pedidos (orders)
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL || 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexões iniciais
ordersPool.on('error', (err) => {
  console.error('[API:PanelUsersDiretoDetail:Pool] Erro no pool de conexão de orders:', err.message);
});

pagamentosPool.on('error', (err) => {
  console.error('[API:PanelUsersDiretoDetail:Pool] Erro no pool de conexão de pagamentos:', err.message);
});

console.log('[API:PanelUsersDiretoDetail:Init] Pools de conexão inicializados');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido', message: 'Este endpoint só aceita requisições GET' });
  }

  try {
    // Obter o ID do usuário da URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID de usuário inválido', message: 'O ID do usuário é obrigatório' });
    }
    
    console.log(`[API:PanelUsersDiretoDetail] Buscando detalhes do usuário ID: ${id}`);
    
    // Obter conexões dos pools
    const ordersClient = await ordersPool.connect();
    const pagamentosClient = await pagamentosPool.connect();
    
    try {
      // 1. Buscar informações básicas do usuário na tabela User
      const userQuery = `
        SELECT 
          id, 
          email, 
          name, 
          phone, 
          role, 
          created_at, 
          updated_at
        FROM 
          "User"
        WHERE 
          id = $1
      `;
      
      const userResult = await ordersClient.query(userQuery, [id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado', message: 'Não foi possível encontrar um usuário com o ID fornecido' });
      }
      
      const user = userResult.rows[0];
      
      // 2. Buscar os pedidos do usuário para extrair metadados
      const ordersQuery = `
        SELECT 
          id, 
          status, 
          total_in_cents, 
          created_at,
          metadata
        FROM 
          "Order"
        WHERE 
          user_id = $1
        ORDER BY 
          created_at DESC
      `;
      
      const ordersResult = await ordersClient.query(ordersQuery, [id]);
      const orders = ordersResult.rows;
      
      console.log(`[API:PanelUsersDiretoDetail] Encontrados ${orders.length} pedidos para o usuário ${id}`);
      
      // 3. Extrair external_payment_id e external_transaction_id dos metadados dos pedidos
      const externalIds = orders.reduce((acc, order) => {
        try {
          if (order.metadata) {
            const metadata = typeof order.metadata === 'string' 
              ? JSON.parse(order.metadata) 
              : order.metadata;
            
            if (metadata.external_payment_id) {
              acc.paymentIds.add(metadata.external_payment_id);
            }
            
            if (metadata.external_transaction_id) {
              acc.transactionIds.add(metadata.external_transaction_id);
            }
          }
        } catch (error) {
          console.error(`[API:PanelUsersDiretoDetail] Erro ao processar metadados do pedido ${order.id}:`, error);
        }
        return acc;
      }, { paymentIds: new Set(), transactionIds: new Set() });
      
      // Converter Sets para arrays
      const externalPaymentIds = Array.from(externalIds.paymentIds);
      const externalTransactionIds = Array.from(externalIds.transactionIds);
      
      console.log(`[API:PanelUsersDiretoDetail] IDs externos encontrados: ${externalPaymentIds.length} pagamentos, ${externalTransactionIds.length} transações`);
      
      // 4. Buscar transações relacionadas no banco de pagamentos
      let transactions = [];
      
      if (externalTransactionIds.length > 0 || externalPaymentIds.length > 0) {
        let transactionConditions = [];
        let transactionParams = [];
        
        if (externalTransactionIds.length > 0) {
          transactionConditions.push(`external_id IN (${externalTransactionIds.map((_, i) => `$${i + 1}`).join(', ')})`);
          transactionParams.push(...externalTransactionIds);
        }
        
        const transactionsQuery = `
          SELECT 
            id, 
            external_id, 
            amount, 
            status, 
            method, 
            created_at
          FROM 
            "transactions"
          WHERE 
            ${transactionConditions.join(' OR ')}
          ORDER BY 
            created_at DESC
        `;
        
        if (transactionParams.length > 0) {
          const transactionsResult = await pagamentosClient.query(transactionsQuery, transactionParams);
          transactions = transactionsResult.rows;
          console.log(`[API:PanelUsersDiretoDetail] Encontradas ${transactions.length} transações para o usuário ${id}`);
        }
      }
      
      // 5. Calcular métricas do usuário
      const totalSpent = transactions.reduce((sum, t) => {
        return t.status === 'approved' ? sum + parseFloat(t.amount || 0) : sum;
      }, 0);
      
      const approvedTransactions = transactions.filter(t => t.status === 'approved');
      const avgOrderValue = approvedTransactions.length > 0 
        ? totalSpent / approvedTransactions.length 
        : 0;
      
      // Encontrar a última compra
      let lastPurchase = null;
      if (approvedTransactions.length > 0) {
        const lastTransaction = approvedTransactions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        lastPurchase = {
          id: lastTransaction.id,
          date: lastTransaction.created_at,
          status: lastTransaction.status,
          amount: parseFloat(lastTransaction.amount || 0)
        };
      }
      
      // Calcular frequência de compra (em dias)
      let purchaseFrequency = null;
      if (approvedTransactions.length > 1) {
        const sortedDates = approvedTransactions
          .map(t => new Date(t.created_at).getTime())
          .sort((a, b) => b - a); // Ordenar do mais recente para o mais antigo
        
        const totalDays = (sortedDates[0] - sortedDates[sortedDates.length - 1]) / (1000 * 60 * 60 * 24);
        purchaseFrequency = totalDays / (approvedTransactions.length - 1);
      }
      
      // Agrupar por método de pagamento
      const paymentMethods = transactions.reduce((acc, t) => {
        const method = t.method || 'unknown';
        if (!acc[method]) {
          acc[method] = 0;
        }
        acc[method]++;
        return acc;
      }, {});
      
      // Formatar os métodos de pagamento para o formato esperado
      const topServices = Object.entries(paymentMethods)
        .map(([service_name, count]) => ({ service_name, count }))
        .sort((a, b) => b.count - a.count);
      
      // 6. Montar o objeto de resposta com as métricas
      const userWithMetrics = {
        ...user,
        metrics: {
          orders_count: orders.length,
          total_spent: totalSpent,
          last_purchase: lastPurchase,
          top_services: topServices,
          purchase_frequency: purchaseFrequency,
          avg_order_value: avgOrderValue
        },
        transactions: transactions.map(t => ({
          id: t.id,
          external_id: t.external_id,
          amount: parseFloat(t.amount || 0),
          status: t.status,
          method: t.method,
          created_at: t.created_at
        }))
      };
      
      return res.status(200).json(userWithMetrics);
      
    } catch (error) {
      console.error('[API:PanelUsersDiretoDetail] Erro ao buscar detalhes do usuário:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: 'Ocorreu um erro ao buscar os detalhes do usuário',
        details: error.message
      });
    } finally {
      // Liberar as conexões
      ordersClient.release();
      pagamentosClient.release();
    }
  } catch (error) {
    console.error('[API:PanelUsersDiretoDetail] Erro geral:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: 'Ocorreu um erro ao processar a requisição',
      details: error.message
    });
  }
}
