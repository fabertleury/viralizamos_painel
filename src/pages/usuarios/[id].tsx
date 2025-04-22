import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Divider,
  Badge,
  Spinner,
  useToast,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  StackDivider,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  SimpleGrid,
  Icon,
  HStack,
  VStack,
  Progress,
  useColorModeValue,
  Tooltip
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { buscarUsuario, buscarMetricasUsuario, buscarHistoricoCompras } from '@/services/usuariosService';
import { FiUser, FiMail, FiPhone, FiCalendar, FiShoppingBag, FiDollarSign, FiClock, FiBarChart2, FiTrendingUp, FiStar } from 'react-icons/fi';
import NextLink from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';

// Importação dinâmica do componente de gráfico para evitar problemas de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function DetalhesUsuario() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const toast = useToast();
  
  const [usuario, setUsuario] = useState<any>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [historicoPedidos, setHistoricoPedidos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  
  // Formatar valores monetários
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };
  
  // Formatar datas
  const formatarData = (data: string | Date | null) => {
    if (!data) return 'N/A';
    try {
      const dataObj = typeof data === 'string' ? new Date(data) : data;
      return format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  // Formatar data com hora
  const formatarDataHora = (data: string | Date | null) => {
    if (!data) return 'N/A';
    try {
      const dataObj = typeof data === 'string' ? new Date(data) : data;
      return format(dataObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  // Obter badge para status do pedido
  const getOrderStatusBadge = (status: string) => {
    let color = 'gray';
    let label = status;
    
    switch (status?.toLowerCase()) {
      case 'pending':
        color = 'yellow';
        label = 'Pendente';
        break;
      case 'processing':
      case 'in progress':
        color = 'blue';
        label = 'Processando';
        break;
      case 'completed':
      case 'success':
        color = 'green';
        label = 'Concluído';
        break;
      case 'failed':
      case 'rejected':
        color = 'red';
        label = 'Falhou';
        break;
      case 'canceled':
        color = 'gray';
        label = 'Cancelado';
        break;
      case 'partial':
        color = 'purple';
        label = 'Parcial';
        break;
    }
    
    return <Badge colorScheme={color}>{label}</Badge>;
  };
  
  // Carregar dados do usuário
  const carregarDadosUsuario = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      
      // Buscar dados básicos do usuário
      const dadosUsuario = await buscarUsuario(id as string);
      setUsuario(dadosUsuario);
      
      // Buscar métricas do usuário
      const metricasUsuario = await buscarMetricasUsuario(id as string);
      setMetricas(metricasUsuario);
      
      // Buscar histórico de pedidos
      const resultado = await buscarHistoricoCompras(id as string, 1, 10);
      setHistoricoPedidos(resultado.orders || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar os dados do usuário. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Efeito para carregar dados quando o ID estiver disponível
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated && id) {
      carregarDadosUsuario();
    }
  }, [isAuthenticated, authLoading, id]);
  
  // Configuração do gráfico de tendência de compras
  const getTendenciaComprasChart = () => {
    if (!metricas?.tendencia_compras || metricas.tendencia_compras.length === 0) {
      return null;
    }
    
    const dados = metricas.tendencia_compras.sort((a: any, b: any) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
    
    const options = {
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: {
        categories: dados.map((item: any) => 
          format(new Date(item.month), 'MMM/yyyy', { locale: ptBR })
        ),
        labels: {
          style: {
            colors: subtitleColor
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (val: number) => formatarValor(val).replace('R$', '')
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => formatarValor(val)
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      colors: ['#3182CE', '#38A169']
    };
    
    const series = [
      {
        name: 'Valor Total',
        data: dados.map((item: any) => item.total_amount || 0)
      },
      {
        name: 'Quantidade de Pedidos',
        data: dados.map((item: any) => item.order_count || 0)
      }
    ];
    
    return { options, series };
  };
  
  // Configuração do gráfico de distribuição de status
  const getDistribuicaoStatusChart = () => {
    if (!metricas?.distribuicao_status || metricas.distribuicao_status.length === 0) {
      return null;
    }
    
    const options = {
      chart: {
        type: 'pie',
        height: 350
      },
      labels: metricas.distribuicao_status.map((item: any) => {
        switch (item.status?.toLowerCase()) {
          case 'pending': return 'Pendente';
          case 'processing': case 'in progress': return 'Processando';
          case 'completed': case 'success': return 'Concluído';
          case 'failed': case 'rejected': return 'Falhou';
          case 'canceled': return 'Cancelado';
          case 'partial': return 'Parcial';
          default: return item.status || 'Desconhecido';
        }
      }),
      colors: ['#ECC94B', '#3182CE', '#38A169', '#E53E3E', '#718096', '#805AD5'],
      legend: {
        position: 'bottom'
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };
    
    const series = metricas.distribuicao_status.map((item: any) => item.count || 0);
    
    return { options, series };
  };
  
  // Renderizar página de carregamento
  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="80vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }
  
  // Renderizar mensagem de erro se não encontrar o usuário
  if (!usuario) {
    return (
      <Box p={8} textAlign="center">
        <Heading size="lg" mb={4}>Usuário não encontrado</Heading>
        <Text mb={4}>Não foi possível encontrar os dados do usuário solicitado.</Text>
        <Button
          as={NextLink}
          href="/usuarios"
          colorScheme="blue"
        >
          Voltar para lista de usuários
        </Button>
      </Box>
    );
  }
  
  return (
    <Box p={4}>
      {/* Cabeçalho */}
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'flex-start', md: 'center' }} 
        mb={6}
      >
        <Box>
          <Heading size="lg" mb={1}>{usuario.nome}</Heading>
          <HStack spacing={2} mb={2}>
            <Badge colorScheme={usuario.tipo === 'admin' ? 'red' : usuario.tipo === 'afiliado' ? 'purple' : 'green'}>
              {usuario.tipo === 'admin' ? 'Administrador' : 
               usuario.tipo === 'afiliado' ? 'Afiliado' : 'Cliente'}
            </Badge>
            <Badge colorScheme={usuario.status ? 'green' : 'red'}>
              {usuario.status ? 'Ativo' : 'Inativo'}
            </Badge>
          </HStack>
          <Text color={subtitleColor} fontSize="sm">
            Cadastrado em {formatarData(usuario.data_cadastro)}
          </Text>
        </Box>
        
        <Button
          as={NextLink}
          href="/usuarios"
          colorScheme="blue"
          variant="outline"
          mt={{ base: 4, md: 0 }}
        >
          Voltar para lista
        </Button>
      </Flex>
      
      {/* Informações principais */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FiShoppingBag} mr={2} /> Total de Pedidos
              </StatLabel>
              <StatNumber>{usuario.total_pedidos || 0}</StatNumber>
              {metricas?.dias_entre_compras && (
                <StatHelpText>
                  Média de {Math.round(metricas.dias_entre_compras)} dias entre compras
                </StatHelpText>
              )}
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FiDollarSign} mr={2} /> Total Gasto
              </StatLabel>
              <StatNumber>{formatarValor(usuario.total_gasto)}</StatNumber>
              {metricas?.valor_medio_compra && (
                <StatHelpText>
                  Média de {formatarValor(metricas.valor_medio_compra)} por pedido
                </StatHelpText>
              )}
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FiClock} mr={2} /> Última Compra
              </StatLabel>
              <StatNumber fontSize="lg">
                {usuario.ultimo_pedido ? formatarData(usuario.ultimo_pedido) : 'Nunca comprou'}
              </StatNumber>
              {usuario.ultimo_pedido && (
                <StatHelpText>
                  {Math.round((new Date().getTime() - new Date(usuario.ultimo_pedido).getTime()) / (1000 * 60 * 60 * 24))} dias atrás
                </StatHelpText>
              )}
            </Stat>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} shadow="md">
          <CardBody>
            <Stat>
              <StatLabel display="flex" alignItems="center">
                <Icon as={FiStar} mr={2} /> Serviço Mais Usado
              </StatLabel>
              <StatNumber fontSize="lg">
                {usuario.servicos_usados && usuario.servicos_usados.length > 0 
                  ? usuario.servicos_usados[0]
                  : 'Nenhum'}
              </StatNumber>
              {metricas?.servico_mais_comprado && (
                <StatHelpText>
                  {metricas.servico_mais_comprado.quantidade} pedidos
                </StatHelpText>
              )}
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
      
      {/* Abas com detalhes */}
      <Tabs 
        isFitted 
        variant="enclosed" 
        colorScheme="blue" 
        index={tabIndex} 
        onChange={(index) => setTabIndex(index)}
        mb={6}
      >
        <TabList mb="1em">
          <Tab>Informações Pessoais</Tab>
          <Tab>Histórico de Pedidos</Tab>
          <Tab>Métricas</Tab>
        </TabList>
        
        <TabPanels>
          {/* Aba de Informações Pessoais */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Dados do Usuário</Heading>
                </CardHeader>
                <CardBody>
                  <Stack divider={<StackDivider />} spacing={4}>
                    <Box>
                      <HStack>
                        <Icon as={FiUser} color="blue.500" />
                        <Text fontWeight="bold">Nome:</Text>
                      </HStack>
                      <Text ml={6}>{usuario.nome || 'Não informado'}</Text>
                    </Box>
                    
                    <Box>
                      <HStack>
                        <Icon as={FiMail} color="blue.500" />
                        <Text fontWeight="bold">Email:</Text>
                      </HStack>
                      <Text ml={6}>{usuario.email || 'Não informado'}</Text>
                    </Box>
                    
                    <Box>
                      <HStack>
                        <Icon as={FiPhone} color="blue.500" />
                        <Text fontWeight="bold">Telefone:</Text>
                      </HStack>
                      <Text ml={6}>{usuario.telefone || 'Não informado'}</Text>
                    </Box>
                    
                    <Box>
                      <HStack>
                        <Icon as={FiCalendar} color="blue.500" />
                        <Text fontWeight="bold">Data de Cadastro:</Text>
                      </HStack>
                      <Text ml={6}>{formatarData(usuario.data_cadastro)}</Text>
                    </Box>
                    
                    {usuario.ultimo_acesso && (
                      <Box>
                        <HStack>
                          <Icon as={FiClock} color="blue.500" />
                          <Text fontWeight="bold">Último Acesso:</Text>
                        </HStack>
                        <Text ml={6}>{formatarDataHora(usuario.ultimo_acesso)}</Text>
                      </Box>
                    )}
                  </Stack>
                </CardBody>
              </Card>
              
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Serviços Utilizados</Heading>
                </CardHeader>
                <CardBody>
                  {usuario.servicos_usados && usuario.servicos_usados.length > 0 ? (
                    <Stack divider={<StackDivider />} spacing={4}>
                      {usuario.servicos_usados.map((servico: string, index: number) => (
                        <Box key={index}>
                          <Text fontWeight="bold">{servico}</Text>
                          {metricas?.top_services && metricas.top_services[index] && (
                            <Text fontSize="sm" color={subtitleColor}>
                              {metricas.top_services[index].count} pedidos
                            </Text>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Text>Nenhum serviço utilizado</Text>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
          
          {/* Aba de Histórico de Pedidos */}
          <TabPanel>
            <Card bg={cardBg} shadow="md">
              <CardHeader>
                <Heading size="md">Pedidos Recentes</Heading>
              </CardHeader>
              <CardBody>
                {historicoPedidos && historicoPedidos.length > 0 ? (
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Data</Th>
                          <Th>Serviço</Th>
                          <Th>Valor</Th>
                          <Th>Status</Th>
                          <Th>Ações</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {historicoPedidos.map((pedido) => (
                          <Tr key={pedido.id}>
                            <Td>{pedido.id.substring(0, 8)}...</Td>
                            <Td>{formatarData(pedido.created_at)}</Td>
                            <Td>{pedido.provider?.name || 'Não especificado'}</Td>
                            <Td>{formatarValor(pedido.amount)}</Td>
                            <Td>{getOrderStatusBadge(pedido.status)}</Td>
                            <Td>
                              <Button
                                as={NextLink}
                                href={`/pedidos/${pedido.id}`}
                                size="sm"
                                colorScheme="blue"
                              >
                                Detalhes
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                ) : (
                  <Text>Nenhum pedido encontrado</Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>
          
          {/* Aba de Métricas */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {/* Gráfico de tendência de compras */}
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Tendência de Compras</Heading>
                </CardHeader>
                <CardBody>
                  {getTendenciaComprasChart() ? (
                    <Box id="chart">
                      <Chart
                        options={getTendenciaComprasChart()?.options}
                        series={getTendenciaComprasChart()?.series}
                        type="area"
                        height={350}
                      />
                    </Box>
                  ) : (
                    <Text>Dados insuficientes para gerar o gráfico</Text>
                  )}
                </CardBody>
              </Card>
              
              {/* Gráfico de distribuição de status */}
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Distribuição de Status</Heading>
                </CardHeader>
                <CardBody>
                  {getDistribuicaoStatusChart() ? (
                    <Box id="chart">
                      <Chart
                        options={getDistribuicaoStatusChart()?.options}
                        series={getDistribuicaoStatusChart()?.series}
                        type="pie"
                        height={350}
                      />
                    </Box>
                  ) : (
                    <Text>Dados insuficientes para gerar o gráfico</Text>
                  )}
                </CardBody>
              </Card>
              
              {/* Estatísticas adicionais */}
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Estatísticas de Compra</Heading>
                </CardHeader>
                <CardBody>
                  <Stack divider={<StackDivider />} spacing={4}>
                    <Box>
                      <Text fontWeight="bold">Valor Médio de Compra</Text>
                      <Text fontSize="2xl">{formatarValor(metricas?.valor_medio_compra || 0)}</Text>
                    </Box>
                    
                    <Box>
                      <Text fontWeight="bold">Frequência de Compras</Text>
                      <Text fontSize="2xl">
                        {metricas?.dias_entre_compras 
                          ? `${Math.round(metricas.dias_entre_compras)} dias entre compras`
                          : 'Dados insuficientes'}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text fontWeight="bold">Primeira Compra</Text>
                      <Text fontSize="lg">
                        {metricas?.primeiro_pedido 
                          ? formatarData(metricas.primeiro_pedido)
                          : 'Não disponível'}
                      </Text>
                    </Box>
                  </Stack>
                </CardBody>
              </Card>
              
              {/* Serviços mais comprados */}
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Serviços Mais Comprados</Heading>
                </CardHeader>
                <CardBody>
                  {metricas?.top_services && metricas.top_services.length > 0 ? (
                    <Stack divider={<StackDivider />} spacing={4}>
                      {metricas.top_services.map((servico: any, index: number) => (
                        <Box key={index}>
                          <Flex justify="space-between" align="center" mb={1}>
                            <Text fontWeight="bold">{servico.service_name}</Text>
                            <Text>{servico.count} pedidos</Text>
                          </Flex>
                          <Progress 
                            value={servico.count} 
                            max={metricas.top_services[0].count}
                            colorScheme={index === 0 ? 'blue' : index === 1 ? 'green' : 'purple'}
                            size="sm"
                            borderRadius="full"
                          />
                          {servico.total_spent && (
                            <Text fontSize="sm" color={subtitleColor} mt={1}>
                              Total gasto: {formatarValor(servico.total_spent)}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Text>Nenhum serviço utilizado</Text>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
