import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurar o pool de conexão para o banco de dados de pedidos
const ordersPool = new Pool({
  connectionString: process.env.DATABASE_URL_ORDERS,
});

// Inicializar o pool e testar a conexão
ordersPool.on('error', (err) => {
  console.error('Erro inesperado no pool de pedidos', err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas permitir requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  console.log(`[${new Date().toISOString()}] Iniciando busca de pedidos do usuário`);
  
  try {
    const { id } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    console.log(`[${new Date().toISOString()}] Buscando pedidos do usuário ID: ${id}, page: ${page}, limit: ${limit}`);

    // Contar total de pedidos para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Order"
      WHERE customer_email = $1
    `;
    
    const countResult = await ordersPool.query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);
    
    // Buscar pedidos do usuário com paginação
    const ordersQuery = `
      SELECT 
        id,
        order_uid as codigo,
        status,
        total_amount as valor_total,
        created_at as data_criacao,
        updated_at as data_atualizacao,
        provider_name as servico,
        service_name as nome_servico,
        service_type as tipo_servico,
        payment_method as metodo_pagamento,
        payment_status as status_pagamento
      FROM "Order"
      WHERE customer_email = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const ordersResult = await ordersPool.query(ordersQuery, [id, limit, offset]);
    
    // Formatar os pedidos
    const pedidos = ordersResult.rows.map(pedido => ({
      ...pedido,
      valor_total: parseFloat(pedido.valor_total) || 0,
    }));

    console.log(`[${new Date().toISOString()}] Encontrados ${pedidos.length} pedidos para o usuário`);
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      pedidos,
      paginacao: {
        totalItems: total,
        itemsPorPagina: limit,
        paginaAtual: page,
        totalPaginas: totalPages,
        proximaPagina: hasNextPage ? page + 1 : null,
        paginaAnterior: hasPrevPage ? page - 1 : null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar pedidos do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 