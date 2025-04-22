import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurar o pool de conexão para o banco de dados de usuários
const usersPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Inicializar o pool e testar a conexão
usersPool.on('error', (err) => {
  console.error('Erro inesperado no pool de usuários', err);
});

// Configurar o pool de conexão para o banco de dados de pedidos
const ordersPool = new Pool({
  connectionString: process.env.DATABASE_URL_ORDERS,
});

ordersPool.on('error', (err) => {
  console.error('Erro inesperado no pool de pedidos', err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas permitir requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  console.log(`[${new Date().toISOString()}] Iniciando busca de informações de conta do usuário`);
  
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    console.log(`[${new Date().toISOString()}] Buscando informações da conta do usuário ID: ${id}`);

    // Buscar informações básicas do usuário
    const userQuery = `
      SELECT 
        id, 
        nome, 
        email, 
        telefone, 
        created_at as data_cadastro,
        updated_at as data_atualizacao,
        ultimo_login,
        status,
        tipo
      FROM usuarios 
      WHERE email = $1
    `;
    
    const userResult = await usersPool.query(userQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const usuario = userResult.rows[0];
    
    // Buscar estatísticas de pedidos do usuário
    const orderStatsQuery = `
      SELECT 
        COUNT(*) as total_pedidos,
        COALESCE(SUM(total_amount), 0) as total_gasto,
        MAX(created_at) as ultimo_pedido
      FROM "Order"
      WHERE customer_email = $1
    `;
    
    const orderStatsResult = await ordersPool.query(orderStatsQuery, [id]);
    const orderStats = orderStatsResult.rows[0];
    
    // Buscar serviço mais comprado
    const favoriteServiceQuery = `
      SELECT 
        s.service_name as nome_servico,
        COUNT(*) as qtd_compras
      FROM "Order" o
      JOIN "Service" s ON o.service_id = s.id
      WHERE o.customer_email = $1
      GROUP BY s.service_name
      ORDER BY qtd_compras DESC
      LIMIT 1
    `;
    
    const favoriteServiceResult = await ordersPool.query(favoriteServiceQuery, [id]);
    const favoriteService = favoriteServiceResult.rows.length > 0 
      ? favoriteServiceResult.rows[0].nome_servico 
      : null;
    
    // Construir objeto de resposta completo
    const contaInfo = {
      ...usuario,
      estatisticas: {
        total_pedidos: parseInt(orderStats.total_pedidos) || 0,
        total_gasto: parseFloat(orderStats.total_gasto) || 0,
        ultimo_pedido: orderStats.ultimo_pedido,
        servico_favorito: favoriteService
      }
    };

    console.log(`[${new Date().toISOString()}] Informações da conta do usuário recuperadas com sucesso`);
    
    return res.status(200).json(contaInfo);
  } catch (error) {
    console.error('Erro ao buscar informações da conta do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar informações da conta do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 