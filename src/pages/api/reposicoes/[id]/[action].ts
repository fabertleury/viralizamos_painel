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

  // Tratar apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    if (!pool) {
      throw new Error('Pool de conexão não inicializado');
    }

    const { id, action } = req.query;
    const { resposta } = req.body;

    // Validar ação
    if (action !== 'aprovar' && action !== 'rejeitar') {
      return res.status(400).json({ 
        success: false, 
        message: 'Ação inválida. Use "aprovar" ou "rejeitar".' 
      });
    }

    // Buscar a solicitação de reposição
    const reposicaoQuery = `
      SELECT * FROM "ReprocessRequest" 
      WHERE id = $1
    `;
    
    const reposicaoResult = await pool.query(reposicaoQuery, [id]);
    
    if (reposicaoResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Solicitação de reposição não encontrada' 
      });
    }
    
    const reposicao = reposicaoResult.rows[0];
    
    // Verificar se a solicitação já foi processada
    if (reposicao.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Solicitação já foi ${reposicao.status === 'approved' ? 'aprovada' : 
          reposicao.status === 'rejected' ? 'rejeitada' : 'processada'}` 
      });
    }
    
    // Atualizar status da solicitação
    const newStatus = action === 'aprovar' ? 'approved' : 'rejected';
    
    const updateQuery = `
      UPDATE "ReprocessRequest"
      SET 
        status = $1,
        admin_response = $2,
        processed_by = $3,
        resolved_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [
      newStatus,
      resposta || null,
      tokenData.id,
      id
    ]);
    
    // Se aprovado, criar uma nova ordem
    if (action === 'aprovar') {
      // Buscar detalhes do pedido original
      const orderQuery = `
        SELECT * FROM "Order"
        WHERE id = $1
      `;
      
      const orderResult = await pool.query(orderQuery, [reposicao.order_id]);
      
      if (orderResult.rows.length > 0) {
        const pedidoOriginal = orderResult.rows[0];
        
        // Criar um novo pedido como reposição
        const newOrderQuery = `
          INSERT INTO "Order" (
            user_id,
            service_id,
            service_type,
            target_username,
            quantity,
            amount,
            status,
            provider_id,
            is_replacement,
            original_order_id,
            reprocess_request_id,
            metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pending', $7, true, $8, $9, $10
          )
          RETURNING id
        `;
        
        const newOrderParams = [
          pedidoOriginal.user_id,
          pedidoOriginal.service_id,
          pedidoOriginal.service_type,
          pedidoOriginal.target_username,
          pedidoOriginal.quantity,
          0, // Valor zero para reposições
          pedidoOriginal.provider_id,
          pedidoOriginal.id,
          reposicao.id,
          JSON.stringify({
            reposicao: true,
            pedido_original: pedidoOriginal.id,
            motivo: reposicao.reason,
            resposta_admin: resposta || 'Reposição aprovada'
          })
        ];
        
        const newOrderResult = await pool.query(newOrderQuery, newOrderParams);
        
        // Atualizar a reposição com o ID do novo pedido
        if (newOrderResult.rows.length > 0) {
          const newOrderId = newOrderResult.rows[0].id;
          
          await pool.query(`
            UPDATE "ReprocessRequest"
            SET replacement_order_id = $1
            WHERE id = $2
          `, [newOrderId, id]);
          
          // Atualizar status para 'processing' após criar o novo pedido
          await pool.query(`
            UPDATE "ReprocessRequest"
            SET status = 'processing'
            WHERE id = $1
          `, [id]);
        }
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Solicitação ${action === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`,
      reposicao: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error(`Erro ao ${req.query.action} solicitação de reposição:`, error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao processar a solicitação de reposição' 
    });
  }
} 