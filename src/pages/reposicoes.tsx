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
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Textarea,
  FormControl,
  FormLabel,
  Stack,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiMoreVertical, FiEye, FiCheck, FiX, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

// Interface para reposições
interface Reposicao {
  id: string;
  pedido_id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  data_solicitacao: Date;
  data_resposta?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  motivo: string;
  resposta?: string;
  processado_por?: string;
  produto_nome: string;
  quantidade: number;
  valor: number;
  servico_tipo: string;
}

export default function Reposicoes() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const [reposicoes, setReposicoes] = useState<Reposicao[]>([]);
  const [totalReposicoes, setTotalReposicoes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  
  // Estados para o diálogo de aprovação/rejeição
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedReposicao, setSelectedReposicao] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Função para carregar reposições com filtros
  const carregarReposicoes = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {
        pagina,
        limite: itensPorPagina
      };
      
      if (filtroStatus !== 'todos') {
        params.status = filtroStatus;
      }
      
      if (termoBusca) {
        params.termoBusca = termoBusca;
      }
      
      console.log('Carregando reposições com parâmetros:', params);
      
      const response = await axios.get('/api/reposicoes', { 
        params,
        timeout: 10000 // 10 segundos de timeout
      });
      
      console.log('Resposta da API de reposições:', response.data);
      
      setReposicoes(response.data.reposicoes);
      setTotalReposicoes(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar reposições:', error);
      
      // Se a API estiver indisponível, usar dados mockados
      const mockReposicoes: Reposicao[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `mock-${i+1}`,
        pedido_id: `order-${10000 + i}`,
        cliente_id: `client-${i}`,
        cliente_nome: `Cliente Teste ${i+1}`,
        cliente_email: `cliente${i+1}@teste.com`,
        data_solicitacao: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: ['pending', 'approved', 'rejected', 'processing'][Math.floor(Math.random() * 4)] as any,
        motivo: 'Problema com o serviço fornecido. O cliente não recebeu a quantidade esperada.',
        produto_nome: 'Curtidas Instagram',
        quantidade: 1000,
        valor: 50.0,
        servico_tipo: 'Likes',
      }));
      
      setReposicoes(mockReposicoes);
      setTotalReposicoes(mockReposicoes.length);
      
      // Exibir mensagem de erro
      toast({
        title: 'Erro ao carregar reposições',
        description: 'Utilizando dados offline. O sistema tentará reconectar em breve.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Tentar novamente após 30 segundos
      setTimeout(() => {
        if (isAuthenticated) carregarReposicoes();
      }, 30000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar reposições quando os filtros ou a página mudarem
  useEffect(() => {
    if (isAuthenticated) {
      carregarReposicoes();
    }
  }, [isAuthenticated, pagina, itensPorPagina]);
  
  // Função para aplicar filtros
  const aplicarFiltros = () => {
    setPagina(1); // Resetar para a primeira página ao filtrar
    carregarReposicoes();
  };
  
  // Abrir diálogo para aprovar ou rejeitar
  const abrirDialogo = (id: string, action: 'approve' | 'reject') => {
    setSelectedReposicao(id);
    setDialogAction(action);
    setResposta('');
    setIsDialogOpen(true);
  };
  
  // Fechar diálogo
  const fecharDialogo = () => {
    setIsDialogOpen(false);
    setSelectedReposicao(null);
    setDialogAction(null);
    setResposta('');
  };
  
  // Função para aprovar ou rejeitar uma reposição
  const processarReposicao = async () => {
    if (!selectedReposicao || !dialogAction) return;
    
    try {
      setIsProcessing(true);
      const action = dialogAction === 'approve' ? 'aprovar' : 'rejeitar';
      
      const response = await axios.post(`/api/reposicoes/${selectedReposicao}/${action}`, {
        resposta
      });
      
      if (response.data.success) {
        toast({
          title: dialogAction === 'approve' ? 'Reposição aprovada' : 'Reposição rejeitada',
          description: `A solicitação de reposição foi ${dialogAction === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Atualizar a lista de reposições
        carregarReposicoes();
      } else {
        toast({
          title: `Falha ao ${action} reposição`,
          description: response.data.message || `Não foi possível ${action} a reposição.`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error(`Erro ao processar reposição ${selectedReposicao}:`, error);
      toast({
        title: 'Erro ao processar reposição',
        description: 'Ocorreu um erro ao processar a solicitação de reposição.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
      fecharDialogo();
    }
  };
  
  // Função para visualizar detalhes do pedido original
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
  
  // Função para exibir o status com a cor adequada
  const renderStatus = (status: string) => {
    let color = 'gray';
    let texto = 'Desconhecido';
    let icon = null;
    
    switch (status) {
      case 'approved':
        color = 'green';
        texto = 'Aprovada';
        icon = <FiCheck />;
        break;
      case 'processing':
        color = 'blue';
        texto = 'Processando';
        icon = <FiRefreshCw />;
        break;
      case 'pending':
        color = 'yellow';
        texto = 'Pendente';
        icon = null;
        break;
      case 'rejected':
        color = 'red';
        texto = 'Rejeitada';
        icon = <FiX />;
        break;
      default:
        texto = status;
    }
    
    return (
      <Badge 
        colorScheme={color} 
        display="flex" 
        alignItems="center" 
        px={2} 
        py={1}
      >
        {icon && <Box mr={1}>{icon}</Box>}
        {texto}
      </Badge>
    );
  };
  
  // Calcular número total de páginas
  const totalPaginas = Math.ceil(totalReposicoes / itensPorPagina);
  
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
          Solicitações de Reposição
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
              placeholder="Buscar por cliente ou pedido" 
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
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="processing">Em processamento</option>
              <option value="rejected">Rejeitadas</option>
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
              onClick={carregarReposicoes}
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
                <Th>Data Solicitação</Th>
                <Th>Cliente</Th>
                <Th>Serviço</Th>
                <Th>Qtd</Th>
                <Th>Status</Th>
                <Th width="120px">Ações</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={6}>
                    <Spinner size="md" color="brand.500" mx="auto" />
                    <Text mt={2}>Carregando solicitações...</Text>
                  </Td>
                </Tr>
              ) : reposicoes.length > 0 ? (
                reposicoes.map((reposicao) => (
                  <Tr key={reposicao.id}>
                    <Td fontFamily="mono">{reposicao.id}</Td>
                    <Td>{formatarData(reposicao.data_solicitacao)}</Td>
                    <Td>{reposicao.cliente_nome}</Td>
                    <Td>{reposicao.produto_nome}</Td>
                    <Td>{reposicao.quantidade.toLocaleString()}</Td>
                    <Td>{renderStatus(reposicao.status)}</Td>
                    <Td>
                      <HStack>
                        <Tooltip label="Ver pedido original">
                          <IconButton
                            aria-label="Ver pedido original"
                            icon={<FiEye />}
                            size="sm"
                            variant="ghost"
                            onClick={() => verDetalhesPedido(reposicao.pedido_id)}
                          />
                        </Tooltip>
                        
                        {reposicao.status === 'pending' && (
                          <>
                            <Tooltip label="Aprovar">
                              <IconButton
                                aria-label="Aprovar"
                                icon={<FiCheck />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                onClick={() => abrirDialogo(reposicao.id, 'approve')}
                              />
                            </Tooltip>
                            
                            <Tooltip label="Rejeitar">
                              <IconButton
                                aria-label="Rejeitar"
                                icon={<FiX />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => abrirDialogo(reposicao.id, 'reject')}
                              />
                            </Tooltip>
                          </>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={4}>
                    Nenhuma solicitação de reposição encontrada
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          
          {/* Paginação */}
          {!isLoading && reposicoes.length > 0 && (
            <Flex justify="space-between" align="center" p={4} borderTop="1px" borderColor="gray.200">
              <Text color="gray.500">
                Mostrando {reposicoes.length} de {totalReposicoes} resultados
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
      
      {/* Diálogo de aprovação/rejeição */}
      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={fecharDialogo}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {dialogAction === 'approve' 
                ? 'Aprovar Reposição' 
                : 'Rejeitar Reposição'}
            </AlertDialogHeader>

            <AlertDialogBody>
              <Stack spacing={4}>
                <Text>
                  {dialogAction === 'approve'
                    ? 'Tem certeza que deseja aprovar esta solicitação de reposição? Isso iniciará o processo de nova entrega.'
                    : 'Tem certeza que deseja rejeitar esta solicitação? Esta ação não pode ser desfeita.'}
                </Text>
                
                <FormControl>
                  <FormLabel>
                    {dialogAction === 'approve' 
                      ? 'Observações (opcional)' 
                      : 'Motivo da rejeição'}
                  </FormLabel>
                  <Textarea
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    placeholder={dialogAction === 'approve' 
                      ? 'Adicione observações para o processamento...' 
                      : 'Informe o motivo da rejeição...'}
                    required={dialogAction === 'reject'}
                  />
                </FormControl>
              </Stack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={fecharDialogo}>
                Cancelar
              </Button>
              <Button 
                colorScheme={dialogAction === 'approve' ? 'green' : 'red'}
                onClick={processarReposicao}
                ml={3}
                isLoading={isProcessing}
                isDisabled={dialogAction === 'reject' && !resposta.trim()}
              >
                {dialogAction === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </AdminLayout>
  );
} 