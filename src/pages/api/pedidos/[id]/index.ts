import { NextApiRequest, NextApiResponse } from 'next';
import { buscarPedidoPorId } from '../../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    console.log(`[${new Date().toISOString()}] API /pedidos/${id} - Buscando detalhes do pedido`);
    
    const pedido = await buscarPedidoPorId(id);
    
    if (!pedido) {
      console.log(`[${new Date().toISOString()}] API /pedidos/${id} - Pedido não encontrado`);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    console.log(`[${new Date().toISOString()}] API /pedidos/${id} - Detalhes do pedido obtidos com sucesso`);
    return res.status(200).json(pedido);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API /pedidos/${id} - Erro ao buscar detalhes do pedido:`, error);
    return res.status(500).json({ 
      message: 'Erro ao buscar detalhes do pedido', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}