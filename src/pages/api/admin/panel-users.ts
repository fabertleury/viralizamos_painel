import { NextApiRequest, NextApiResponse } from 'next';
import { ordersApi } from '@/services/api';

/**
 * API route que serve como proxy para o endpoint de usuários detalhados.
 * Este endpoint chama o endpoint do serviço de orders e retorna os dados.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido', message: 'Este endpoint só aceita requisições GET' });
  }

  try {
    // Extrair parâmetros de query
    const { search, role, page, limit } = req.query;
    
    // Construir parâmetros para a requisição
    const params = new URLSearchParams();
    
    if (search) {
      params.append('search', String(search));
    }
    
    if (role) {
      params.append('role', String(role));
    }
    
    if (page) {
      params.append('page', String(page));
    }
    
    if (limit) {
      params.append('limit', String(limit));
    }
    
    // Log para debug
    console.log('Buscando usuários detalhados com parâmetros:', Object.fromEntries(params));
    
    // Tentar buscar dados da API de orders
    try {
      const response = await ordersApi.get(`/api/api/admin/panel-users?${params.toString()}`);
      return res.status(200).json(response.data);
    } catch (ordersError: any) {
      console.error('Erro ao buscar da API de orders:', ordersError.message);
      
      // Se não conseguir, verificar se temos o token de autorização
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: 'Não autorizado',
          message: 'Token de autorização não fornecido'
        });
      }
      
      // Tentar buscar diretamente da API usando o token fornecido
      const directResponse = await fetch(
        `${process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com'}/api/api/admin/panel-users?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!directResponse.ok) {
        throw new Error(`Erro na API direta: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      const data = await directResponse.json();
      return res.status(200).json(data);
    }
  } catch (error: any) {
    console.error('Erro ao buscar usuários detalhados:', error);
    
    // Retornar dados mock para não quebrar a UI em caso de erro
    return res.status(500).json({
      error: 'Erro ao buscar usuários',
      message: error.message || 'Erro desconhecido',
      users: [],
      page: 1,
      totalPages: 0,
      totalItems: 0,
    });
  }
} 