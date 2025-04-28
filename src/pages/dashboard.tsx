import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import AdminLayout from '../components/Layout/AdminLayout';
import { Card, CardContent } from '../components/ui/card';
import { Box, Spinner, Text, SimpleGrid, Heading, Flex, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, StatGroup, Table, Thead, Tbody, Tr, Th, Td, Badge } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Importação dinâmica dos componentes de gráfico para evitar problemas de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Interface para o tipo de dados retornados pela API
interface DashboardData {
  estatisticas: {
    transacoes: {
      total: number;
      crescimento: number;
      valorTotal: number;
      hoje: {
        total: number;
        valorTotal: number;
        valorAprovado: number;
      };
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
      totalAprovadas: number;
      totalPendentes: number;
      totalRejeitadas: number;
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

// Formatador de moeda que lida com valores indefinidos ou zero
const formatCurrency = (value: number | undefined | null) => {
  const numberValue = value ?? 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numberValue);
};

// Formatador de porcentagem que lida com valores indefinidos ou zero
const formatPercentage = (value: number | undefined | null) => {
  const numberValue = value ?? 0;
  return `${Math.abs(numberValue)}%`;
};

// Formatador de data que lida com valores indefinidos
const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'Data desconhecida';
  
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Componente Dashboard
function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Verificar autenticação e carregar dados
  useEffect(() => {
    // Função para obter valor de cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    
    const token = getCookie('auth_token') || localStorage.getItem('auth_token');
    
    if (!token) {
      // Não autenticado, redirecionar imediatamente para login
      router.replace('/login');
      return;
    }

    // Buscar dados da API
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/dashboard');
        setDashboardData(normalizeData(response.data));
        setError(null);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setError('Falha ao carregar os dados do dashboard. Por favor, tente novamente mais tarde.');
      } finally {
      setLoading(false);
    }
    };

    fetchDashboardData();
  }, [router]);
  
  // Mostrar loading enquanto verifica autenticação ou carrega dados
  if (loading) {
    return (
      <AdminLayout>
        <Box p={5} textAlign="center">
          <Spinner size="xl" />
          <Text mt={4}>Carregando dados do dashboard...</Text>
        </Box>
      </AdminLayout>
    );
  }

  // Mostrar erro se ocorrer
  if (error || !dashboardData) {
    return (
      <AdminLayout>
        <Box p={5} textAlign="center">
          <Heading as="h2" size="md" color="red.500" mb={4}>Erro</Heading>
          <Text>{error || 'Não foi possível carregar os dados do dashboard'}</Text>
        </Box>
      </AdminLayout>
    );
  }

  // Configuração do gráfico de transações
  const transacoesChartOptions = {
    chart: {
      type: 'area' as const,
      toolbar: {
        show: false,
      },
      stacked: false,
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
      categories: dashboardData.graficos.transacoesPorDia.map(item => 
        new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ),
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
      y: {
        formatter: function(value: number, { seriesIndex }: { seriesIndex: number }) {
          if (seriesIndex === 0) return value.toString();
          return formatCurrency(value);
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Quantidade'
        },
        labels: {
          formatter: function(val: number) {
            return Math.round(val).toString();
          },
        },
      },
      {
        opposite: true,
        title: {
          text: 'Valor (R$)'
        },
        labels: {
          formatter: function(val: number) {
            return formatCurrency(val);
          },
        },
      }
    ],
  };

  const transacoesChartSeries = [
    {
      name: 'Total de Transações',
      type: 'column',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.total),
    },
    {
      name: 'Valor Aprovado',
      type: 'line',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.valorAprovado),
    }
  ];

  // Configuração do novo gráfico de status das transações
  const statusTransacoesChartOptions = {
    chart: {
      type: 'bar' as const,
      stacked: true,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
      },
    },
    colors: ['#48BB78', '#ECC94B', '#E53E3E'],
    xaxis: {
      categories: dashboardData.graficos.transacoesPorDia.map(item => 
        new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ),
    },
    legend: {
      position: 'top' as const,
      horizontalAlign: 'left' as const
    },
    tooltip: {
      y: {
        formatter: function(value: number) {
          return value.toString();
        }
      }
    }
  };

  const statusTransacoesChartSeries = [
    {
      name: 'Aprovadas',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.totalAprovadas)
    },
    {
      name: 'Pendentes',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.totalPendentes)
    },
    {
      name: 'Rejeitadas',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.totalRejeitadas)
    }
  ];

    return (
    <AdminLayout>
      <Box p={5}>
        <Heading as="h1" size="xl" mb={6}>Dashboard</Heading>

        {/* Cards de Estatísticas */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={8}>
          {/* Card de Transações do Dia */}
          <Card>
            <CardContent>
              <StatGroup>
                <Stat>
                  <StatLabel>Transações Hoje</StatLabel>
                  <StatNumber>{dashboardData.estatisticas.transacoes.hoje.total}</StatNumber>
                  <StatHelpText>
                    Valor Total: {formatCurrency(dashboardData.estatisticas.transacoes.hoje.valorTotal)}
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

          {/* Card de Valor Aprovado do Dia */}
          <Card>
            <CardContent>
              <StatGroup>
                <Stat>
                  <StatLabel>Valor Aprovado Hoje</StatLabel>
                  <StatNumber>{formatCurrency(dashboardData.estatisticas.transacoes.hoje.valorAprovado)}</StatNumber>
                  <StatHelpText>
                    Taxa de Aprovação: {((dashboardData.estatisticas.transacoes.hoje.valorAprovado / dashboardData.estatisticas.transacoes.hoje.valorTotal) * 100).toFixed(1)}%
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

          {/* Card de Total de Transações */}
          <Card>
            <CardContent>
              <StatGroup>
                <Stat>
                  <StatLabel>Total de Transações</StatLabel>
                  <StatNumber>{dashboardData.estatisticas.transacoes.total}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.estatisticas.transacoes.crescimento >= 0 ? 'increase' : 'decrease'} />
                    {formatPercentage(dashboardData.estatisticas.transacoes.crescimento)}
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

          {/* Card de Valor Total */}
          <Card>
            <CardContent>
              <StatGroup>
                <Stat>
                  <StatLabel>Valor Total</StatLabel>
                  <StatNumber>{formatCurrency(dashboardData.estatisticas.transacoes.valorTotal)}</StatNumber>
                  <StatHelpText>
                    Últimos 30 dias
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          {/* Card de Pedidos */}
          <Card>
            <CardContent className="p-6">
              <StatGroup>
                <Stat>
                  <StatLabel fontSize="sm" color="gray.500">Pedidos</StatLabel>
                  <StatNumber fontSize="3xl">{dashboardData.estatisticas.pedidos.total}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.estatisticas.pedidos.crescimento >= 0 ? 'increase' : 'decrease'} />
                    {Math.abs(dashboardData.estatisticas.pedidos.crescimento)}% em relação ao mês anterior
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

          {/* Card de Usuários */}
          <Card>
            <CardContent className="p-6">
              <StatGroup>
                <Stat>
                  <StatLabel fontSize="sm" color="gray.500">Usuários</StatLabel>
                  <StatNumber fontSize="3xl">{dashboardData.estatisticas.usuarios.total}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.estatisticas.usuarios.crescimento >= 0 ? 'increase' : 'decrease'} />
                    {Math.abs(dashboardData.estatisticas.usuarios.crescimento)}% em relação ao mês anterior
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

          {/* Card de Receita */}
          <Card>
            <CardContent className="p-6">
              <StatGroup>
                <Stat>
                  <StatLabel fontSize="sm" color="gray.500">Receita (R$)</StatLabel>
                  <StatNumber fontSize="3xl">
                    {formatCurrency(dashboardData.estatisticas.transacoes.valorTotal)}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={(dashboardData.estatisticas.transacoes.crescimento || 0) >= 0 ? 'increase' : 'decrease'} />
                    {formatPercentage(dashboardData.estatisticas.transacoes.crescimento)} em relação ao mês anterior
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
          {/* Gráfico de Transações */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" size="md" mb={4}>Volume de Transações e Valores</Heading>
              <Box height="300px">
              {typeof window !== 'undefined' && (
                <Chart
                  options={transacoesChartOptions}
                  series={transacoesChartSeries}
                  type="line"
                  height="100%"
                />
              )}
              </Box>
            </CardContent>
          </Card>

          {/* Novo Gráfico de Status das Transações */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" size="md" mb={4}>Status das Transações por Dia</Heading>
              <Box height="300px">
              {typeof window !== 'undefined' && (
                <Chart
                  options={statusTransacoesChartOptions}
                  series={statusTransacoesChartSeries}
                  type="bar"
                  height="100%"
                />
              )}
              </Box>
            </CardContent>
          </Card>
        </SimpleGrid>

        {/* Atividade Recente */}
        <Card>
          <CardContent className="p-6">
            <Heading as="h2" size="md" mb={4}>Atividade Recente</Heading>
            {dashboardData.atividades && dashboardData.atividades.length > 0 ? (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Tipo</Th>
                    <Th>Usuário</Th>
                    <Th>Item</Th>
                    <Th>Status</Th>
                    <Th>Data</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {dashboardData.atividades.map((atividade) => (
                    <Tr key={atividade.id}>
                      <Td>
                        <Badge colorScheme={
                          atividade.tipo === 'pedido' ? 'blue' : 
                          atividade.tipo === 'transacao' ? 'green' : 
                          'purple'
                        }>
                          {atividade.tipo}
                        </Badge>
                      </Td>
                      <Td>{atividade.usuario}</Td>
                      <Td>{atividade.item}</Td>
                      <Td>
                        <Badge colorScheme={
                          atividade.status === 'aprovado' || atividade.status === 'concluído' ? 'green' : 
                          atividade.status === 'processando' ? 'blue' : 
                          atividade.status === 'pendente' ? 'yellow' : 
                          'red'
                        }>
                          {atividade.status}
                        </Badge>
                      </Td>
                      <Td>{formatDate(atividade.data)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text textAlign="center" py={4}>Nenhuma atividade recente encontrada.</Text>
            )}
            </CardContent>
          </Card>

        {/* Informação de última atualização */}
        <Text mt={4} textAlign="right" fontSize="sm" color="gray.500">
          Última atualização: {formatDate(dashboardData.ultimaAtualizacao)}
        </Text>
      </Box>
    </AdminLayout>
  );
}

// Garantir que os dados sempre tenham uma estrutura válida para evitar erros no render
const normalizeData = (data: any): DashboardData => {
  return {
    estatisticas: {
      transacoes: {
        total: data?.estatisticas?.transacoes?.total ?? 0,
        crescimento: data?.estatisticas?.transacoes?.crescimento ?? 0,
        valorTotal: data?.estatisticas?.transacoes?.valorTotal ?? 0,
        hoje: {
          total: data?.estatisticas?.transacoes?.hoje?.total ?? 0,
          valorTotal: data?.estatisticas?.transacoes?.hoje?.valorTotal ?? 0,
          valorAprovado: data?.estatisticas?.transacoes?.hoje?.valorAprovado ?? 0,
        },
      },
      pedidos: {
        total: data?.estatisticas?.pedidos?.total ?? 0,
        crescimento: data?.estatisticas?.pedidos?.crescimento ?? 0,
        concluidos: data?.estatisticas?.pedidos?.concluidos ?? 0,
        pendentes: data?.estatisticas?.pedidos?.pendentes ?? 0,
        cancelados: data?.estatisticas?.pedidos?.cancelados ?? 0,
      },
      usuarios: {
        total: data?.estatisticas?.usuarios?.total ?? 0,
        crescimento: data?.estatisticas?.usuarios?.crescimento ?? 0,
        novos: data?.estatisticas?.usuarios?.novos ?? 0,
      },
    },
    graficos: {
      transacoesPorDia: data?.graficos?.transacoesPorDia ?? [],
      statusPedidos: {
        labels: data?.graficos?.statusPedidos?.labels ?? ['Completos', 'Pendentes', 'Cancelados'],
        dados: data?.graficos?.statusPedidos?.dados ?? [0, 0, 0],
      },
    },
    atividades: data?.atividades ?? [],
    ultimaAtualizacao: data?.ultimaAtualizacao ?? new Date().toISOString(),
  };
};

export default dynamic(() => Promise.resolve(Dashboard), {
  ssr: false,
}); 