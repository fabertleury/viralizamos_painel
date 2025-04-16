import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL dos microsserviços
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:4000/api';
const PAGAMENTOS_API_URL = process.env.PAGAMENTOS_API_URL || 'http://localhost:3001/api';
const ORDERS_API_KEY = process.env.ORDERS_API_KEY || '';
const REPOSICAO_API_KEY = process.env.REPOSICAO_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  // Verificar método da requisição
  if (req.method === 'GET') {
    try {
      // Buscar reposição específica no serviço de orders
      const response = await axios.get(`${ORDERS_API_URL}/reposicoes/${id}`, {
        headers: {
          'Authorization': `Bearer ${ORDERS_API_KEY}`
        }
      });
      
      // Retornar a resposta
      return res.status(200).json(response.data);
    } catch (error: any) {
      console.error(`Erro ao buscar reposição ${id}:`, error);
      
      // Retornar erro
      return res.status(error.response?.status || 500).json({
        error: 'Erro ao buscar reposição',
        message: error.response?.data?.message || error.message
      });
    }
  } else if (req.method === 'PUT') {
    try {
      // Atualizar reposição
      const { status, resposta } = req.body;
      
      // Chamar a API de orders para atualizar a reposição
      const response = await axios.put(`${ORDERS_API_URL}/reposicoes/${id}`, {
        status,
        resposta,
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
      console.error(`Erro ao atualizar reposição ${id}:`, error);
      
      // Retornar erro
      return res.status(error.response?.status || 500).json({
        error: 'Erro ao atualizar reposição',
        message: error.response?.data?.message || error.message
      });
    }
  } else {
    // Método não permitido
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['GET', 'PUT']
    });
  }
} 