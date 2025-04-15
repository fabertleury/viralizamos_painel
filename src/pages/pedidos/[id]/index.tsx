import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast, Spinner } from '@chakra-ui/react';
import { FiClock, FiCheck, FiRefreshCw, FiAlertTriangle, FiShoppingBag, FiBarChart2, FiDollarSign, FiUser, FiArrowLeft } from 'react-icons/fi';
import { Badge, Icon, Flex, Container, Button, Box, Heading, Text, HStack, Grid, GridItem, Card, CardHeader, CardBody, Stat, StatLabel, StatNumber, StatHelpText, Divider, Table, Thead, Tbody, Th, Tr, Td, VStack, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter } from '@chakra-ui/react';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

// Interface para o pedido
interface Pedido {
  id: string;
  status: string;
  amount: number;
  created_at: Date;
  produto_nome?: string;
  produto_descricao?: string;
  provedor_nome?: string;
  provider_order_id?: string;
  quantidade?: number;
  transacao_id?: string;
  transacao_detalhes?: {
    status: string;
    metodo_pagamento?: string;
    data_pagamento?: Date;
    parcelas?: number;
    valor_parcela?: number;
  };
  error_message?: string;
  api_response?: any;
  historico?: Array<{
    data: Date;
    status: string;
    descricao: string;
  }>;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_id?: string;
  metadados?: Record<string, any>;
}

const PedidoDetalhes: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Carregar dados do pedido quando o componente for montado ou o ID mudar
  useEffect(() => {
    if (isAuthenticated && router.query.id) {
      carregarPedido();
    }
  }, [router.query.id, isAuthenticated]);

  const carregarPedido = async () => {
    const { id } = router.query;
    if (!id) return;
    
    try {
      setIsLoading(true);
      
      // Adiciona token de autenticação ao cabeçalho da requisição
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`/api/pedidos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Dados do pedido carregados:', response.data);
      setPedido(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      toast({
        title: 'Erro ao carregar pedido',
        description: 'Ocorreu um erro ao tentar carregar os detalhes do pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reenviarPedido = async () => {
    if (!pedido) return;
    
    try {
      setIsProcessing(true);
      
      // Adiciona token de autenticação ao cabeçalho da requisição
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`/api/pedidos/${pedido.id}/reenviar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast({
          title: 'Pedido reenviado',
          description: 'O pedido foi marcado para reprocessamento com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Fechar o diálogo de confirmação
        onClose();
        
        // Recarregar os dados do pedido
        carregarPedido();
      } else {
        toast({
          title: 'Falha ao reenviar pedido',
          description: response.data.message || 'Não foi possível reenviar o pedido.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erro ao reenviar pedido:', error);
      toast({
        title: 'Erro ao reenviar pedido',
        description: 'Ocorreu um erro ao tentar reenviar o pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatarData = (dataISO?: Date) => {
    if (!dataISO) return '-';
    
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarValor = (valor: number) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const renderStatus = (status: string) => {
    let color = 'gray';
    let texto = 'Desconhecido';
    let icon = FiClock;
    
    switch (status.toLowerCase()) {
      case 'completo':
      case 'completed':
      case 'success':
        color = 'green';
        texto = 'Completo';
        icon = FiCheck;
        break;
      case 'processando':
      case 'processing':
      case 'in_progress':
        color = 'blue';
        texto = 'Processando';
        icon = FiRefreshCw;
        break;
      case 'pendente':
      case 'pending':
      case 'waiting':
        color = 'yellow';
        texto = 'Pendente';
        icon = FiClock;
        break;
      case 'falha':
      case 'failed':
      case 'error':
        color = 'red';
        texto = 'Falha';
        icon = FiAlertTriangle;
        break;
      case 'cancelado':
      case 'cancelled':
      case 'canceled':
        color = 'purple';
        texto = 'Cancelado';
        icon = FiAlertTriangle;
        break;
      default:
        texto = status;
    }
    
    return (
      <Badge 
        colorScheme={color} 
        px={3} 
        py={1} 
        borderRadius="full" 
        display="flex" 
        alignItems="center"
      >
        <Icon as={icon} mr={1} />
        {texto}
      </Badge>
    );
  };

  const verificarStatusPedido = async () => {
    if (!pedido) return;
    
    try {
      setIsProcessing(true);
      
      // Adiciona token de autenticação ao cabeçalho da requisição
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`/api/pedidos/${pedido.id}/check-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast({
          title: 'Status verificado',
          description: 'O status do pedido foi atualizado com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Recarregar os dados do pedido
        carregarPedido();
      } else {
        toast({
          title: 'Falha ao verificar status',
          description: response.data.message || 'Não foi possível verificar o status do pedido.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status do pedido:', error);
      toast({
        title: 'Erro ao verificar status',
        description: 'Ocorreu um erro ao tentar verificar o status do pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onOpen = () => {
    setIsOpen(true);
  };

  const onClose = () => {
    setIsOpen(false);
  };

  if (authLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box>
      <Container maxW="container.xl" py={6}>
        <Button
          as={Link}
          href="/pedidos"
          mb={6}
          leftIcon={<FiArrowLeft />}
          variant="outline"
        >
          Voltar para lista de pedidos
        </Button>
        
        {isLoading ? (
          <Flex justify="center" align="center" py={12}>
            <Spinner size="xl" color="brand.500" />
          </Flex>
        ) : !pedido ? (
          <Box textAlign="center" p={8}>
            <Heading size="md" mb={4}>
              Pedido não encontrado
            </Heading>
            <Text mb={6}>
              Não foi possível encontrar detalhes para este pedido.
            </Text>
            <Button as={Link} href="/pedidos" colorScheme="blue">
              Voltar para lista de pedidos
            </Button>
          </Box>
        ) : (
          <Box>
            <Flex 
              direction={{ base: 'column', md: 'row' }} 
              justify="space-between" 
              align={{ base: 'flex-start', md: 'center' }}
              mb={6}
            >
              <Box>
                <Heading size="lg">
                  Pedido #{pedido.id}
                </Heading>
                <Text color="gray.500" mt={1}>
                  Criado em {formatarData(pedido.created_at)}
                </Text>
              </Box>
              
              <HStack spacing={4} mt={{ base: 4, md: 0 }}>
                <Button
                  leftIcon={<FiRefreshCw />}
                  colorScheme="blue"
                  variant="outline"
                  onClick={verificarStatusPedido}
                  isLoading={isProcessing}
                  isDisabled={['completed', 'completo', 'success'].includes(pedido.status?.toLowerCase() || '')}
                >
                  Verificar Status
                </Button>
                
                {['falha', 'pendente', 'error', 'failed', 'pending'].includes(pedido.status?.toLowerCase() || '') && (
                  <Button
                    leftIcon={<FiRefreshCw />}
                    colorScheme="brand"
                    onClick={onOpen}
                    isLoading={isProcessing}
                  >
                    Reenviar Pedido
                  </Button>
                )}
              </HStack>
            </Flex>
            
            <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6}>
              {/* Coluna da esquerda - Dados do pedido */}
              <GridItem colSpan={{ base: 1, lg: 2 }}>
                <Card>
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Heading size="md">Informações do Pedido</Heading>
                      {renderStatus(pedido.status)}
                    </Flex>
                  </CardHeader>
                  
                  <CardBody>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                      <Stat>
                        <StatLabel>Serviço</StatLabel>
                        <StatNumber fontSize="md" display="flex" alignItems="center">
                          <Icon as={FiShoppingBag} mr={2} />
                          {pedido.produto_nome || 'N/A'}
                        </StatNumber>
                        {pedido.produto_descricao && (
                          <StatHelpText>{pedido.produto_descricao}</StatHelpText>
                        )}
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Provedor</StatLabel>
                        <StatNumber fontSize="md">
                          {pedido.provedor_nome || 'N/A'}
                        </StatNumber>
                        {pedido.provider_order_id && (
                          <StatHelpText>ID: {pedido.provider_order_id}</StatHelpText>
                        )}
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Quantidade</StatLabel>
                        <StatNumber fontSize="md" display="flex" alignItems="center">
                          <Icon as={FiBarChart2} mr={2} />
                          {pedido.quantidade?.toLocaleString() || '0'}
                        </StatNumber>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Valor</StatLabel>
                        <StatNumber fontSize="md" display="flex" alignItems="center">
                          <Icon as={FiDollarSign} mr={2} />
                          {formatarValor(pedido.amount)}
                        </StatNumber>
                      </Stat>
                    </Grid>
                    
                    <Divider my={6} />
                    
                    {/* Seção de transação */}
                    <Heading size="sm" mb={4}>Dados da Transação</Heading>
                    
                    {pedido.transacao_id ? (
                      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                        <Stat>
                          <StatLabel>ID da Transação</StatLabel>
                          <StatNumber fontSize="md">{pedido.transacao_id}</StatNumber>
                        </Stat>
                        
                        {pedido.transacao_detalhes && (
                          <>
                            <Stat>
                              <StatLabel>Status do Pagamento</StatLabel>
                              <StatNumber fontSize="md">
                                <Badge colorScheme={
                                  pedido.transacao_detalhes.status === 'approved' ? 'green' : 
                                  pedido.transacao_detalhes.status === 'pending' ? 'yellow' : 'red'
                                }>
                                  {pedido.transacao_detalhes.status === 'approved' ? 'Aprovado' : 
                                   pedido.transacao_detalhes.status === 'pending' ? 'Pendente' : 'Recusado'}
                                </Badge>
                              </StatNumber>
                            </Stat>
                            
                            <Stat>
                              <StatLabel>Método de Pagamento</StatLabel>
                              <StatNumber fontSize="md">
                                {pedido.transacao_detalhes.metodo_pagamento || 'N/A'}
                              </StatNumber>
                            </Stat>
                            
                            {pedido.transacao_detalhes.data_pagamento && (
                              <Stat>
                                <StatLabel>Data do Pagamento</StatLabel>
                                <StatNumber fontSize="md">
                                  {formatarData(pedido.transacao_detalhes.data_pagamento)}
                                </StatNumber>
                              </Stat>
                            )}
                            
                            {pedido.transacao_detalhes.parcelas && (
                              <Stat>
                                <StatLabel>Parcelas</StatLabel>
                                <StatNumber fontSize="md">
                                  {pedido.transacao_detalhes.parcelas}x de {formatarValor(pedido.transacao_detalhes.valor_parcela || 0)}
                                </StatNumber>
                              </Stat>
                            )}
                          </>
                        )}
                      </Grid>
                    ) : (
                      <Text color="gray.500">Nenhuma transação associada a este pedido.</Text>
                    )}
                    
                    {/* Mensagem de erro se houver */}
                    {pedido.error_message && (
                      <Box mt={6} p={4} bg="red.50" borderRadius="md">
                        <Heading size="sm" color="red.500" mb={2}>
                          Mensagem de Erro
                        </Heading>
                        <Text color="red.600" fontFamily="mono" fontSize="sm">
                          {pedido.error_message}
                        </Text>
                      </Box>
                    )}
                    
                    {/* Resposta da API se houver */}
                    {pedido.api_response && (
                      <Box mt={6}>
                        <Heading size="sm" mb={2}>
                          Resposta da API
                        </Heading>
                        <Box 
                          p={4} 
                          bg="gray.50" 
                          borderRadius="md" 
                          fontFamily="mono" 
                          fontSize="sm"
                          maxH="200px"
                          overflowY="auto"
                        >
                          <pre>{typeof pedido.api_response === 'string' 
                            ? pedido.api_response 
                            : JSON.stringify(pedido.api_response, null, 2)}</pre>
                        </Box>
                      </Box>
                    )}
                  </CardBody>
                </Card>
                
                {/* Histórico do pedido, se houver */}
                {pedido.historico && pedido.historico.length > 0 && (
                  <Card mt={6}>
                    <CardHeader>
                      <Heading size="md">Histórico do Pedido</Heading>
                    </CardHeader>
                    
                    <CardBody>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Data</Th>
                            <Th>Status</Th>
                            <Th>Descrição</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {pedido.historico.map((item, index) => (
                            <Tr key={index}>
                              <Td>{formatarData(item.data)}</Td>
                              <Td>{renderStatus(item.status)}</Td>
                              <Td>{item.descricao}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </GridItem>
              
              {/* Coluna da direita - Dados do cliente */}
              <GridItem>
                <Card>
                  <CardHeader>
                    <Heading size="md">Dados do Cliente</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Icon as={FiUser} mr={2} />
                          Nome
                        </Text>
                        <Text>{pedido.cliente_nome || 'N/A'}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold">Email</Text>
                        <Text>{pedido.cliente_email || 'N/A'}</Text>
                      </Box>
                      
                      {pedido.cliente_telefone && (
                        <Box>
                          <Text fontWeight="bold">Telefone</Text>
                          <Text>{pedido.cliente_telefone}</Text>
                        </Box>
                      )}
                      
                      <Box>
                        <Text fontWeight="bold">ID do Cliente</Text>
                        <Text fontFamily="mono">{pedido.cliente_id}</Text>
                      </Box>
                      
                      <Button
                        as={Link}
                        href={`/usuarios/${pedido.cliente_id}`}
                        colorScheme="brand"
                        variant="outline"
                        width="full"
                        mt={2}
                      >
                        Ver Perfil do Cliente
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
                
                {/* Metadados adicionais, se houver */}
                {pedido.metadados && Object.keys(pedido.metadados).length > 0 && (
                  <Card mt={6}>
                    <CardHeader>
                      <Heading size="md">Metadados</Heading>
                    </CardHeader>
                    
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {Object.entries(pedido.metadados).map(([chave, valor]) => (
                          <Box key={chave}>
                            <Text fontWeight="bold">{chave}</Text>
                            <Text>
                              {typeof valor === 'object' 
                                ? JSON.stringify(valor) 
                                : String(valor)}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </GridItem>
            </Grid>
          </Box>
        )}
      </Container>
      
      {/* Diálogo de confirmação para reenvio */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirmar Reenvio
            </AlertDialogHeader>

            <AlertDialogBody>
              Tem certeza que deseja reenviar este pedido? Esta ação irá tentar processar o pedido novamente.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={reenviarPedido} 
                ml={3}
                isLoading={isProcessing}
              >
                Reenviar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PedidoDetalhes; 