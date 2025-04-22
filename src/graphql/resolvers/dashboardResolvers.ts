import axios from 'axios';
import { QueryResolvers } from '../../types/graphql';

// Configuração das APIs
const pagamentosApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ordersApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Função para calcular crescimento percentual
const calcularCrescimento = (atual: number, anterior: number): number => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
};

// Funções auxiliares para buscar dados de estatísticas
async function obterEstatisticasPedidos() {
  try {
    console.log('[API:Dashboard] Buscando estatísticas de pedidos');
    
    const response = await ordersApi.get('/api/stats/overview', {
      params: {
        period: 30
      }
    });
    
    if (!response.data) {
      throw new Error('Não foi possível obter estatísticas de pedidos');
    }
    
    const dados = response.data;
    
    return {
      total: dados.total || 0,
      completados: dados.completed || 0,
      processando: dados.processing || 0,
      pendentes: dados.pending || 0,
      falhas: dados.failed || 0,
      valorTotal: dados.total_value || 0,
      crescimento: dados.growth || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    return {
      total: 0,
      completados: 0,
      processando: 0,
      pendentes: 0,
      falhas: 0,
      valorTotal: 0,
      crescimento: 0
    };
  }
}

async function obterEstatisticasTransacoes() {
  try {
    console.log('[API:Dashboard] Buscando estatísticas de transações');
    
    const response = await pagamentosApi.get('/api/stats/transactions', {
      params: {
        period: 30
      }
    });
    
    if (!response.data) {
      throw new Error('Não foi possível obter estatísticas de transações');
    }
    
    const dados = response.data;
    
    return {
      total: dados.total || 0,
      aprovadas: dados.approved || 0,
      pendentes: dados.pending || 0,
      recusadas: dados.declined || 0,
      valorTotal: dados.total_amount || 0,
      crescimento: dados.growth || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de transações:', error);
    return {
      total: 0,
      aprovadas: 0,
      pendentes: 0,
      recusadas: 0,
      valorTotal: 0,
      crescimento: 0
    };
  }
}

async function obterEstatisticasUsuarios() {
  try {
    console.log('[API:Dashboard] Buscando estatísticas de usuários');
    
    const response = await pagamentosApi.get('/api/stats/users', {
      headers: {
        'Authorization': `ApiKey ${process.env.PAGAMENTOS_API_KEY}`
      }
    });
    
    if (!response.data) {
      throw new Error('Não foi possível obter estatísticas de usuários');
    }
    
    const dados = response.data;
    
    return {
      total: dados.total || 0,
      ativos: dados.active || 0,
      novos: dados.new || 0,
      crescimento: dados.growth || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    return {
      total: 0,
      ativos: 0,
      novos: 0,
      crescimento: 0
    };
  }
}

async function obterTransacoesPorPeriodo(dias = 7) {
  try {
    console.log(`[API:Dashboard] Buscando transações por período (${dias} dias)`);
    
    const response = await pagamentosApi.get('/api/stats/transactions/daily', {
      params: {
        days: dias
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }
    
    return response.data.map((item: any) => ({
      data: item.date,
      total: item.count || 0,
      valorAprovado: item.approved_amount || 0
    }));
  } catch (error) {
    console.error(`Erro ao obter transações por período (${dias} dias):`, error);
    return [];
  }
}

async function obterPedidosPorPeriodo(dias = 7) {
  try {
    console.log(`[API:Dashboard] Buscando pedidos por período (${dias} dias)`);
    
    const response = await ordersApi.get('/api/stats/orders/daily', {
      params: {
        days: dias
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }
    
    return response.data.map((item: any) => ({
      data: item.date,
      total: item.count || 0,
      completos: item.completed || 0,
      falhas: item.failed || 0
    }));
  } catch (error) {
    console.error(`Erro ao obter pedidos por período (${dias} dias):`, error);
    return [];
  }
}

async function obterAtividadesRecentes(limite = 10) {
  try {
    console.log(`[API:Dashboard] Buscando atividades recentes (limite ${limite})`);
    
    const [pedidosResponse, transacoesResponse] = await Promise.all([
      ordersApi.get('/orders/list', {
        params: {
          limit: limite,
          page: 1
        }
      }),
      pagamentosApi.get('/transactions/list', {
        params: {
          limit: limite,
          page: 1
        }
      })
    ]);
    
    const pedidos = (pedidosResponse.data?.orders || []).map((p: any) => ({
      tipo: 'pedido',
      id: p.id,
      data: p.created_at,
      usuario: p.customer_name || 'N/A',
      item: p.service_name || 'N/A',
      status: p.status,
      valor: p.price
    }));
    
    const transacoes = (transacoesResponse.data?.transactions || []).map((t: any) => ({
      tipo: 'transacao',
      id: t.id,
      data: t.created_at,
      usuario: t.payment_request?.customer_name || 'N/A',
      item: t.payment_request?.service_name || 'N/A',
      status: t.status,
      valor: t.amount
    }));
    
    // Mapear status para português
    const mapearStatus = (status: string, tipo: string) => {
      const statusMap: {[key: string]: string} = {
        'completed': 'concluído',
        'pending': 'pendente',
        'processing': 'processando',
        'failed': 'falha',
        'approved': 'aprovado',
        'rejected': 'rejeitado'
      };
      return statusMap[status] || status;
    };
    
    // Processar registros com status traduzidos
    const pedidosProcessados = pedidos.map(p => ({
      ...p,
      status: mapearStatus(p.status, 'pedido')
    }));
    
    const transacoesProcessadas = transacoes.map(t => ({
      ...t,
      status: mapearStatus(t.status, 'transacao')
    }));
    
    // Combinar resultados e ordenar por data
    const atividades = [
      ...pedidosProcessados,
      ...transacoesProcessadas
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limite);
    
    return atividades;
  } catch (error) {
    console.error('Erro ao obter atividades recentes:', error);
    return [];
  }
}

export const dadosDashboard = async (_: any, __: any, context: { token: string }) => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const response = await axios.get(`${apiUrl}/api/dashboard`, {
      headers: {
        Authorization: `Bearer ${context.token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    // Retorna estrutura padrão com zeros em caso de erro
    return {
      stats: {
        totalTransacoes: 0,
        totalPedidos: 0,
        totalUsuarios: 0,
        crescimentoTransacoes: 0,
        crescimentoPedidos: 0,
        crescimentoUsuarios: 0
      },
      graficoTransacoes: [],
      graficoPedidos: [],
      graficoUsuarios: [],
      atividadesRecentes: []
    };
  }
}; 