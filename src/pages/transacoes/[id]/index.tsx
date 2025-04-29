import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Spinner,
  SimpleGrid,
  Divider,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Stack,
  StackDivider,
  HStack,
  VStack,
  Link,
  useToast,
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
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiArrowLeft, FiExternalLink, FiUser, FiShoppingBag, FiCreditCard, FiCalendar, FiDollarSign, FiCheckCircle, FiAlertCircle, FiWhatsapp, FiMail, FiFileText } from 'react-icons/fi';
import AdminLayout from '../../../components/Layout/AdminLayout';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
import NextLink from 'next/link';

// Interface para detalhes da transação
interface TransacaoDetalhes {
  id: string;
  external_id: string;
  reference: string;
  data_criacao: Date;
  data_atualizacao?: Date;
  valor: number;
  status: string;
  metodo_pagamento: string;
  provedor?: string;
  parcelas?: number;
  payment_request_id?: string;
  cliente: {
    nome: string;
    email: string;
    documento?: string;
    telefone?: string;
  };
  produto: {
    id: string;
    nome: string;
    descricao?: string;
  };
  vinculacoes: {
    order_id?: string;
    user_id?: string;
  };
  metadata?: {
    transaction?: any;
    payment_request?: any;
  };
}

// Interface para detalhes do pedido
interface PedidoDetalhes {
  id: string;
  status: string;
  valor: number;
  data_criacao: Date;
  cliente_nome: string;
  cliente_email: string;
  produto_nome: string;
  metadata?: any;
}

export default function DetalhesTransacao() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  
  const [transacao, setTransacao] = useState<TransacaoDetalhes | null>(null);
  const [pedidoVinculado, setPedidoVinculado] = useState<PedidoDetalhes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPedido, setLoadingPedido] = useState(false);
  
  // Cores para o tema
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBgColor = useColorModeValue('gray.50', 'gray.700');
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Carregar detalhes da transação
  useEffect(() => {
    if (isAuthenticated && id) {
      carregarDetalhesTransacao();
    }
  }, [isAuthenticated, id]);
  
  // Carregar detalhes do pedido vinculado quando a transação for carregada
  useEffect(() => {
    if (transacao?.vinculacoes?.order_id) {
      carregarPedidoVinculado(transacao.vinculacoes.order_id);
    }
  }, [transacao]);
  
  // Função para carregar detalhes da transação
  const carregarDetalhesTransacao = async () => {
    try {
      setIsLoading(true);
      
      console.log(`[DetalhesTransacao] Carregando detalhes da transação ${id}`);
      
      // Chamar a API para obter detalhes da transação
      const response = await axios.get(`/api/transacoes/${id}`);
      
      console.log('[DetalhesTransacao] Resposta recebida:', response.data);
      
      if (response.data.transacao) {
        setTransacao(response.data.transacao);
      } else {
        toast({
          title: 'Erro ao carregar transação',
          description: 'Não foi possível encontrar os detalhes da transação.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[DetalhesTransacao] Erro ao carregar detalhes da transação:', error);
      toast({
        title: 'Erro ao carregar transação',
        description: 'Ocorreu um erro ao buscar os detalhes da transação.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para carregar detalhes do pedido vinculado
  const carregarPedidoVinculado = async (orderId: string) => {
    try {
      setLoadingPedido(true);
      
      console.log(`[DetalhesTransacao] Carregando pedido vinculado ${orderId}`);
      
      // Chamar a API para obter detalhes do pedido
      const response = await axios.get(`/api/pedidos/${orderId}`);
      
      console.log('[DetalhesTransacao] Resposta do pedido recebida:', response.data);
      
      if (response.data.pedido) {
        setPedidoVinculado(response.data.pedido);
      }
    } catch (error) {
      console.error('[DetalhesTransacao] Erro ao carregar pedido vinculado:', error);
      // Não exibir toast de erro para não confundir o usuário
    } finally {
      setLoadingPedido(false);
    }
  };
  
  // Função para formatar data
  const formatarData = (dataISO: Date) => {
    if (!dataISO) return '-';
    
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Formatação de valor monetário
  const formatarValor = (valor: number) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  // Função para exibir o status com a cor adequada
  const renderStatus = (status: string) => {
    let color = 'gray';
    let texto = 'Desconhecido';
    
    switch (status?.toLowerCase()) {
      case 'aprovado':
      case 'approved':
        color = 'green';
        texto = 'Aprovado';
        break;
      case 'pendente':
      case 'pending':
        color = 'yellow';
        texto = 'Pendente';
        break;
      case 'recusado':
      case 'rejected':
      case 'declined':
        color = 'red';
        texto = 'Recusado';
        break;
      case 'estornado':
      case 'refunded':
        color = 'purple';
        texto = 'Estornado';
        break;
      case 'em_analise':
      case 'in_process':
      case 'in_analysis':
        color = 'blue';
        texto = 'Em Análise';
        break;
      default:
        texto = status || 'Desconhecido';
    }
    
    return <Badge colorScheme={color} fontSize="md" px={2} py={1}>{texto}</Badge>;
  };
  
  // Função para renderizar o método de pagamento
  const renderMetodoPagamento = (metodo: string) => {
    let texto = metodo || 'Desconhecido';
    let icone = FiCreditCard;
    
    switch (metodo?.toLowerCase()) {
      case 'credit_card':
        texto = 'Cartão de Crédito';
        break;
      case 'boleto':
        texto = 'Boleto';
        break;
      case 'pix':
        texto = 'PIX';
        break;
    }
    
    return (
      <HStack>
        <Icon as={icone} />
        <Text>{texto}</Text>
      </HStack>
    );
  };
  
  if (authLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }
  
  return (
    <AdminLayout>
      <Box p={4}>
        <Flex mb={6} align="center">
          <Button 
            leftIcon={<FiArrowLeft />} 
            variant="ghost" 
            onClick={() => router.push('/transacoes')}
            mr={4}
          >
            Voltar
          </Button>
          <Heading as="h1" size="xl">
            Detalhes da Transação
          </Heading>
        </Flex>
        
        {isLoading ? (
          <Flex justify="center" align="center" h="300px">
            <Spinner size="xl" color="brand.500" />
          </Flex>
        ) : transacao ? (
          <Box>
            {/* Resumo da transação */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="md" color="gray.500">Valor</StatLabel>
                    <StatNumber fontSize="2xl" color="brand.500">{formatarValor(transacao.valor)}</StatNumber>
                    <StatHelpText>
                      {transacao.parcelas && transacao.parcelas > 1 ? `${transacao.parcelas}x de ${formatarValor(transacao.valor / transacao.parcelas)}` : 'Pagamento à vista'}
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="md" color="gray.500">Status</StatLabel>
                    <Box mt={2}>
                      {renderStatus(transacao.status)}
                    </Box>
                    <StatHelpText>
                      Atualizado em: {formatarData(transacao.data_atualizacao || transacao.data_criacao)}
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="md" color="gray.500">Método de Pagamento</StatLabel>
                    <StatNumber fontSize="xl">
                      {renderMetodoPagamento(transacao.metodo_pagamento)}
                    </StatNumber>
                    <StatHelpText>
                      Provedor: {transacao.provedor || 'Não informado'}
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
            
            {/* Detalhes da transação */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardHeader bg={headerBgColor} borderTopRadius="lg">
                  <Heading size="md">Informações da Transação</Heading>
                </CardHeader>
                <CardBody>
                  <Stack divider={<StackDivider borderColor={borderColor} />} spacing={4}>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">ID da Transação</Text>
                      <Text fontFamily="mono">{transacao.id}</Text>
                    </Box>
                    
                    {transacao.external_id && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.500">ID Externo</Text>
                        <Text fontFamily="mono">{transacao.external_id}</Text>
                      </Box>
                    )}
                    
                    {transacao.reference && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.500">Referência</Text>
                        <Text>{transacao.reference}</Text>
                      </Box>
                    )}
                    
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.500">Data da Transação</Text>
                      <Text>{formatarData(transacao.data_criacao)}</Text>
                    </Box>
                    
                    {transacao.payment_request_id && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.500">ID da Solicitação de Pagamento</Text>
                        <Text fontFamily="mono">{transacao.payment_request_id}</Text>
                      </Box>
                    )}
                  </Stack>
                </CardBody>
              </Card>
              
              {/* Informações do Cliente */}
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardHeader bg={headerBgColor} borderTopRadius="lg">
                  <Heading size="md">Informações do Cliente</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <HStack>
                      <Icon as={FiUser} color="blue.500" />
                      <Text fontWeight="medium">{transacao.cliente.nome}</Text>
                    </HStack>
                    
                    {transacao.cliente.email && (
                      <HStack>
                        <Icon as={FiMail} color="blue.500" />
                        <Text>{transacao.cliente.email}</Text>
                      </HStack>
                    )}
                    
                    {transacao.cliente.telefone && (
                      <HStack>
                        <Icon as={FiWhatsapp} color="green.500" />
                        <Link 
                          href={`https://wa.me/${transacao.cliente.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="green.500"
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {transacao.cliente.telefone}
                        </Link>
                      </HStack>
                    )}
                    
                    {transacao.cliente.documento && (
                      <HStack>
                        <Icon as={FiFileText} color="blue.500" />
                        <Text>{transacao.cliente.documento}</Text>
                      </HStack>
                    )}
                  </Stack>
                </CardBody>
              </Card>
            </SimpleGrid>
            
            {/* Produto e Pedido Vinculado */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardHeader bg={headerBgColor} borderTopRadius="lg">
                  <Heading size="md">Informações do Produto</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <HStack>
                      <Icon as={FiShoppingBag} color="blue.500" />
                      <Text fontWeight="medium">{transacao.produto.nome}</Text>
                    </HStack>
                    
                    {transacao.produto.descricao && (
                      <Text color="gray.600">{transacao.produto.descricao}</Text>
                    )}
                    
                    {transacao.vinculacoes.order_id && (
                      <HStack>
                        <Icon as={FiExternalLink} color="blue.500" />
                        <Link 
                          href={`/pedidos/${transacao.vinculacoes.order_id}`}
                          color="blue.500"
                          _hover={{ textDecoration: 'underline' }}
                        >
                          Ver pedido #{transacao.vinculacoes.order_id}
                        </Link>
                      </HStack>
                    )}
                  </Stack>
                </CardBody>
              </Card>
              
              {/* Pedido Vinculado */}
              <Card bg={bgColor} shadow="md" borderRadius="lg">
                <CardHeader bg={headerBgColor} borderTopRadius="lg">
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Pedido Vinculado</Heading>
                    {loadingPedido && <Spinner size="sm" />}
                  </Flex>
                </CardHeader>
                <CardBody>
                  {transacao.vinculacoes.order_id ? (
                    pedidoVinculado ? (
                      <Stack divider={<StackDivider borderColor={borderColor} />} spacing={4}>
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="gray.500">ID do Pedido</Text>
                          <HStack>
                            <Text fontFamily="mono">{pedidoVinculado.id}</Text>
                            <NextLink href={`/pedidos/${pedidoVinculado.id}`} passHref>
                              <Button as="a" size="xs" colorScheme="blue" leftIcon={<FiExternalLink />}>
                                Ver Pedido
                              </Button>
                            </NextLink>
                          </HStack>
                        </Box>
                        
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="gray.500">Status do Pedido</Text>
                          <Badge colorScheme={
                            pedidoVinculado.status === 'completed' ? 'green' :
                            pedidoVinculado.status === 'pending' ? 'yellow' :
                            pedidoVinculado.status === 'failed' ? 'red' :
                            'gray'
                          }>
                            {pedidoVinculado.status}
                          </Badge>
                        </Box>
                        
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="gray.500">Valor do Pedido</Text>
                          <Text>{formatarValor(pedidoVinculado.valor)}</Text>
                        </Box>
                        
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="gray.500">Data do Pedido</Text>
                          <Text>{formatarData(pedidoVinculado.data_criacao)}</Text>
                        </Box>
                      </Stack>
                    ) : loadingPedido ? (
                      <Flex justify="center" align="center" h="100px">
                        <Spinner size="md" color="brand.500" />
                      </Flex>
                    ) : (
                      <Box textAlign="center" py={4}>
                        <Text>Pedido não encontrado ou inacessível.</Text>
                        <Text fontSize="sm" color="gray.500" mt={2}>ID: {transacao.vinculacoes.order_id}</Text>
                      </Box>
                    )
                  ) : (
                    <Box textAlign="center" py={4}>
                      <Text>Nenhum pedido vinculado a esta transação.</Text>
                    </Box>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
            
            {/* Metadados (expandido/colapsado) */}
            {(transacao.metadata?.transaction || transacao.metadata?.payment_request) && (
              <Card bg={bgColor} shadow="md" borderRadius="lg" mb={6}>
                <CardHeader bg={headerBgColor} borderTopRadius="lg">
                  <Heading size="md">Metadados</Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {transacao.metadata?.transaction && (
                      <Box>
                        <Text fontWeight="bold" mb={2}>Metadados da Transação</Text>
                        <Box 
                          bg="gray.50" 
                          p={3} 
                          borderRadius="md" 
                          fontFamily="mono" 
                          fontSize="sm"
                          overflowX="auto"
                        >
                          <pre>{JSON.stringify(transacao.metadata.transaction, null, 2)}</pre>
                        </Box>
                      </Box>
                    )}
                    
                    {transacao.metadata?.payment_request && (
                      <Box>
                        <Text fontWeight="bold" mb={2}>Metadados da Solicitação de Pagamento</Text>
                        <Box 
                          bg="gray.50" 
                          p={3} 
                          borderRadius="md" 
                          fontFamily="mono" 
                          fontSize="sm"
                          overflowX="auto"
                        >
                          <pre>{JSON.stringify(transacao.metadata.payment_request, null, 2)}</pre>
                        </Box>
                      </Box>
                    )}
                  </SimpleGrid>
                </CardBody>
              </Card>
            )}
          </Box>
        ) : (
          <Box textAlign="center" py={10}>
            <Icon as={FiAlertCircle} boxSize={10} color="red.500" mb={4} />
            <Heading as="h2" size="lg" mb={2}>Transação não encontrada</Heading>
            <Text color="gray.600" mb={6}>
              Não foi possível encontrar os detalhes da transação solicitada.
            </Text>
            <Button 
              colorScheme="brand" 
              leftIcon={<FiArrowLeft />}
              onClick={() => router.push('/transacoes')}
            >
              Voltar para a lista de transações
            </Button>
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
}
