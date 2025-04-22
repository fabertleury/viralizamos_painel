import axios from 'axios';
import { ordersApi, handleApiError } from './api';

/**
 * Interface para métricas detalhadas de usuário
 */
export interface UserMetrics {
  orders_count: number;
  total_spent: number;
  last_purchase: {
    id: string;
    date: string;
    status: string;
    amount: number;
  } | null;
  top_services: Array<{
    service_name: string;
    count: number;
  }>;
  purchase_frequency: number | null;
  avg_order_value: number;
}

/**
 * Interface para usuário com métricas detalhadas
 */
export interface DetailedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  metrics: UserMetrics;
}

/**
 * Interface para resposta paginada da API
 */
export interface PaginatedUsersResponse {
  users: DetailedUser[];
  page: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Busca usuários detalhados com métricas do endpoint do painel admin
 * @param search Termo de busca para filtrar usuários
 * @param role Filtro por tipo de usuário
 * @param page Número da página (começa em 1)
 * @param limit Quantidade de itens por página
 * @returns Resposta paginada com usuários detalhados
 */
export async function fetchDetailedUsers(
  search?: string,
  role?: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedUsersResponse> {
  try {
    // Obter token de autenticação do localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (!token) {
      throw new Error('Token de autorização não encontrado. Faça login novamente.');
    }
    
    // Construir parâmetros da query
    const params = new URLSearchParams();
    
    if (search) {
      params.append('search', search);
    }
    
    if (role) {
      params.append('role', role);
    }
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    // Configuração do header de autorização
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Tentar primeiro com a API de orders
    try {
      console.log('Tentando acessar a API de orders com token de autorização');
      const response = await ordersApi.get(`/api/api/admin/panel-users?${params.toString()}`, {
        headers: headers
      });
      return response.data;
    } catch (ordersError) {
      console.error('Erro ao buscar usuários via API de orders:', ordersError);
      
      // Fallback para API local
      console.log('Tentando acessar a API local com token de autorização');
      const response = await axios.get(`/api/admin/panel-users?${params.toString()}`, {
        headers: headers
      });
      return response.data;
    }
  } catch (error) {
    console.error('Erro ao buscar usuários detalhados:', error);
    throw new Error(handleApiError(error));
  }
}

/**
 * Busca detalhes de um usuário específico pelo ID
 * @param userId ID do usuário a ser buscado
 * @returns Detalhes do usuário com métricas
 */
export async function fetchUserDetails(userId: string): Promise<DetailedUser> {
  try {
    // Obter token de autenticação do localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (!token) {
      throw new Error('Token de autorização não encontrado. Faça login novamente.');
    }
    
    // Configuração do header de autorização
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`Buscando detalhes do usuário: ${userId}`);
    
    // Tentar primeiro com a API de orders
    try {
      console.log('Tentando acessar a API de orders para detalhes do usuário');
      const response = await ordersApi.get(`/api/api/admin/panel-users/user/${userId}`, {
        headers: headers
      });
      return response.data;
    } catch (ordersError) {
      console.error('Erro ao buscar detalhes do usuário via API de orders:', ordersError);
      
      // Fallback para API local
      console.log('Tentando acessar a API local para detalhes do usuário');
      const response = await axios.get(`/api/usuarios/${userId}/detalhes`, {
        headers: headers
      });
      return response.data;
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    throw new Error(handleApiError(error));
  }
} 