import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL dos microsserviços
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:4000/api';
const REPOSICAO_API_KEY = process.env.REPOSICAO_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  // Somente método POST permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['POST']
    });
  }
  
  try {
    // Processar reposição manualmente no serviço de orders
    const response = await axios.post(`${ORDERS_API_URL}/reposicoes/${id}/process`, {
      processado_por: 'admin'  // Indicar que foi processado pelo painel admin
    }, {
      headers: {
        'Authorization': `Bearer ${REPOSICAO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Retornar a resposta
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error(`Erro ao processar reposição ${id}:`, error);
    
    // Retornar erro
    return res.status(error.response?.status || 500).json({
      error: 'Erro ao processar reposição',
      message: error.response?.data?.message || error.message
    });
  }
} 