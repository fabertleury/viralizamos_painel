import { NextApiRequest, NextApiResponse } from 'next';
import { reenviarPedido } from '../../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID de pedido inválido' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const sucesso = await reenviarPedido(id);
    
    if (sucesso) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Não foi possível reenviar o pedido. Verifique se o status está correto.' 
      });
    }
  } catch (error) {
    console.error(`Erro ao reenviar pedido ${id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Erro ao reenviar pedido ${id}` 
    });
  }
} 