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
} from '@chakra-ui/react';
import { HiOutlineCurrencyDollar, HiOutlineShoppingCart, HiOutlineCalendar } from 'react-icons/hi';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import NextLink from 'next/link';

interface MetricasUsuarioProps {
  userId: string;
}

interface UserMetricsData {
  totalSpent: number;
  totalOrders: number;
  monthlyAverage: number;
  recentOrders: RecentOrder[];
}

interface RecentOrder {
  id: string;
  token: string;
  createdAt: string;
  amount: number;
  status: string;
  serviceName: string;
}

const statusColors = {
  pending: 'yellow',
  canceled: 'red',
  approved: 'green',
  expired: 'gray',
  refunded: 'purple',
};

const MetricasUsuario: React.FC<MetricasUsuarioProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<UserMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchUserMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/usuarios/${userId}/metricas`);
        
        if (!response.ok) {
          throw new Error('Falha ao carregar métricas do usuário');
        }
        
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        console.error('Erro ao carregar métricas:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserMetrics();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card shadow="sm" borderWidth="1px" borderColor={borderColor} bg={bgColor} width="100%">
        <CardHeader>
          <Heading size="md">Métricas do Usuário</Heading>
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
          <Heading size="md" color="red.500">Erro ao Carregar Métricas</Heading>
        </CardHeader>
        <CardBody>
          <Text>{error}</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card shadow="sm" borderWidth="1px" borderColor={borderColor} bg={bgColor} width="100%">
      <CardHeader>
        <Heading size="md">Métricas do Usuário</Heading>
      </CardHeader>
      
      <CardBody>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={6}>
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineCurrencyDollar} boxSize={5} color="green.500" mr={2} />
                <StatLabel>Gasto Total</StatLabel>
              </Flex>
              <StatNumber>{formatCurrency(metrics?.totalSpent || 0)}</StatNumber>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineShoppingCart} boxSize={5} color="blue.500" mr={2} />
                <StatLabel>Total de Compras</StatLabel>
              </Flex>
              <StatNumber>{formatNumber(metrics?.totalOrders || 0)}</StatNumber>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat>
              <Flex align="center" mb={2}>
                <Icon as={HiOutlineCalendar} boxSize={5} color="purple.500" mr={2} />
                <StatLabel>Média Mensal</StatLabel>
              </Flex>
              <StatNumber>{formatCurrency(metrics?.monthlyAverage || 0)}</StatNumber>
              <StatHelpText>Por mês</StatHelpText>
            </Stat>
          </GridItem>
        </Grid>
        
        <Divider my={4} />
        
        <Box>
          <Heading size="sm" mb={3}>Compras Recentes</Heading>
          
          {!metrics?.recentOrders?.length ? (
            <Text color="gray.500">Nenhuma compra recente encontrada</Text>
          ) : (
            <List spacing={3}>
              {metrics.recentOrders.map((order) => (
                <ListItem key={order.id}>
                  <Flex 
                    p={3} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    borderColor={borderColor}
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap={{ base: "wrap", md: "nowrap" }}
                  >
                    <Box flex="1" mr={3}>
                      <Link as={NextLink} href={`/pedidos/${order.token}`} color="blue.500" fontWeight="medium">
                        {order.serviceName}
                      </Link>
                      <Text fontSize="sm" color="gray.500">
                        {formatDate(new Date(order.createdAt))}
                      </Text>
                    </Box>
                    
                    <Flex align="center" mt={{ base: 2, md: 0 }} width={{ base: "100%", md: "auto" }}>
                      <Text fontWeight="bold" mr={3}>
                        {formatCurrency(order.amount)}
                      </Text>
                      <Badge 
                        colorScheme={statusColors[order.status as keyof typeof statusColors] || 'gray'}
                        borderRadius="full"
                        px={2}
                        py={1}
                      >
                        {order.status === 'pending' && 'Pendente'}
                        {order.status === 'approved' && 'Aprovado'}
                        {order.status === 'canceled' && 'Cancelado'}
                        {order.status === 'expired' && 'Expirado'}
                        {order.status === 'refunded' && 'Reembolsado'}
                      </Badge>
                    </Flex>
                  </Flex>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </CardBody>
    </Card>
  );
};

export default MetricasUsuario; 