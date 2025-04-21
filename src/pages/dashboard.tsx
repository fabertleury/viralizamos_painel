import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_DATA } from '../graphql/queries';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/Layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatCurrency, formatDate } from '../utils/format';
import { Box, Spinner, Text } from '@chakra-ui/react';

// Importação dinâmica dos componentes de gráfico para evitar problemas de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Interface para dados de atividade
interface Atividade {
  id: string;
  tipo: string;
  usuario: string;
  item: string;
  status: string;
  data: string;
}

// Componente de Dashboard protegido por autenticação
const DashboardPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Verificar autenticação no localStorage também para garantir consistência
  const [isLocalStorageAuthenticated, setIsLocalStorageAuthenticated] = useState(false);
  
  // Verificar autenticação local
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkLocalAuth = () => {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        setIsLocalStorageAuthenticated(!!token && !!user);
      };
      
      checkLocalAuth();
      setIsMounted(true);
      
      // Se não estiver autenticado, redirecionar para login
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      if (!token || !user) {
        window.location.href = '/login';
      }
    }
  }, []);
  
  // Determinar se realmente está autenticado usando ambas as fontes de verdade
  const isActuallyAuthenticated = isAuthenticated || isLocalStorageAuthenticated;
  
  // Usar GraphQL para buscar dados apenas se estiver autenticado
  const { loading, error, data } = useQuery(GET_DASHBOARD_DATA, {
    skip: !isActuallyAuthenticated || !isMounted || authLoading,
  });
  
  const dashboardData = data?.dadosDashboard || null;
  
  // Mostrar estado de carregamento se qualquer uma das condições de carregamento for verdadeira
  if (!isMounted || authLoading || (!isActuallyAuthenticated && !isLocalStorageAuthenticated)) {
    return (
      <AdminLayout>
        <Box p={5} textAlign="center">
          <Spinner size="xl" />
          <Text mt={4}>Carregando...</Text>
        </Box>
      </AdminLayout>
    );
  }
  
  // Redirecionar se não estiver autenticado
  if (!isActuallyAuthenticated && isMounted && !authLoading) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Configuração do gráfico de transações
  const transacoesChartOptions = {
    chart: {
      type: 'area' as const,
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: dashboardData?.graficos.transacoesPorDia?.map((item: { data: string }) => 
        new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ) || [],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    tooltip: {
      x: {
        format: 'dd/MM',
      },
    },
    yaxis: {
      labels: {
        formatter: function(val: number) {
          return Math.round(val).toString();
        },
      },
    },
  };

  const transacoesChartSeries = [
    {
      name: 'Transações',
      data: dashboardData?.graficos.transacoesPorDia?.map((item: { total: number }) => item.total) || [],
    },
    {
      name: 'Valor (R$)',
      data: dashboardData?.graficos.transacoesPorDia?.map((item: { valorAprovado: number }) => item.valorAprovado / 100) || [],
    },
  ];

  // Configuração do gráfico de status de pedidos
  const pedidosChartOptions = {
    chart: {
      type: 'pie' as const,
    },
    labels: dashboardData?.graficos.statusPedidos?.labels || [],
    colors: ['#48BB78', '#3182CE', '#ECC94B', '#E53E3E'],
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    ],
  };

  const pedidosChartSeries = dashboardData?.graficos.statusPedidos?.dados || [];

  // Renderizar o conteúdo do dashboard
  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="p-4">
          <div className="h-10 w-48 bg-gray-200 rounded mb-6 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array(3).fill(0).map((_, i) => (
              <div 
                key={i} 
                className={`bg-gray-200 rounded-lg animate-pulse ${
                  i === 2 ? 'lg:col-span-2' : ''
                } h-${i === 2 ? '64' : '80'}`}
              ></div>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <div className="text-red-500 text-lg mb-4">
            {error.message || 'Ocorreu um erro ao carregar os dados do dashboard.'}
          </div>
          <div>Por favor, tente novamente mais tarde.</div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card de Transações */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Transações</div>
              <div className="text-3xl font-semibold mt-2">{dashboardData?.estatisticas.transacoes.total || 0}</div>
              <div className="text-sm text-gray-500 mt-2 flex items-center">
                <span className={`mr-1 ${(dashboardData?.estatisticas.transacoes.crescimento || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(dashboardData?.estatisticas.transacoes.crescimento || 0) >= 0 ? '↑' : '↓'}
                </span>
                {Math.abs(dashboardData?.estatisticas.transacoes.crescimento || 0)}% em relação ao mês anterior
              </div>
            </CardContent>
          </Card>

          {/* Card de Pedidos */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Pedidos</div>
              <div className="text-3xl font-semibold mt-2">{dashboardData?.estatisticas.pedidos.total || 0}</div>
              <div className="text-sm text-gray-500 mt-2 flex items-center">
                <span className={`mr-1 ${(dashboardData?.estatisticas.pedidos.crescimento || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(dashboardData?.estatisticas.pedidos.crescimento || 0) >= 0 ? '↑' : '↓'}
                </span>
                {Math.abs(dashboardData?.estatisticas.pedidos.crescimento || 0)}% em relação ao mês anterior
              </div>
            </CardContent>
          </Card>

          {/* Card de Usuários */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Usuários</div>
              <div className="text-3xl font-semibold mt-2">{dashboardData?.estatisticas.usuarios.total || 0}</div>
              <div className="text-sm text-gray-500 mt-2 flex items-center">
                <span className={`mr-1 ${(dashboardData?.estatisticas.usuarios.crescimento || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(dashboardData?.estatisticas.usuarios.crescimento || 0) >= 0 ? '↑' : '↓'}
                </span>
                {Math.abs(dashboardData?.estatisticas.usuarios.crescimento || 0)}% em relação ao mês anterior
              </div>
            </CardContent>
          </Card>

          {/* Card de Receita */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Receita (R$)</div>
              <div className="text-3xl font-semibold mt-2">
                {formatCurrency((dashboardData?.estatisticas.transacoes.valorTotal || 0) / 100)}
              </div>
              <div className="text-sm text-gray-500 mt-2 flex items-center">
                <span className={`mr-1 ${(dashboardData?.estatisticas.transacoes.crescimento || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(dashboardData?.estatisticas.transacoes.crescimento || 0) >= 0 ? '↑' : '↓'}
                </span>
                {Math.abs(dashboardData?.estatisticas.transacoes.crescimento || 0)}% em relação ao mês anterior
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Transações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transações (últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== 'undefined' && (
                <Chart
                  options={transacoesChartOptions}
                  series={transacoesChartSeries}
                  type="area"
                  height={220}
                />
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Status de Pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof window !== 'undefined' && (
                <Chart
                  options={pedidosChartOptions}
                  series={pedidosChartSeries}
                  type="pie"
                  height={220}
                />
              )}
            </CardContent>
          </Card>

          {/* Atividades Recentes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {dashboardData?.atividadesRecentes?.map((atividade: Atividade, index: number) => (
                  <li key={`${atividade.tipo}-${atividade.id}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <Badge 
                          className={
                            atividade.tipo === 'pedido'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {atividade.tipo === 'pedido' ? 'Pedido' : 'Transação'}
                        </Badge>
                        <span className="font-medium ml-2">{atividade.usuario}</span>{' '}
                        {atividade.tipo === 'pedido' ? 'comprou' : 'pagou'}{' '}
                        <span className="font-medium">{atividade.item}</span>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            atividade.status === 'sucesso' || atividade.status === 'aprovado'
                              ? 'bg-green-100 text-green-800'
                              : atividade.status === 'pendente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {atividade.status}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(new Date(atividade.data), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    {index < (dashboardData.atividadesRecentes?.length || 0) - 1 && (
                      <hr className="mt-2 border-gray-200" />
                    )}
                  </li>
                ))}
                {(!dashboardData?.atividadesRecentes || dashboardData.atividadesRecentes.length === 0) && (
                  <div className="text-gray-500">Nenhuma atividade recente encontrada.</div>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return <AdminLayout>{renderDashboard()}</AdminLayout>;
};

// Export do componente usando dynamic para evitar erros de SSR
export default dynamic(() => Promise.resolve(DashboardPage), {
  ssr: false
}); 