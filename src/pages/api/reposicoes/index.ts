import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL dos microsserviços
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'http://localhost:4000/api';
const PAGAMENTOS_API_URL = process.env.PAGAMENTOS_API_URL || 'http://localhost:3001/api';
const ORDERS_API_KEY = process.env.ORDERS_API_KEY || '';
const REPOSICAO_API_KEY = process.env.REPOSICAO_API_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método da requisição
  if (req.method === 'GET') {
    try {
      // Buscar reposições do serviço de orders
      const response = await axios.get(`${ORDERS_API_URL}/reposicoes`, {
        params: req.query,
        headers: {
          'Authorization': `Bearer ${ORDERS_API_KEY}`
        }
      });
      
      // Retornar a resposta
      return res.status(200).json(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar reposições:', error);
      
      // Retornar erro
      return res.status(error.response?.status || 500).json({
        error: 'Erro ao buscar reposições',
        message: error.response?.data?.message || error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      // Criar uma nova reposição
      const { orderId, motivo, observacoes } = req.body;
      
      // Validar dados obrigatórios
      if (!orderId) {
        return res.status(400).json({
          error: 'ID do pedido é obrigatório'
        });
      }
      
      if (!motivo) {
        return res.status(400).json({
          error: 'Motivo é obrigatório'
        });
      }
      
      // Chamar a API de orders para criar a reposição
      const response = await axios.post(`${ORDERS_API_URL}/reposicoes`, {
        order_id: orderId,
        motivo,
        observacoes: observacoes || 'Solicitado via painel administrativo'
      }, {
        headers: {
          'Authorization': `Bearer ${REPOSICAO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Retornar a resposta
      return res.status(201).json(response.data);
    } catch (error: any) {
      console.error('Erro ao criar reposição:', error);
      
      // Retornar erro
      return res.status(error.response?.status || 500).json({
        error: 'Erro ao criar reposição',
        message: error.response?.data?.message || error.message
      });
    }
  } else {
    // Método não permitido
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['GET', 'POST']
    });
  }
} 