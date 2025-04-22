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

  console.log(`[${new Date().toISOString()}] Iniciando busca de transações do usuário`);
  
  try {
    const { id } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    console.log(`[${new Date().toISOString()}] Buscando transações do usuário ID: ${id}, page: ${page}, limit: ${limit}`);

    // Contar total de transações para paginação
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Transaction"
      WHERE customer_email = $1
    `;
    
    const countResult = await ordersPool.query(countQuery, [id]);
    const total = parseInt(countResult.rows[0].total);
    
    // Buscar transações do usuário com paginação
    const transactionsQuery = `
      SELECT 
        id,
        transaction_uid as codigo,
        status,
        amount as valor,
        created_at as data_criacao,
        updated_at as data_atualizacao,
        payment_method as metodo_pagamento,
        order_id,
        payment_gateway as gateway_pagamento,
        transaction_type as tipo_transacao,
        description as descricao
      FROM "Transaction"
      WHERE customer_email = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const transactionsResult = await ordersPool.query(transactionsQuery, [id, limit, offset]);
    
    // Formatar as transações
    const transacoes = transactionsResult.rows.map(transacao => ({
      ...transacao,
      valor: parseFloat(transacao.valor) || 0,
    }));

    console.log(`[${new Date().toISOString()}] Encontradas ${transacoes.length} transações para o usuário`);
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      transacoes,
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
    console.error('Erro ao buscar transações do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar transações do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 