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
  // Apenas permitir requisições PUT
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do pedido é obrigatório' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Atualizando status do pedido: ${id}`);
    
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status não fornecido' 
      });
    }
    
    // Validar se o status é um dos valores permitidos
    const statusesPermitidos = ['pendente', 'processando', 'completo', 'falha', 'cancelado'];
    if (!statusesPermitidos.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status inválido. Valores permitidos: pendente, processando, completo, falha, cancelado'
      });
    }

    // Verificar se o pedido existe
    const verificarQuery = `
      SELECT id FROM "Order" WHERE id = $1
    `;
    
    const verificarResult = await ordersPool.query(verificarQuery, [id]);
    
    if (verificarResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido não encontrado' 
      });
    }
    
    // Atualizar o status do pedido
    const updateQuery = `
      UPDATE "Order"
      SET 
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, status
    `;
    
    const updateResult = await ordersPool.query(updateQuery, [status, id]);
    
    // Registrar log da atualização
    const logQuery = `
      INSERT INTO "OrderLog" (order_id, level, message, data)
      VALUES ($1, 'info', $2, $3)
    `;
    
    await ordersPool.query(logQuery, [
      id, 
      `Status atualizado manualmente para "${status}"`,
      JSON.stringify({
        status,
        updated_by: 'admin',
        updated_at: new Date().toISOString()
      })
    ]);
    
    console.log(`[${new Date().toISOString()}] Status do pedido atualizado com sucesso para: ${status}`);
    
    return res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso',
      pedido: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao atualizar status do pedido',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 