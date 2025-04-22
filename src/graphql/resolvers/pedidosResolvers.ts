import axios from 'axios';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroInput {
  status?: string;
  provedor?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

// Configuração da API de orders
const ordersApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const pedidosResolvers = {
  Query: {
    pedidos: async (_: any, { filtro, paginacao }: { filtro?: FiltroInput, paginacao: PaginacaoInput }) => {
      try {
        const { pagina, limite } = paginacao;
        
        // Construir parâmetros para a requisição à API
        const params: Record<string, any> = {
          page: pagina,
          limit: limite
        };

        // Adicionar filtros, se existirem
        if (filtro) {
          if (filtro.status && filtro.status !== 'todos') {
            params.status = filtro.status;
          }
          
          if (filtro.provedor && filtro.provedor !== 'todos') {
            params.provider = filtro.provedor;
          }
          
          if (filtro.termoBusca) {
            params.search = filtro.termoBusca;
          }
          
          if (filtro.dataInicio) {
            params.startDate = filtro.dataInicio;
          }
          
          if (filtro.dataFim) {
            params.endDate = filtro.dataFim;
          }
        }
        
        console.log(`[API:Pedidos] Tentando API REST: ${ordersApi.defaults.baseURL}/api/orders/list`);
        
        // Chamar a API de pedidos
        const response = await ordersApi.get('/api/orders/list', { params });
        
        const orders = response.data.orders || [];
        const total = response.data.total || 0;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        const pedidos = orders.map((o: any) => ({
          id: o.id,
          dataCriacao: o.created_at,
          provedorId: o.provider_id,
          provedorNome: o.provider_name,
          produtoId: o.service_id,
          produtoNome: o.service_name,
          quantidade: o.quantity,
          valor: o.price,
          status: o.status,
          clienteId: o.user_id,
          clienteNome: o.customer_name,
          clienteEmail: o.customer_email,
          transacaoId: o.transaction_id,
          providerOrderId: o.provider_order_id,
          resposta: o.api_response,
          erro: o.error_message,
          ultimaVerificacao: o.last_check
        }));
        
        return {
          pedidos,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        throw new Error('Erro ao buscar pedidos da API');
      }
    },
    
    pedido: async (_: any, { id }: { id: string }) => {
      try {
        console.log(`[API:Pedido] Tentando buscar pedido ${id} via API REST`);
        
        // Buscar pedido por ID
        const response = await ordersApi.get(`/api/orders/${id}`);
        
        if (!response.data || response.data.error) {
          return null;
        }
        
        const o = response.data;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        return {
          id: o.id,
          dataCriacao: o.created_at,
          provedorId: o.provider_id,
          provedorNome: o.provider_name,
          produtoId: o.service_id,
          produtoNome: o.service_name,
          quantidade: o.quantity,
          valor: o.price,
          status: o.status,
          clienteId: o.user_id,
          clienteNome: o.customer_name,
          clienteEmail: o.customer_email,
          transacaoId: o.transaction_id,
          providerOrderId: o.provider_order_id,
          resposta: o.api_response,
          erro: o.error_message,
          ultimaVerificacao: o.last_check
        };
      } catch (error) {
        console.error(`Erro ao buscar pedido ${id}:`, error);
        throw new Error(`Erro ao buscar pedido ${id} da API`);
      }
    },
    
    provedores: async () => {
      try {
        console.log(`[API:Provedores] Tentando API REST: ${ordersApi.defaults.baseURL}/api/providers/list`);
        
        // Buscar lista de provedores
        const response = await ordersApi.get('/api/providers/list');
        
        const providers = response.data || [];
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        return providers.map((p: any) => ({
          id: p.id,
          nome: p.name,
          tipo: p.type,
          status: p.status,
          saldo: p.balance
        }));
      } catch (error) {
        console.error('Erro ao buscar provedores:', error);
        throw new Error('Erro ao buscar provedores da API');
      }
    }
  },
  
  Mutation: {
    reenviarPedido: async (_: any, { id }: { id: string }) => {
      try {
        console.log(`[API:ReenviarPedido] Tentando API REST: ${ordersApi.defaults.baseURL}/api/orders/${id}/retry`);
        
        // Chamar API para reenviar pedido
        const response = await ordersApi.post(`/api/orders/${id}/retry`);
        
        if (response.data.error) {
          return {
            sucesso: false,
            mensagem: response.data.error
          };
        }
        
        return {
          sucesso: true,
          mensagem: response.data.message || `Pedido ${id} marcado para reprocessamento`
        };
      } catch (error: any) {
        console.error(`Erro ao reenviar pedido ${id}:`, error);
        return {
          sucesso: false,
          mensagem: `Erro ao reenviar pedido: ${error.message}`
        };
      }
    }
  }
}; 