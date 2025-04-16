import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL dos microsserviços
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:4000/api';
const ORDERS_API_KEY = process.env.ORDERS_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Somente método GET permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['GET']
    });
  }
  
  try {
    // Buscar estatísticas de reposições do serviço de orders
    const response = await axios.get(`${ORDERS_API_URL}/reposicoes/stats`, {
      headers: {
        'Authorization': `Bearer ${ORDERS_API_KEY}`
      }
    });
    
    // Verificar se a resposta contém dados de estatísticas
    if (response.data && response.data.stats) {
      return res.status(200).json(response.data.stats);
    }
    
    // Se não há estatísticas na resposta, retornar um erro
    return res.status(404).json({
      error: 'Estatísticas de reposições não encontradas'
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de reposições:', error);
    
    // Retornar erro
    return res.status(error.response?.status || 500).json({
      error: 'Erro ao buscar estatísticas de reposições',
      message: error.response?.data?.message || error.message
    });
  }
} 