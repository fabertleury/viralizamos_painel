import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { verifyJwtToken } from '../../../../utils/auth';
import axios from 'axios';

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

    const { id } = req.query;
    
    // Buscar pedido
    const pedidoQuery = `
      SELECT 
        o.*,
        p.api_url as provedor_api_url,
        p.api_key as provedor_api_key
      FROM "Order" o
      LEFT JOIN "Provider" p ON o.provider_id = p.id
      WHERE o.id = $1
    `;
    
    const pedidoResult = await pool.query(pedidoQuery, [id]);
    
    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }
    
    const pedido = pedidoResult.rows[0];
    
    // Verificar se o pedido pode ter o status atualizado
    if (['completed', 'completo', 'success'].includes(pedido.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pedido já está completo e não pode ser atualizado' 
      });
    }
    
    // Se o pedido não tiver um ID no provedor, não podemos verificar
    if (!pedido.provider_order_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pedido não possui ID no provedor para verificação' 
      });
    }
    
    let novoStatus = pedido.status;
    let respostaAPI = null;
    let mensagemErro = null;
    
    // Tentar atualizar status com o provedor, se disponível
    if (pedido.provedor_api_url && pedido.provedor_api_key) {
      try {
        // Esta é uma implementação simulada - em um sistema real, isso seria adaptado para cada provedor
        const apiResponse = await axios.get(`${pedido.provedor_api_url}/order/${pedido.provider_order_id}`, {
          headers: {
            'Authorization': `Bearer ${pedido.provedor_api_key}`
          }
        });
        
        respostaAPI = apiResponse.data;
        
        // Mapear status do provedor para o nosso sistema
        // Exemplo simplificado - em um sistema real, teria uma lógica mais robusta
        if (apiResponse.data.status) {
          switch (apiResponse.data.status.toLowerCase()) {
            case 'completed':
            case 'success':
              novoStatus = 'completed';
              break;
            case 'processing':
            case 'in_progress':
              novoStatus = 'processing';
              break;
            case 'pending':
            case 'waiting':
              novoStatus = 'pending';
              break;
            case 'canceled':
            case 'cancelled':
              novoStatus = 'canceled';
              break;
            case 'error':
            case 'failed':
              novoStatus = 'failed';
              mensagemErro = apiResponse.data.error || 'Falha reportada pelo provedor';
              break;
          }
        }
      } catch (apiError) {
        console.error(`Erro ao consultar API do provedor para o pedido ${id}:`, apiError);
        
        // Registrar erro, mas não falhar a atualização
        mensagemErro = apiError.response?.data?.message || 'Erro na comunicação com o provedor';
        respostaAPI = {
          error: true,
          message: mensagemErro,
          timestamp: new Date()
        };
      }
    } else {
      // Simulação de atualização para ambiente de desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        // Em ambiente de desenvolvimento, simular uma atualização
        const statusOptions = ['pending', 'processing', 'completed', 'failed'];
        const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        
        novoStatus = randomStatus;
        respostaAPI = {
          simulation: true,
          message: 'Status atualizado em simulação',
          timestamp: new Date()
        };
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Provedor não possui API configurada para verificação' 
        });
      }
    }
    
    // Atualizar o status do pedido no banco de dados
    const updateQuery = `
      UPDATE "Order"
      SET 
        status = $1,
        api_response = $2,
        error_message = $3,
        last_check = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [
      novoStatus,
      respostaAPI ? JSON.stringify(respostaAPI) : pedido.api_response,
      mensagemErro || pedido.error_message,
      id
    ]);
    
    // Registrar no histórico
    if (novoStatus !== pedido.status) {
      const historicoQuery = `
        INSERT INTO "OrderHistory" (
          order_id,
          status,
          description,
          created_by
        ) VALUES (
          $1, $2, $3, $4
        )
      `;
      
      await pool.query(historicoQuery, [
        id,
        novoStatus,
        `Status atualizado de ${pedido.status} para ${novoStatus} via verificação manual.`,
        tokenData.id
      ]);
    }
    
    // Se o pedido foi concluído, atualizar solicitações de reposição pendentes
    if (novoStatus === 'completed' && ['pending', 'processing'].includes(pedido.status)) {
      try {
        // Verificar se este pedido é uma reposição
        if (pedido.is_replacement) {
          // Atualizar a solicitação de reposição correspondente
          await pool.query(`
            UPDATE "ReprocessRequest"
            SET status = 'completed'
            WHERE replacement_order_id = $1
          `, [id]);
        }
      } catch (repoError) {
        console.error(`Erro ao atualizar status de reposição para o pedido ${id}:`, repoError);
        // Não falhar a operação principal
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Status do pedido verificado e atualizado com sucesso',
      statusAnterior: pedido.status,
      statusAtual: novoStatus,
      pedido: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno ao verificar status do pedido' 
    });
  }
} 