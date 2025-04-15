import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { verifyJwtToken } from '../../../../utils/auth';

// Inicialização da conexão com o banco de dados
let pool: Pool | null = null;

if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  pool = new Pool({
    connectionString: process.env.ORDERS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const token = authHeader.substring(7);
  const tokenData = await verifyJwtToken(token);

  if (!tokenData) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  // Verificar se o usuário tem permissão de administrador
  if (tokenData.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  // Tratar apenas requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    if (!pool) {
      throw new Error('Pool de conexão não inicializado');
    }

    const { id } = req.query;
    
    // Buscar detalhes do pedido
    const query = `
      SELECT 
        o.id,
        o.created_at as data_criacao,
        o.provider_id as provedor_id,
        p.name as provedor_nome,
        o.service_id as produto_id,
        o.service_type as produto_tipo,
        o.target_username as produto_nome,
        o.quantity as quantidade,
        o.amount as valor,
        o.status,
        o.user_id as cliente_id,
        u.name as cliente_nome,
        u.email as cliente_email,
        u.phone as cliente_telefone,
        o.transaction_id as transacao_id,
        o.provider_order_id,
        o.api_response,
        o.error_message,
        o.last_check,
        o.metadata as metadados
      FROM "Order" o
      LEFT JOIN "User" u ON o.user_id = u.id
      LEFT JOIN "Provider" p ON o.provider_id = p.id
      WHERE o.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Obter dados do pedido
    const pedido = result.rows[0];
    
    // Processar dados da transação
    if (pedido.transacao_id) {
      // Buscar detalhes da transação
      const transacaoQuery = `
        SELECT 
          id,
          status,
          payment_method as metodo_pagamento,
          created_at as data_criacao,
          approved_at as data_pagamento,
          installments as parcelas,
          installment_amount as valor_parcela
        FROM "Transaction"
        WHERE id = $1
      `;
      
      try {
        const transacaoResult = await pool.query(transacaoQuery, [pedido.transacao_id]);
        
        if (transacaoResult.rows.length > 0) {
          pedido.transacao_detalhes = transacaoResult.rows[0];
        }
      } catch (error) {
        console.error(`Erro ao buscar detalhes da transação ${pedido.transacao_id}:`, error);
        // Continuar o processamento mesmo sem os detalhes da transação
      }
    }
    
    // Buscar histórico do pedido
    const historicoQuery = `
      SELECT 
        created_at as data,
        status,
        description as descricao
      FROM "OrderHistory"
      WHERE order_id = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const historicoResult = await pool.query(historicoQuery, [id]);
      
      if (historicoResult.rows.length > 0) {
        pedido.historico = historicoResult.rows;
      }
    } catch (error) {
      console.error(`Erro ao buscar histórico do pedido ${id}:`, error);
      // Continuar o processamento mesmo sem o histórico
    }
    
    // Buscar solicitações de reposição
    const reposicoesQuery = `
      SELECT 
        id,
        status,
        reason as motivo,
        created_at as data_solicitacao,
        resolved_at as data_resposta,
        admin_response as resposta_admin
      FROM "ReprocessRequest"
      WHERE order_id = $1
      ORDER BY created_at DESC
    `;
    
    try {
      const reposicoesResult = await pool.query(reposicoesQuery, [id]);
      
      if (reposicoesResult.rows.length > 0) {
        pedido.reposicoes = reposicoesResult.rows;
      }
    } catch (error) {
      console.error(`Erro ao buscar reposições do pedido ${id}:`, error);
      // Continuar o processamento mesmo sem as reposições
    }
    
    // Verificar se este pedido é uma reposição
    if (pedido.metadados && pedido.metadados.reposicao) {
      pedido.is_reposicao = true;
      pedido.pedido_original_id = pedido.metadados.pedido_original;
    }
    
    return res.status(200).json(pedido);
    
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    
    // Em caso de erro, retornar dados simulados para visualização
    return res.status(200).json({
      id: req.query.id,
      data_criacao: new Date(),
      provedor_id: 'mock-prov',
      provedor_nome: 'Provedor (offline)',
      produto_id: 'mock-prod',
      produto_nome: 'Produto de teste',
      quantidade: 100,
      valor: 50.0,
      status: 'pending',
      cliente_id: 'mock-client',
      cliente_nome: 'Cliente de teste',
      cliente_email: 'teste@exemplo.com',
      error_message: 'Dados simulados devido a erro de conexão com o banco de dados',
      mock: true
    });
  }
} 