import axios from 'axios';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroTransacaoInput {
  status?: string;
  metodo?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

// Configuração da API de pagamentos
const pagamentosApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const transacoesResolvers = {
  Query: {
    transacoes: async (_: any, { filtro, paginacao }: { filtro?: FiltroTransacaoInput, paginacao: PaginacaoInput }) => {
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
          
          if (filtro.metodo && filtro.metodo !== 'todos') {
            params.method = filtro.metodo;
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
        
        console.log(`[API:Transacoes] Tentando API REST: ${pagamentosApi.defaults.baseURL}/transactions/list`);
        
        // Chamar a API de transações
        const response = await pagamentosApi.get('/transactions/list', { params });
        
        const transactions = response.data.transactions || [];
        const total = response.data.total || 0;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        const transacoes = transactions.map((t: any) => ({
          id: t.id,
          dataCriacao: t.created_at,
          valor: t.amount,
          status: t.status.toUpperCase(),
          metodoPagamento: t.method.toUpperCase(),
          cliente: {
            id: t.payment_request?.customer_id || '',
            nome: t.payment_request?.customer_name || '',
            email: t.payment_request?.customer_email || '',
            telefone: t.payment_request?.customer_phone || '',
            documento: t.payment_request?.customer_document || ''
          },
          produto: {
            id: t.payment_request?.service_id || '',
            nome: t.payment_request?.service_name || '',
            descricao: t.payment_request?.service_description || ''
          },
          orderId: t.external_id || '',
          externalId: t.external_id || ''
        }));
        
        return {
          transacoes,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar transações:', error);
        throw new Error('Erro ao buscar transações da API');
      }
    },
    
    transacao: async (_: any, { id }: { id: string }) => {
      try {
        console.log(`[API:Transacao] Tentando buscar transação ${id} via API REST`);
        
        // Buscar transação por ID
        const response = await pagamentosApi.get(`/transactions/${id}`);
        
        if (!response.data || response.data.error) {
          return null;
        }
        
        const t = response.data;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        return {
          id: t.id,
          dataCriacao: t.created_at,
          valor: t.amount,
          status: t.status.toUpperCase(),
          metodoPagamento: t.method.toUpperCase(),
          clienteId: t.customer?.id || '',
          clienteNome: t.customer?.name || t.customer_name || '',
          clienteEmail: t.customer?.email || t.customer_email || '',
          produtoId: '',
          produtoNome: t.payment_request?.service_name || '',
          orderId: t.external_id || ''
        };
      } catch (error) {
        console.error(`Erro ao buscar transação ${id}:`, error);
        throw new Error(`Erro ao buscar transação ${id} da API`);
      }
    }
  },
  
  Mutation: {
    // Mutations para transações podem ser adicionadas aqui, se necessárias
  }
}; 