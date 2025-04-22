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

// Formatador de moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value); // Valor já está em reais, não precisa dividir por 100
};

// Formatador de data
const formatDate = (dateString: string) => {
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
        setDashboardData(response.data);
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
      data: dashboardData.graficos.transacoesPorDia.map(item => item.total),
    },
    {
      name: 'Valor (R$)',
      data: dashboardData.graficos.transacoesPorDia.map(item => item.valorAprovado),
    },
  ];

  // Configuração do gráfico de status de pedidos
  const pedidosChartOptions = {
    chart: {
      type: 'pie' as const,
    },
    labels: dashboardData.graficos.statusPedidos.labels,
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

  const pedidosChartSeries = dashboardData.graficos.statusPedidos.dados;

    return (
    <AdminLayout>
      <Box p={5}>
        <Heading as="h1" size="xl" mb={6}>Dashboard</Heading>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          {/* Card de Transações */}
          <Card>
            <CardContent className="p-6">
              <StatGroup>
                <Stat>
                  <StatLabel fontSize="sm" color="gray.500">Transações</StatLabel>
                  <StatNumber fontSize="3xl">{dashboardData.estatisticas.transacoes.total}</StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.estatisticas.transacoes.crescimento >= 0 ? 'increase' : 'decrease'} />
                    {Math.abs(dashboardData.estatisticas.transacoes.crescimento)}% em relação ao mês anterior
                  </StatHelpText>
                </Stat>
              </StatGroup>
            </CardContent>
          </Card>

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
                    R$ {dashboardData.estatisticas.transacoes.valorTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={dashboardData.estatisticas.transacoes.crescimento >= 0 ? 'increase' : 'decrease'} />
                    {Math.abs(dashboardData.estatisticas.transacoes.crescimento)}% em relação ao mês anterior
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
              <Heading as="h2" size="md" mb={4}>Transações (últimos 7 dias)</Heading>
              <Box height="300px">
              {typeof window !== 'undefined' && (
                <Chart
                  options={transacoesChartOptions}
                  series={transacoesChartSeries}
                  type="area"
                    height="100%"
                />
              )}
              </Box>
            </CardContent>
          </Card>

          {/* Gráfico de Status dos Pedidos */}
          <Card>
            <CardContent className="p-6">
              <Heading as="h2" size="md" mb={4}>Status dos Pedidos</Heading>
              <Box height="300px">
              {typeof window !== 'undefined' && (
                <Chart
                  options={pedidosChartOptions}
                  series={pedidosChartSeries}
                  type="pie"
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

export default dynamic(() => Promise.resolve(Dashboard), {
  ssr: false,
}); 