import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  useColorModeValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiMoreVertical, FiEye, FiRefreshCw } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';

// Interface para pedidos
interface Pedido {
  id: string;
  data_criacao: Date;
  provedor_id: string;
  provedor_nome: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor: number;
  status: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  transacao_id?: string;
  provider_order_id?: string;
  api_response?: any;
  error_message?: string;
  last_check?: Date;
  service_name?: string;
}

export default function Pedidos() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroProvedor, setFiltroProvedor] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [provedores, setProvedores] = useState<{id: string, nome: string}[]>([]);
  const [pedidoParaReenviar, setPedidoParaReenviar] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReenviando, setIsReenviando] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Carregar lista de provedores ao iniciar
  useEffect(() => {
    if (isAuthenticated) {
      carregarProvedores();
    }
  }, [isAuthenticated]);
  
  // Função para carregar provedores
  const carregarProvedores = async () => {
    try {
      const response = await axios.get('/api/provedores');
      setProvedores(response.data);
    } catch (error) {
      console.error('Erro ao carregar provedores:', error);
      
      // Utilizar dados mockados quando a API falhar
      setProvedores([
        { id: 'mock-1', nome: 'Provedor 1 (offline)' },
        { id: 'mock-2', nome: 'Provedor 2 (offline)' }
      ]);
      
      toast({
        title: 'Erro ao carregar provedores',
        description: 'Utilizando dados offline. O sistema tentará reconectar em breve.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      
      // Tentativa de reconexão após 30 segundos
      setTimeout(() => {
        if (isAuthenticated) carregarProvedores();
      }, 30000);
    }
  };
  
  // Função para carregar pedidos com filtros
  const carregarPedidos = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {
        pagina,
        limite: itensPorPagina
      };
      
      if (filtroStatus !== 'todos') {
        params.status = filtroStatus;
      }
      
      if (filtroProvedor !== 'todos') {
        params.provedor = filtroProvedor;
      }
      
      if (termoBusca) {
        params.termoBusca = termoBusca;
      }
      
      console.log('Carregando pedidos com parâmetros:', params);
      
      const response = await axios.get('/api/pedidos', { 
        params,
        timeout: 15000 // 15 segundos de timeout
      });
      
      console.log('Resposta da API de pedidos:', response.data);
      
      // Verifica se a resposta contém dados reais ou mockados
      if (response.data.mock) {
        // Se forem dados mockados, exibe um aviso
        toast({
          title: 'Aviso: Dados temporários',
          description: 'Exibindo dados temporários. O sistema tentará reconectar ao banco de dados em breve.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
      
      setPedidos(response.data.pedidos);
      setTotalPedidos(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      
      // Se a API estiver indisponível, usar dados mockados
      const mockPedidos: Pedido[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `mock-${i+1}`,
        data_criacao: new Date(),
        provedor_id: 'mock-prov',
        provedor_nome: 'Provedor (offline)',
        produto_id: 'mock-prod',
        produto_nome: 'Produto de teste',
        quantidade: 100,
        valor: 50.0,
        status: ['pendente', 'processando', 'completo', 'falha', 'cancelado', 'parcial'][Math.floor(Math.random() * 6)],
        cliente_id: 'mock-client',
        cliente_nome: 'Cliente de teste',
        cliente_email: 'teste@exemplo.com'
      }));
      
      setPedidos(mockPedidos);
      setTotalPedidos(mockPedidos.length);
      
      // Exibir mensagem de erro
      toast({
        title: 'Erro ao carregar pedidos',
        description: 'Utilizando dados offline. O sistema tentará reconectar em breve.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Tentar novamente após 30 segundos
      setTimeout(() => {
        if (isAuthenticated) carregarPedidos();
      }, 30000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar pedidos quando os filtros ou a página mudarem
  useEffect(() => {
    if (isAuthenticated) {
      carregarPedidos();
    }
  }, [isAuthenticated, pagina, itensPorPagina]);
  
  // Função para aplicar filtros
  const aplicarFiltros = () => {
    setPagina(1); // Resetar para a primeira página ao filtrar
    carregarPedidos();
  };
  
  // Função para abrir o diálogo de confirmação para reenvio
  const confirmarReenvio = (id: string) => {
    setPedidoParaReenviar(id);
    setIsDialogOpen(true);
  };
  
  // Função para fechar o diálogo de confirmação
  const fecharDialogo = () => {
    setIsDialogOpen(false);
    setPedidoParaReenviar(null);
  };
  
  // Função para reenviar o pedido
  const confirmarEReenviarPedido = async () => {
    if (!pedidoParaReenviar) return;
    
    try {
      setIsReenviando(true);
      const response = await axios.post(`/api/pedidos/${pedidoParaReenviar}/reenviar`);
      
      if (response.data.success) {
        toast({
          title: 'Pedido reenviado',
          description: `O pedido ${pedidoParaReenviar} foi marcado para reprocessamento.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Atualizar a lista de pedidos
        carregarPedidos();
      } else {
        toast({
          title: 'Falha ao reenviar pedido',
          description: 'Não foi possível reenviar o pedido. Verifique se o status está correto.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error(`Erro ao reenviar pedido ${pedidoParaReenviar}:`, error);
      
      toast({
        title: 'Falha ao reenviar pedido',
        description: 'Ocorreu um erro ao tentar reenviar o pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsReenviando(false);
      fecharDialogo();
    }
  };
  
  // Função para atualizar o status de um pedido
  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      const response = await axios.put(`/api/pedidos/${id}/status`, {
        status: novoStatus
      });
      
      if (response.data.success) {
        toast({
          title: 'Status atualizado',
          description: `O pedido foi marcado como ${novoStatus}.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Atualizar a lista de pedidos
        carregarPedidos();
      } else {
        toast({
          title: 'Falha ao atualizar status',
          description: response.data.message || 'Não foi possível atualizar o status do pedido.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error(`Erro ao atualizar status do pedido ${id}:`, error);
      
      toast({
        title: 'Falha ao atualizar status',
        description: 'Ocorreu um erro ao tentar atualizar o status do pedido.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Função para visualizar detalhes de um pedido
  const verDetalhesPedido = (id: string) => {
    router.push(`/pedidos/${id}`);
  };
  
  // Função para formatar data
  const formatarData = (dataISO: Date) => {
    if (!dataISO) return '-';
    
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
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
  
  // Função para obter a cor do badge de status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente':
      case 'pending':
        return 'yellow';
      case 'processando':
      case 'processing':
      case 'in progress':
        return 'blue';
      case 'completo':
      case 'completed':
      case 'success':
        return 'green';
      case 'falha':
      case 'failed':
      case 'rejected':
        return 'red';
      case 'cancelado':
      case 'canceled':
        return 'gray';
      case 'parcial':
      case 'partial':
        return 'purple';
      default:
        return 'gray';
    }
  };
  
  // Função para traduzir o status para português
  const getOrderStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    
    // Tradução do status para português
    let statusText = status;
    switch (statusLower) {
      case 'pending':
        statusText = 'Pendente';
        break;
      case 'processing':
      case 'in progress':
        statusText = 'Processando';
        break;
      case 'completed':
      case 'success':
        statusText = 'Concluído';
        break;
      case 'failed':
      case 'rejected':
        statusText = 'Falhou';
        break;
      case 'canceled':
        statusText = 'Cancelado';
        break;
      case 'partial':
        statusText = 'Parcial';
        break;
    }
    
    return {
      text: statusText,
      color: getStatusColor(statusLower)
    };
  };
  
  // Calcular número total de páginas
  const totalPaginas = Math.ceil(totalPedidos / itensPorPagina);
  
  // Ir para a próxima página
  const proximaPagina = () => {
    if (pagina < totalPaginas) {
      setPagina(pagina + 1);
    }
  };
  
  // Ir para a página anterior
  const paginaAnterior = () => {
    if (pagina > 1) {
      setPagina(pagina - 1);
    }
  };

  // Adicionar este useEffect para configurar o axios
  useEffect(() => {
    // Recuperar o token do armazenamento local
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // Configurar o interceptor para adicionar o token a todas as requisições
      const interceptor = axios.interceptors.request.use(
        config => {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        },
        error => Promise.reject(error)
      );
      
      // Limpar o interceptor quando o componente for desmontado
      return () => {
        axios.interceptors.request.eject(interceptor);
      };
    }
  }, []);

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
        <Heading as="h1" size="xl" mb={6}>
          Pedidos
        </Heading>
        
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          justify="space-between" 
          align={{ base: 'stretch', md: 'center' }}
          mb={6}
          gap={4}
        >
          <InputGroup maxW={{ base: '100%', md: '320px' }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input 
              placeholder="Buscar por ID, cliente ou produto" 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </InputGroup>
          
          <HStack spacing={4} flexWrap="wrap">
            <Select 
              maxW="180px"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="completo">Completo</option>
              <option value="processando">Processando</option>
              <option value="pendente">Pendente</option>
              <option value="falha">Falha</option>
              <option value="cancelado">Cancelado</option>
            </Select>
            
            <Select 
              maxW="180px"
              value={filtroProvedor}
              onChange={(e) => setFiltroProvedor(e.target.value)}
              isDisabled={provedores.length === 0}
            >
              <option value="todos">Todos os provedores</option>
              {provedores.map(provedor => (
                <option key={provedor.id} value={provedor.id}>
                  {provedor.nome}
                </option>
              ))}
            </Select>
            
            <Button 
              colorScheme="brand"
              onClick={aplicarFiltros}
              leftIcon={<FiFilter />}
              isDisabled={isLoading}
            >
              Filtrar
            </Button>
            
            <Button
              variant="outline"
              leftIcon={<FiRefreshCw />}
              onClick={carregarPedidos}
              isLoading={isLoading}
            >
              Atualizar
            </Button>
          </HStack>
        </Flex>
        
        <Box
          overflowX="auto"
          bg={useColorModeValue('white', 'gray.800')}
          shadow="md"
          rounded="lg"
        >
          <Table variant="simple">
            <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
              <Tr>
                <Th>ID</Th>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th>Produto</Th>
                <Th>Provedor</Th>
                <Th isNumeric>Qtd</Th>
                <Th isNumeric>Valor</Th>
                <Th>Status</Th>
                <Th width="120px">Ações</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={9} textAlign="center" py={6}>
                    <Spinner size="md" color="brand.500" mx="auto" />
                    <Text mt={2}>Carregando pedidos...</Text>
                  </Td>
                </Tr>
              ) : pedidos.length > 0 ? (
                pedidos.map((pedido) => (
                  <Tr key={pedido.id}>
                    <Td fontFamily="mono">{pedido.id}</Td>
                    <Td>{formatarData(pedido.data_criacao)}</Td>
                    <Td>{pedido.cliente_nome || pedido.cliente_id}</Td>
                    <Td>{pedido.service_name || pedido.produto_nome}</Td>
                    <Td>{pedido.provedor_nome}</Td>
                    <Td isNumeric>{pedido.quantidade.toLocaleString()}</Td>
                    <Td isNumeric>{formatarValor(pedido.valor)}</Td>
                    <Td>
                      <Badge colorScheme={getOrderStatusBadge(pedido.status).color}>
                        {getOrderStatusBadge(pedido.status).text}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Ver detalhes"
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          onClick={() => verDetalhesPedido(pedido.id)}
                        />
                        <IconButton
                          aria-label="Enviar manualmente"
                          icon={<FiRefreshCw />}
                          size="sm"
                          variant="ghost"
                          onClick={() => confirmarReenvio(pedido.id)}
                          isDisabled={!['falha', 'pendente'].includes(pedido.status)}
                        />
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Atualizar Status"
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem onClick={() => atualizarStatus(pedido.id, 'pendente')}>
                              Marcar como Pendente
                            </MenuItem>
                            <MenuItem onClick={() => atualizarStatus(pedido.id, 'processando')}>
                              Marcar como Processando
                            </MenuItem>
                            <MenuItem onClick={() => atualizarStatus(pedido.id, 'completo')}>
                              Marcar como Completo
                            </MenuItem>
                            <MenuItem onClick={() => atualizarStatus(pedido.id, 'falha')}>
                              Marcar como Falha
                            </MenuItem>
                            <MenuItem onClick={() => atualizarStatus(pedido.id, 'cancelado')}>
                              Marcar como Cancelado
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={9} textAlign="center" py={4}>
                    Nenhum pedido encontrado
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          
          {/* Paginação */}
          {!isLoading && pedidos.length > 0 && (
            <Flex justify="space-between" align="center" p={4} borderTop="1px" borderColor="gray.200">
              <Text color="gray.500">
                Mostrando {pedidos.length} de {totalPedidos} resultados
              </Text>
              <HStack>
                <Button
                  size="sm"
                  onClick={paginaAnterior}
                  isDisabled={pagina === 1}
                >
                  Anterior
                </Button>
                <Text>
                  Página {pagina} de {totalPaginas}
                </Text>
                <Button
                  size="sm"
                  onClick={proximaPagina}
                  isDisabled={pagina >= totalPaginas}
                >
                  Próxima
                </Button>
              </HStack>
            </Flex>
          )}
        </Box>
      </Box>
      
      {/* Diálogo de confirmação de reenvio */}
      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={fecharDialogo}
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
              <Button ref={cancelRef} onClick={fecharDialogo}>
                Cancelar
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={confirmarEReenviarPedido} 
                ml={3}
                isLoading={isReenviando}
              >
                Reenviar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </AdminLayout>
  );
} 