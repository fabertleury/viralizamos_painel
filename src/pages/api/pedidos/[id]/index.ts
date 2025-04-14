import { NextApiRequest, NextApiResponse } from 'next';
import { buscarPedidoPorId } from '../../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID de pedido inválido' });
  }

  if (req.method === 'GET') {
    try {
      const pedido = await buscarPedidoPorId(id);
      
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }
      
      res.status(200).json(pedido);
    } catch (error) {
      console.error(`Erro ao buscar pedido ${id}:`, error);
      res.status(500).json({ message: `Erro ao buscar pedido ${id}` });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
} 