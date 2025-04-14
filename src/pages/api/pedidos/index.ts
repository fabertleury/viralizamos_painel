import { NextApiRequest, NextApiResponse } from 'next';
import { buscarPedidos } from '../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { 
      status, 
      provedor, 
      dataInicio, 
      dataFim, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    const filtros: any = {};
    
    if (status && status !== 'todos') {
      filtros.status = status;
    }
    
    if (provedor && provedor !== 'todos') {
      filtros.provedor = provedor;
    }
    
    if (dataInicio) {
      filtros.dataInicio = dataInicio;
    }
    
    if (dataFim) {
      filtros.dataFim = dataFim;
    }
    
    if (termoBusca) {
      filtros.termoBusca = termoBusca;
    }
    
    const resultado = await buscarPedidos(
      filtros, 
      parseInt(pagina as string), 
      parseInt(limite as string)
    );
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ message: 'Erro ao buscar pedidos' });
  }
} 