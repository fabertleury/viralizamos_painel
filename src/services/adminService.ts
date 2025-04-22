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
    
    // Tentar primeiro com a API de orders
    try {
      const response = await ordersApi.get(`/api/api/admin/panel-users?${params.toString()}`);
      return response.data;
    } catch (ordersError) {
      console.error('Erro ao buscar usuários via API de orders:', ordersError);
      
      // Fallback para API local
      const response = await axios.get(`/api/admin/panel-users?${params.toString()}`);
      return response.data;
    }
  } catch (error) {
    console.error('Erro ao buscar usuários detalhados:', error);
    throw new Error(handleApiError(error));
  }
} 