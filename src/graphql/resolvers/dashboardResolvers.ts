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
    
    const response = await ordersApi.get('/stats/overview', {
      params: {
        period: 30
      }
    });
    
    if (!response.data) {
      throw new Error('Não foi possível obter estatísticas de pedidos');
    }
    
    const dados = response.data;
    
    return {
      total_pedidos: dados.total || 0,
      total_completos: dados.completed || 0,
      total_processando: dados.processing || 0,
      total_pendentes: dados.pending || 0,
      total_falhas: dados.failed || 0,
      valor_total: dados.total_value || 0,
      crescimento: dados.growth || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    return {
      total_pedidos: 0,
      total_completos: 0,
      total_processando: 0,
      total_pendentes: 0,
      total_falhas: 0,
      valor_total: 0,
      crescimento: 0
    };
  }
}

async function obterEstatisticasTransacoes() {
  try {
    console.log('[API:Dashboard] Buscando estatísticas de transações');
    
    const response = await pagamentosApi.get('/stats/transactions', {
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
    
    const response = await pagamentosApi.get('/stats/users', {
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
    
    const response = await pagamentosApi.get('/stats/transactions/daily', {
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
    
    const response = await ordersApi.get('/stats/orders/daily', {
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
    
    // Combinar resultados e ordenar por data
    const atividades = [
      ...pedidos,
      ...transacoes
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limite);
    
    return atividades;
  } catch (error) {
    console.error('Erro ao obter atividades recentes:', error);
    return [];
  }
}

interface DashboardData {
  estatisticas: {
    transacoes: {
      total: number;
      crescimento: number;
      valorTotal: number;
    };
    pedidos: {
      total: number;
      crescimento: number;
      completados: number;
      pendentes: number;
      falhas: number;
    };
    usuarios: {
      total: number;
      crescimento: number;
      novos: number;
    };
  };
  graficos: {
    transacoesPorDia: Array<{
      data: string;
      total: number;
      valorAprovado: number;
    }>;
    statusPedidos: {
      labels: string[];
      dados: number[];
    };
  };
  atividades: Array<{
    id: string;
    tipo: string;
    usuario: string;
    item: string;
    status: string;
    data: string;
  }>;
  ultimaAtualizacao: string;
}

const dashboardResolvers = {
  Query: {
    dadosDashboard: async (): Promise<DashboardData> => {
      // Dados simulados de dashboard para exibição
      return {
        estatisticas: {
          transacoes: {
            total: 156,
            crescimento: 12.5,
            valorTotal: 2845790 // em centavos (R$ 28.457,90)
          },
          pedidos: {
            total: 142,
            crescimento: 8.3,
            completados: 115,
            pendentes: 18,
            falhas: 9
          },
          usuarios: {
            total: 87,
            crescimento: 15.2,
            novos: 12
          }
        },
        graficos: {
          transacoesPorDia: [
            { data: '2023-06-01', total: 15, valorAprovado: 148900 },
            { data: '2023-06-02', total: 18, valorAprovado: 205720 },
            { data: '2023-06-03', total: 25, valorAprovado: 310550 },
            { data: '2023-06-04', total: 22, valorAprovado: 270330 },
            { data: '2023-06-05', total: 27, valorAprovado: 395100 },
            { data: '2023-06-06', total: 24, valorAprovado: 310220 },
            { data: '2023-06-07', total: 25, valorAprovado: 345780 }
          ],
          statusPedidos: {
            labels: ['Completos', 'Processando', 'Pendentes', 'Falhas'],
            dados: [115, 32, 18, 9]
          }
        },
        atividades: [
          {
            id: '1',
            tipo: 'pedido',
            usuario: 'cliente@exemplo.com',
            item: 'Seguidores Instagram',
            status: 'aprovado',
            data: '2023-06-07T14:32:45Z'
          },
          {
            id: '2',
            tipo: 'transacao',
            usuario: 'marcos@empresa.com',
            item: 'R$ 159,90',
            status: 'aprovado',
            data: '2023-06-07T10:15:22Z'
          },
          {
            id: '3',
            tipo: 'usuario',
            usuario: 'novocliente@gmail.com',
            item: 'Cadastro',
            status: 'concluído',
            data: '2023-06-06T18:45:12Z'
          },
          {
            id: '4',
            tipo: 'pedido',
            usuario: 'empresa@contato.com',
            item: 'Likes Facebook',
            status: 'processando',
            data: '2023-06-06T16:20:33Z'
          },
          {
            id: '5',
            tipo: 'transacao',
            usuario: 'carla@exemplo.net',
            item: 'R$ 89,90',
            status: 'pendente',
            data: '2023-06-06T09:12:05Z'
          }
        ],
        ultimaAtualizacao: new Date().toISOString()
      };
    }
  }
};

export default dashboardResolvers; 