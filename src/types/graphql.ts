import { GraphQLResolveInfo } from 'graphql';

export interface QueryResolvers {
  dadosDashboard: (_: any, __: any, context: { token: string }) => Promise<DashboardData>;
}

export interface DashboardData {
  stats: {
    totalTransacoes: number;
    totalPedidos: number;
    totalUsuarios: number;
    crescimentoTransacoes: number;
    crescimentoPedidos: number;
    crescimentoUsuarios: number;
  };
  graficoTransacoes: Array<{
    data: string;
    valor: number;
  }>;
  graficoPedidos: Array<{
    data: string;
    quantidade: number;
  }>;
  graficoUsuarios: Array<{
    data: string;
    quantidade: number;
  }>;
  atividadesRecentes: Array<{
    id: string;
    tipo: string;
    usuario: string;
    descricao: string;
    data: string;
    valor?: number;
  }>;
} 