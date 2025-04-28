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
      // Buscar contagem de pedidos
      const ordersCountQuery = `
        SELECT COUNT(*) as count, SUM(amount) as total_spent
        FROM "Order"
        WHERE user_id = $1
      `;
      const ordersCountResult = await ordersPool.query(ordersCountQuery, [user.id]);
      const ordersCount = parseInt(ordersCountResult.rows[0].count || '0');
      const totalSpent = parseFloat(ordersCountResult.rows[0].total_spent || '0');
      
      // Buscar último pedido
      const lastOrderQuery = `
        SELECT id, status, amount, created_at
        FROM "Order"
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const lastOrderResult = await ordersPool.query(lastOrderQuery, [user.id]);
      const lastOrder = lastOrderResult.rows[0] || null;
      
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
      
      // Adicionar usuário com métricas ao array
      usersWithMetrics.push({
        id: user.id,
        email: user.email,
        name: user.name || '',
        phone: user.phone || null,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        metrics: {
          orders_count: ordersCount,
          total_spent: totalSpent,
          last_purchase: lastOrder ? {
            id: lastOrder.id,
            date: lastOrder.created_at,
            status: lastOrder.status,
            amount: parseFloat(lastOrder.amount || '0')
          } : null,
          top_services: topServicesResult.rows.map(service => ({
            service_name: service.service_id, // Idealmente buscaríamos o nome do serviço
            count: parseInt(service.count)
          })),
          purchase_frequency: null, // Cálculo mais complexo que pode ser implementado depois
          avg_order_value: avgOrderValue
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
    
    console.log(`[API:PanelUsersDireto] Retornando ${usersWithMetrics.length} de ${totalUsers} usuários`);
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
