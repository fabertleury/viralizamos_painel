import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  List,
  ListItem,
  Skeleton,
  Spinner,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  Badge,
  Link,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  VStack,
  Circle,
  Tooltip,
} from '@chakra-ui/react';
import { HiOutlineCurrencyDollar, HiOutlineShoppingCart, HiOutlineCalendar, HiOutlineClock, HiOutlineScale, HiOutlineCreditCard, HiOutlineReceiptTax } from 'react-icons/hi';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import NextLink from 'next/link';
import { DetailedUser, UserMetrics, fetchUserDetails } from '@/services/adminService';
import { FiAlertCircle, FiCreditCard, FiDollarSign, FiClock } from 'react-icons/fi';

interface MetricasUsuarioDetalhadasProps {
  userId: string;
}

const MetricasUsuarioDetalhadas: React.FC<MetricasUsuarioDetalhadasProps> = ({ userId }) => {
  const [detalhes, setDetalhes] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Usar a função de serviço para buscar detalhes do usuário
        const userData = await fetchUserDetails(userId);
        console.log('Detalhes do usuário carregados com sucesso:', userId);
        setDetalhes(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        console.error('Erro ao carregar detalhes:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card shadow="sm" borderWidth="1px" borderColor={borderColor} bg={bgColor} width="100%">
        <CardHeader>
          <Heading size="md">Métricas Detalhadas</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={4}>
            <Skeleton height="100px" />
            <Skeleton height="100px" />
            <Skeleton height="150px" />
          </Stack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card shadow="sm" borderWidth="1px" borderColor="red.200" bg={bgColor} width="100%">
        <CardHeader>
          <Heading size="md" color="red.500">Erro ao Carregar Detalhes</Heading>
        </CardHeader>
        <CardBody>
          <Flex align="center" color="red.500" mb={3}>
            <Icon as={FiAlertCircle} mr={2} />
            <Text>{error}</Text>
          </Flex>
          <Text fontSize="sm">
            Verifique a conexão com a API ou tente novamente mais tarde.
          </Text>
        </CardBody>
      </Card>
    );
  }

  if (!detalhes) {
    return (
      <Card shadow="sm" borderWidth="1px" borderColor={borderColor} bg={bgColor} width="100%">
        <CardHeader>
          <Heading size="md">Métricas Detalhadas</Heading>
        </CardHeader>
        <CardBody>
          <Text color="gray.500">Nenhum detalhe encontrado para este usuário.</Text>
        </CardBody>
      </Card>
    );
  }

  const { metrics } = detalhes;
  
  // Verificar se existem transações vinculadas
  const hasTransactions = metrics.transactions && metrics.transactions.length > 0;

  // Status colors for orders
  const statusColors: Record<string, string> = {
    pending: 'yellow',
    processing: 'blue',
    completed: 'green',
    canceled: 'red',
    refunded: 'purple',
    waiting: 'orange',
    expired: 'gray',
  };

  // Helper para obter a tradução do status
  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando', 
      completed: 'Concluído',
      canceled: 'Cancelado',
      refunded: 'Reembolsado',
      waiting: 'Aguardando',
      expired: 'Expirado',
    };
    
    return statusMap[status] || status;
  };

  return (
    <Card shadow="sm" borderWidth="1px" borderColor={borderColor} bg={bgColor} width="100%">
      <CardHeader pb={0}>
        <Heading size="md">Métricas Detalhadas de Usuário</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          Dados completos de atividade e compras
        </Text>
      </CardHeader>
      
      <CardBody>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6} mb={8}>
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineShoppingCart} boxSize={5} color="blue.500" mr={2} />
                <StatLabel>Total de Pedidos</StatLabel>
              </Flex>
              <StatNumber>{metrics.orders_count || 0}</StatNumber>
              <StatHelpText>Pedidos realizados</StatHelpText>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineCurrencyDollar} boxSize={5} color="green.500" mr={2} />
                <StatLabel>Total Gasto</StatLabel>
              </Flex>
              <StatNumber>{formatCurrency(metrics.total_spent || 0)}</StatNumber>
              <StatHelpText>Gastos acumulados</StatHelpText>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineScale} boxSize={5} color="orange.500" mr={2} />
                <StatLabel>Valor Médio</StatLabel>
              </Flex>
              <StatNumber>{formatCurrency(metrics.avg_order_value || 0)}</StatNumber>
              <StatHelpText>Por compra</StatHelpText>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineClock} boxSize={5} color="purple.500" mr={2} />
                <StatLabel>Frequência</StatLabel>
              </Flex>
              <StatNumber>
                {metrics.purchase_frequency 
                  ? `${Math.round(metrics.purchase_frequency)} dias` 
                  : 'N/A'}
              </StatNumber>
              <StatHelpText>Entre compras</StatHelpText>
            </Stat>
          </GridItem>
        </Grid>
        
        <Divider my={6} />
        
        <Box mb={6}>
          <Heading size="sm" mb={4}>Serviços Mais Utilizados</Heading>
          
          {!metrics.top_services?.length ? (
            <Text color="gray.500">Nenhum serviço utilizado</Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Serviço</Th>
                  <Th isNumeric>Quantidade</Th>
                </Tr>
              </Thead>
              <Tbody>
                {metrics.top_services.map((service, index) => (
                  <Tr key={index} _hover={{ bg: hoverBgColor }}>
                    <Td>
                      <HStack>
                        <Circle size="8" bg="blue.50" color="blue.500">
                          {index + 1}
                        </Circle>
                        <Text>{service.service_name}</Text>
                      </HStack>
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme="blue" borderRadius="full">
                        {service.count} {service.count === 1 ? 'compra' : 'compras'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
        
        <Divider my={6} />
        
        <Box>
          <Heading size="sm" mb={4}>Última Compra</Heading>
          
          {!metrics.last_purchase ? (
            <Text color="gray.500">Nenhuma compra registrada</Text>
          ) : (
            <Box 
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              borderColor={borderColor}
            >
              <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }} gap={4}>
                <GridItem>
                  <Text fontWeight="medium">Data</Text>
                  <Text>{formatDate(new Date(metrics.last_purchase.date))}</Text>
                </GridItem>
                
                <GridItem>
                  <Text fontWeight="medium">Valor</Text>
                  <Text>{formatCurrency(metrics.last_purchase.amount)}</Text>
                </GridItem>
                
                <GridItem>
                  <Text fontWeight="medium">Status</Text>
                  <Badge 
                    colorScheme={statusColors[metrics.last_purchase.status] || 'gray'}
                    borderRadius="full"
                    px={2}
                    py={0.5}
                  >
                    {getStatusLabel(metrics.last_purchase.status)}
                  </Badge>
                </GridItem>
              </Grid>
              
              <Flex mt={4} justifyContent="flex-end">
                <Link 
                  as={NextLink} 
                  href={`/pedidos/${metrics.last_purchase.id}`}
                  color="blue.500"
                  fontWeight="medium"
                  fontSize="sm"
                >
                  Ver detalhes do pedido
                </Link>
              </Flex>
            </Box>
          )}
        </Box>
        
        <Divider my={6} />
        
        {/* Nova seção de transações */}
        <Box mb={6}>
          <Heading size="sm" mb={4}>Transações Vinculadas</Heading>
          
          {!metrics.transactions || metrics.transactions.length === 0 ? (
            <Text color="gray.500">Nenhuma transação vinculada a este usuário</Text>
          ) : (
            <Box>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} mb={6}>
                <GridItem>
                  <Stat>
                    <Flex align="center" mb={2}>
                      <Icon as={HiOutlineCreditCard} boxSize={5} color="teal.500" mr={2} />
                      <StatLabel>Total de Transações</StatLabel>
                    </Flex>
                    <StatNumber>{metrics.transactions_count || metrics.transactions.length}</StatNumber>
                    <StatHelpText>Transações processadas</StatHelpText>
                  </Stat>
                </GridItem>
                
                <GridItem>
                  <Stat>
                    <Flex align="center" mb={2}>
                      <Icon as={HiOutlineReceiptTax} boxSize={5} color="purple.500" mr={2} />
                      <StatLabel>Total Pago</StatLabel>
                    </Flex>
                    <StatNumber>{formatCurrency(metrics.total_payments || 0)}</StatNumber>
                    <StatHelpText>Pagamentos confirmados</StatHelpText>
                  </Stat>
                </GridItem>
                
                <GridItem>
                  <Stat>
                    <Flex align="center" mb={2}>
                      <Icon as={FiCreditCard} boxSize={5} color="blue.500" mr={2} />
                      <StatLabel>Método Preferido</StatLabel>
                    </Flex>
                    <StatNumber fontSize="md">
                      {metrics.preferred_payment_method || 'N/A'}
                    </StatNumber>
                    <StatHelpText>Método mais utilizado</StatHelpText>
                  </Stat>
                </GridItem>
              </Grid>
              
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>Data</Th>
                    <Th>Método</Th>
                    <Th isNumeric>Valor</Th>
                    <Th>Status</Th>
                    <Th>Pedido</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {metrics.transactions.slice(0, 5).map((transaction, index) => (
                    <Tr key={index} _hover={{ bg: hoverBgColor }}>
                      <Td>
                        <Tooltip label={transaction.id || transaction.external_id}>
                          <Text>{(transaction.id || transaction.external_id || '').substring(0, 8)}...</Text>
                        </Tooltip>
                      </Td>
                      <Td>{formatDate(new Date(transaction.created_at || transaction.date))}</Td>
                      <Td>
                        <HStack>
                          <Icon as={FiCreditCard} color="blue.500" />
                          <Text>{transaction.payment_method || 'N/A'}</Text>
                        </HStack>
                      </Td>
                      <Td isNumeric>
                        <Text fontWeight="medium">{formatCurrency(transaction.amount || 0)}</Text>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={transaction.status === 'approved' ? 'green' : 
                                     transaction.status === 'pending' ? 'yellow' : 
                                     transaction.status === 'rejected' ? 'red' : 'gray'}
                          borderRadius="full"
                        >
                          {transaction.status === 'approved' ? 'Aprovado' : 
                           transaction.status === 'pending' ? 'Pendente' : 
                           transaction.status === 'rejected' ? 'Rejeitado' : transaction.status}
                        </Badge>
                      </Td>
                      <Td>
                        {transaction.order_id ? (
                          <Link 
                            as={NextLink} 
                            href={`/pedidos/${transaction.order_id}`}
                            color="blue.500"
                            fontSize="sm"
                          >
                            Ver pedido
                          </Link>
                        ) : (
                          <Text fontSize="sm" color="gray.500">N/A</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              
              {metrics.transactions.length > 5 && (
                <Flex justifyContent="center" mt={4}>
                  <Link 
                    as={NextLink} 
                    href={`/transacoes?user_id=${userId}`}
                    color="blue.500"
                    fontWeight="medium"
                  >
                    Ver todas as {metrics.transactions.length} transações
                  </Link>
                </Flex>
              )}
            </Box>
          )}
        </Box>
      </CardBody>
    </Card>
  );
};

export default MetricasUsuarioDetalhadas;