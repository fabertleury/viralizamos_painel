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
  Code,
  IconButton,
  HStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiArrowLeft, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import NextLink from 'next/link';
import axios from 'axios';
import { PedidoDetalhado } from '../../services/pedidosService';

// Componente para exibir o status do pedido com cores
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'gray';
  
  switch (status) {
    case 'pending':
      color = 'yellow';
      break;
    case 'processing':
      color = 'blue';
      break;
    case 'completed':
      color = 'green';
      break;
    case 'failed':
    case 'error':
      color = 'red';
      break;
    default:
      color = 'gray';
  }
  
  return <Badge colorScheme={color}>{status}</Badge>;
};

// Componente para exibir os logs do pedido
const LogsList = ({ logs }: { logs?: Array<any> }) => {
  if (!logs || logs.length === 0) {
    return <Text>Nenhum log disponível</Text>;
  }
  
  return (
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Data</Th>
          <Th>Nível</Th>
          <Th>Mensagem</Th>
        </Tr>
      </Thead>
      <Tbody>
        {logs.map((log) => (
          <Tr key={log.id}>
            <Td>{new Date(log.created_at).toLocaleString()}</Td>
            <Td>
              <Badge 
                colorScheme={
                  log.level === 'error' ? 'red' : 
                  log.level === 'warning' ? 'yellow' : 
                  log.level === 'info' ? 'blue' : 'gray'
                }
              >
                {log.level}
              </Badge>
            </Td>
            <Td>{log.message}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

// Componente para exibir dados JSON formatados
const JsonDisplay = ({ data }: { data: any }) => {
  if (!data || Object.keys(data).length === 0) {
    return <Text>Nenhum dado disponível</Text>;
  }
  
  return (
    <Box 
      bg={useColorModeValue('gray.50', 'gray.700')} 
      p={3} 
      borderRadius="md" 
      overflowX="auto"
    >
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Box>
  );
};

export default function DetalhesPedido() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Função para buscar os detalhes do pedido
  const fetchPedido = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/pedidos/${id}`);
      setPedido(response.data);
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      setError('Não foi possível carregar os detalhes do pedido');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do pedido',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Função para reenviar o pedido
  const handleReenviarPedido = async () => {
    if (!id) return;
    
    try {
      const response = await axios.post(`/api/pedidos/${id}/reenviar`);
      
      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Pedido reenviado com sucesso',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Recarregar os detalhes do pedido
        fetchPedido();
      } else {
        throw new Error(response.data.message || 'Erro ao reenviar pedido');
      }
    } catch (error) {
      console.error('Erro ao reenviar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reenviar o pedido',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Carregar os detalhes do pedido quando a página for carregada
  useEffect(() => {
    if (isAuthenticated && id) {
      fetchPedido();
    }
  }, [isAuthenticated, id]);
  
  // Redirecionar para a página de login se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);
  
  if (authLoading || loading) {
    return (
      <AdminLayout>
        <Flex justify="center" align="center" height="50vh">
          <Spinner size="xl" />
        </Flex>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <Box p={4}>
          <Alert status="error" mb={4}>
            <AlertIcon />
            <AlertTitle mr={2}>Erro!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            leftIcon={<FiArrowLeft />} 
            onClick={() => router.push('/pedidos')}
            colorScheme="blue"
          >
            Voltar para Pedidos
          </Button>
        </Box>
      </AdminLayout>
    );
  }
  
  if (!pedido) {
    return (
      <AdminLayout>
        <Box p={4}>
          <Alert status="warning" mb={4}>
            <AlertIcon />
            <AlertTitle mr={2}>Pedido não encontrado!</AlertTitle>
            <AlertDescription>O pedido solicitado não foi encontrado.</AlertDescription>
          </Alert>
          <Button 
            leftIcon={<FiArrowLeft />} 
            onClick={() => router.push('/pedidos')}
            colorScheme="blue"
          >
            Voltar para Pedidos
          </Button>
        </Box>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <Box p={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <HStack>
            <Button 
              leftIcon={<FiArrowLeft />} 
              onClick={() => router.push('/pedidos')}
              variant="outline"
            >
              Voltar
            </Button>
            <Heading size="lg">Detalhes do Pedido</Heading>
          </HStack>
          <HStack>
            <Button 
              leftIcon={<FiRefreshCw />} 
              onClick={fetchPedido}
              variant="outline"
            >
              Atualizar
            </Button>
            {(pedido.status === 'failed' || pedido.status === 'error') && (
              <Button 
                colorScheme="blue" 
                onClick={handleReenviarPedido}
              >
                Reenviar Pedido
              </Button>
            )}
          </HStack>
        </Flex>
        
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Informações do Pedido</Heading>
            </CardHeader>
            <CardBody>
              <Stack divider={<StackDivider />} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500">ID do Pedido</Text>
                  <Text fontWeight="bold">{pedido.id}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Status</Text>
                  <StatusBadge status={pedido.status} />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Data de Criação</Text>
                  <Text>{new Date(pedido.data_criacao).toLocaleString()}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">ID da Transação</Text>
                  <Text>{pedido.transacao_id || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">ID do Pedido no Provedor</Text>
                  <Text>{pedido.provider_order_id || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Valor</Text>
                  <Text>R$ {pedido.valor?.toFixed(2) || '0.00'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Quantidade</Text>
                  <Text>{pedido.quantidade || '0'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader>
              <Heading size="md">Informações do Cliente e Serviço</Heading>
            </CardHeader>
            <CardBody>
              <Stack divider={<StackDivider />} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nome do Cliente</Text>
                  <Text>{pedido.cliente_nome || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email do Cliente</Text>
                  <Text>{pedido.cliente_email || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Provedor</Text>
                  <Text>{pedido.provedor_nome || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Serviço</Text>
                  <Text>{pedido.produto_nome || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Username Alvo</Text>
                  <Text>{pedido.target_username || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">URL Alvo</Text>
                  {pedido.target_url ? (
                    <Link href={pedido.target_url} isExternal color="blue.500">
                      {pedido.target_url} <FiExternalLink style={{ display: 'inline' }} />
                    </Link>
                  ) : (
                    <Text>N/A</Text>
                  )}
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
        
        <Tabs variant="enclosed" mt={6}>
          <TabList>
            <Tab>Logs</Tab>
            <Tab>Metadados</Tab>
            <Tab>Resposta do Provedor</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <LogsList logs={pedido.logs} />
            </TabPanel>
            <TabPanel>
              <JsonDisplay data={pedido.metadata} />
            </TabPanel>
            <TabPanel>
              <JsonDisplay data={pedido.provider_response} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </AdminLayout>
  );
}
