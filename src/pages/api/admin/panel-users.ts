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
    // Obter o token de autorização do cabeçalho
    const authHeader = req.headers.authorization;
    
    // Verificar se existe token de autorização
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Não autorizado',
        message: 'Token de autorização não fornecido ou em formato inválido (deve ser Bearer Token)'
      });
    }
    
    // Extrair o token
    const token = authHeader.substring(7);
    
    // Log para debugging
    console.log('Token recebido:', token.substring(0, 10) + '...');
    
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
    
    // Configurar headers com o token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ApiKey': process.env.ORDERS_API_KEY || process.env.API_KEY || '' // Adicionar API Key para maior segurança
    };
    
    // Tentar buscar dados da API de orders
    try {
      const response = await ordersApi.get(`/api/api/admin/panel-users?${params.toString()}`, {
        headers: headers
      });
      return res.status(200).json(response.data);
    } catch (ordersError: any) {
      console.error('Erro ao buscar da API de orders:', ordersError.message);
      
      // Tentar buscar diretamente da API usando o token fornecido
      console.log('Tentando acesso direto à API de orders');
      try {
        const directResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com'}/api/api/admin/panel-users?${params.toString()}`,
          {
            method: 'GET',
            headers: headers
          }
        );
        
        if (!directResponse.ok) {
          // Se o erro for de autenticação, retornar detalhes específicos
          if (directResponse.status === 401) {
            console.error('Erro de autenticação na API direta:', directResponse.status, directResponse.statusText);
            return res.status(401).json({
              error: 'Não autorizado',
              message: 'Token inválido ou sem permissão para acessar este recurso',
              statusCode: directResponse.status
            });
          }
          
          // Para outros erros
          throw new Error(`Erro na API direta: ${directResponse.status} ${directResponse.statusText}`);
        }
        
        const data = await directResponse.json();
        return res.status(200).json(data);
      } catch (directApiError) {
        console.error('Erro ao tentar acesso direto à API:', directApiError);
        
        // SOLUÇÃO ALTERNATIVA: Usar conexão direta ao banco de dados
        console.log('[API:PanelUsers] Tentando buscar usuários diretamente do banco de dados');
        try {
          // Chamar o endpoint direto que acessa o banco de dados
          const diretaResponse = await fetch(`/api/admin/panel-users-direto?${params.toString()}`);
          
          if (!diretaResponse.ok) {
            throw new Error(`Erro na API direta DB: ${diretaResponse.status} ${diretaResponse.statusText}`);
          }
          
          const diretaData = await diretaResponse.json();
          console.log('[API:PanelUsers] Dados obtidos diretamente do banco de dados');
          return res.status(200).json({
            ...diretaData,
            origem: 'banco_direto'
          });
        } catch (dbError) {
          console.error('[API:PanelUsers] Erro ao buscar do banco de dados:', dbError);
          throw dbError;
        }
      }
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