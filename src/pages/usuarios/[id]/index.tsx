import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Flex,
  Divider,
  Spinner,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup,
  Card,
  CardHeader,
  CardBody,
  Grid,
  GridItem,
  Icon,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Switch,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiCalendar, 
  FiDollarSign, FiShoppingBag, FiBarChart2, FiClock,
  FiActivity, FiEdit, FiLock, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import AdminLayout from '../../../components/Layout/AdminLayout';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';
import axios from 'axios';
// import { Usuario, MetricasUsuario } from '../../../services/usuariosService';

// Usar tipos simplificados para evitar problemas de compilação
type Usuario = any;
type MetricasUsuario = any;

// Interface simplificada para pedido
interface Pedido {
  id: string;
  data_criacao: string;
  status: string;
  valor: number;
  produto_nome: string;
  quantidade: number;
  provedor_nome?: string;
}

export default function DetalhesUsuario() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();
  
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [metricas, setMetricas] = useState<MetricasUsuario | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [historicoCompras, setHistoricoCompras] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  
  // Estado para edição de usuário
  const [usuarioEdit, setUsuarioEdit] = useState<Partial<Usuario>>({});
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Carregar dados do usuário
  useEffect(() => {
    if (isAuthenticated && id) {
      buscarDetalhesUsuario(id);
    }
  }, [isAuthenticated, id]);
  
  // Função para buscar detalhes do usuário
  const buscarDetalhesUsuario = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/usuarios/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar detalhes do usuário');
      }
      
      const data = await response.json();
      setUsuario(data);
      
      // Buscar pedidos do usuário depois de obter seus detalhes
      buscarPedidosUsuario(userId);
    } catch (error) {
      console.error('Erro ao buscar detalhes do usuário:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os detalhes do usuário',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para buscar pedidos do usuário
  const buscarPedidosUsuario = async (userId: string) => {
    try {
      setLoadingPedidos(true);
      const response = await fetch(`/api/usuarios/${userId}/pedidos`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar pedidos do usuário');
      }
      
      const data = await response.json();
      setPedidos(data.pedidos || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos do usuário',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };
  
  // Função para simular dados para desenvolvimento
  const simularDados = () => {
    const mockUsuario: any = {
      id: Number(id),
      nome: 'Usuário Simulado',
      email: 'usuario@exemplo.com',
      tipo: 'cliente',
      status: true,
      telefone: '(11) 99999-9999',
      data_cadastro: new Date(),
      ultimo_acesso: new Date(),
      foto_perfil: `https://i.pravatar.cc/150?img=${Number(id)}`,
      total_gasto: 1289.50,
      ultima_compra: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      quantidade_compras: 12
    };
    
    setUsuario(mockUsuario);
    setUsuarioEdit({
      nome: mockUsuario.nome,
      email: mockUsuario.email,
      telefone: mockUsuario.telefone,
      tipo: mockUsuario.tipo
    });
    
    const mockMetricas: any = {
      total_gasto: 1289.50,
      quantidade_compras: 12,
      ultima_compra: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      servico_mais_comprado: {
        nome: 'Curtidas Instagram',
        quantidade: 8
      },
      compras_recentes: Array.from({ length: 5 }).map((_, i) => ({
        id: `order-${i+1}`,
        data: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        valor: 50 + Math.random() * 200,
        servico: ['Curtidas Instagram', 'Seguidores Instagram', 'Visualizações TikTok'][Math.floor(Math.random() * 3)],
        status: ['completo', 'processando', 'pendente', 'falha'][Math.floor(Math.random() * 4)]
      })),
      media_mensal: 322.38,
      primeiro_pedido: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    };
    
    setMetricas(mockMetricas);
    setHistoricoCompras(mockMetricas.compras_recentes);
    setPermissoes(['ver_pedidos', 'ver_transacoes']);
  };
  
  // Função para salvar alterações do usuário
  const salvarAlteracoes = async () => {
    try {
      setIsSaving(true);
      
      const response = await axios.put(`/api/usuarios/${id}`, usuarioEdit);
      
      if (response.data) {
        setUsuario((prevUsuario: any) => ({ ...prevUsuario, ...response.data }));
        
        toast({
          title: 'Usuário atualizado',
          description: 'As informações do usuário foram atualizadas com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        onEditClose();
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Ocorreu um erro ao tentar atualizar o usuário.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Função para alterar a senha
  const alterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await axios.put(`/api/usuarios/${id}/senha`, { 
        senha: novaSenha 
      });
      
      if (response.data && response.data.success) {
        toast({
          title: 'Senha alterada',
          description: 'A senha foi alterada com sucesso.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        setNovaSenha('');
        setConfirmarSenha('');
        onPasswordClose();
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: 'Erro ao alterar senha',
        description: 'Ocorreu um erro ao tentar alterar a senha.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Função para formatar data
  const formatarData = (dataISO?: Date) => {
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
  
  // Função para renderizar o status do pedido
  const renderizarStatusPedido = (status: string) => {
    let color = 'gray';
    
    switch (status.toLowerCase()) {
      case 'completo':
      case 'completed':
      case 'success':
        color = 'green';
        break;
      case 'processando':
      case 'processing':
        color = 'blue';
        break;
      case 'pendente':
      case 'pending':
        color = 'yellow';
        break;
      case 'falha':
      case 'failed':
      case 'error':
        color = 'red';
        break;
      case 'cancelado':
      case 'cancelled':
        color = 'purple';
        break;
    }
    
    return <Badge colorScheme={color}>{status}</Badge>;
  };

  if (authLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <AdminLayout>
      <Container maxW="container.xl" py={6}>
        <Button
          as={Link}
          href="/usuarios"
          mb={6}
          leftIcon={<FiArrowLeft />}
          variant="outline"
        >
          Voltar para lista de usuários
        </Button>
        
        {isLoading ? (
          <Flex justify="center" align="center" py={12}>
            <Spinner size="xl" />
          </Flex>
        ) : !usuario ? (
          <Box textAlign="center" p={8}>
            <Heading size="md" mb={4}>
              Usuário não encontrado
            </Heading>
            <Text mb={6}>
              Não foi possível encontrar detalhes para este usuário.
            </Text>
            <Button as={Link} href="/usuarios" colorScheme="blue">
              Voltar para lista de usuários
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
                  {usuario.nome}
                </Heading>
                <Text color="gray.500" mt={1}>
                  Cadastrado em {formatarData(usuario.data_cadastro)}
                </Text>
              </Box>
              
              <HStack spacing={4} mt={{ base: 4, md: 0 }}>
                <Button
                  leftIcon={<FiEdit />}
                  colorScheme="blue"
                  onClick={onEditOpen}
                >
                  Editar Usuário
                </Button>
                
                <Button
                  leftIcon={<FiLock />}
                  variant="outline"
                  onClick={onPasswordOpen}
                >
                  Alterar Senha
                </Button>
              </HStack>
            </Flex>
            
            <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6}>
              {/* Coluna da esquerda - Dados do usuário */}
              <GridItem colSpan={{ base: 1, lg: 1 }}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Informações do Usuário</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Flex align="center" justify="center" mb={4}>
                        <Avatar 
                          size="2xl" 
                          name={usuario.nome} 
                          src={usuario.foto_perfil} 
                          borderWidth={3}
                          borderColor="blue.500"
                        />
                      </Flex>
                      
                      <HStack justify="center">
                        <Badge 
                          colorScheme={usuario.tipo === 'admin' ? 'purple' : 'blue'}
                          fontSize="sm"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          {usuario.tipo === 'admin' ? 'Administrador' : 'Cliente'}
                        </Badge>
                        
                        <Badge 
                          colorScheme={usuario.status ? 'green' : 'red'}
                          fontSize="sm"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          {usuario.status ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </HStack>
                      
                      <Divider />
                      
                      <Box>
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Icon as={FiUser} mr={2} />
                          Nome
                        </Text>
                        <Text>{usuario.nome}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Icon as={FiMail} mr={2} />
                          Email
                        </Text>
                        <Text>{usuario.email}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Icon as={FiPhone} mr={2} />
                          Telefone
                        </Text>
                        <Text>{usuario.telefone || 'Não informado'}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Icon as={FiCalendar} mr={2} />
                          Último acesso
                        </Text>
                        <Text>{usuario.ultimo_acesso ? formatarData(usuario.ultimo_acesso) : 'Nunca acessou'}</Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
                
                {/* Permissões do usuário */}
                <Card mt={6}>
                  <CardHeader>
                    <Heading size="md">Permissões</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    {permissoes.length > 0 ? (
                      <VStack align="stretch" spacing={2}>
                        {permissoes.map((perm) => (
                          <Flex key={perm} align="center">
                            <Icon as={FiCheckCircle} color="green.500" mr={2} />
                            <Text>{perm}</Text>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <Text color="gray.500">Nenhuma permissão específica.</Text>
                    )}
                  </CardBody>
                </Card>
              </GridItem>
              
              {/* Coluna central e direita - Métricas e compras */}
              <GridItem colSpan={{ base: 1, lg: 2 }}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Métricas de Compras</Heading>
                  </CardHeader>
                  
                  <CardBody>
                    <StatGroup mb={6}>
                      <Stat>
                        <StatLabel>Total Gasto</StatLabel>
                        <StatNumber display="flex" alignItems="center">
                          <Icon as={FiDollarSign} mr={2} />
                          {formatarValor(metricas?.total_gasto || 0)}
                        </StatNumber>
                        <StatHelpText>
                          {metricas?.quantidade_compras || 0} compras
                        </StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Média Mensal</StatLabel>
                        <StatNumber display="flex" alignItems="center">
                          <Icon as={FiBarChart2} mr={2} />
                          {formatarValor(metricas?.media_mensal || 0)}
                        </StatNumber>
                        <StatHelpText>
                          Último 3 meses
                        </StatHelpText>
                      </Stat>
                      
                      <Stat>
                        <StatLabel>Última Compra</StatLabel>
                        <StatNumber display="flex" alignItems="center" fontSize="xl">
                          <Icon as={FiClock} mr={2} />
                          {metricas?.ultima_compra 
                            ? new Date(metricas.ultima_compra).toLocaleDateString('pt-BR')
                            : '-'}
                        </StatNumber>
                        <StatHelpText>
                          {metricas?.ultima_compra 
                            ? `${Math.ceil((Date.now() - new Date(metricas.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))} dias atrás`
                            : 'Sem compras'}
                        </StatHelpText>
                      </Stat>
                    </StatGroup>
                    
                    {metricas?.servico_mais_comprado && (
                      <Box p={4} bg="blue.50" borderRadius="md" mb={6}>
                        <Heading size="sm" mb={2}>
                          Serviço Mais Comprado
                        </Heading>
                        <Flex align="center" justify="space-between">
                          <Text fontWeight="bold">
                            <Icon as={FiShoppingBag} mr={2} />
                            {metricas.servico_mais_comprado.nome}
                          </Text>
                          <Badge colorScheme="blue">
                            {metricas.servico_mais_comprado.quantidade} vezes
                          </Badge>
                        </Flex>
                      </Box>
                    )}
                    
                    <Tabs variant="enclosed" colorScheme="blue">
                      <TabList>
                        <Tab>Compras Recentes</Tab>
                        <Tab>Histórico Completo</Tab>
                      </TabList>
                      
                      <TabPanels>
                        <TabPanel px={0}>
                          <Box overflowX="auto">
                            <Table variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Data</Th>
                                  <Th>Serviço</Th>
                                  <Th isNumeric>Valor</Th>
                                  <Th>Status</Th>
                                  <Th width="80px">Ação</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {metricas?.compras_recentes && metricas.compras_recentes.length > 0 ? (
                                  metricas.compras_recentes.map((compra, index) => (
                                    <Tr key={index}>
                                      <Td>{formatarData(new Date(compra.data))}</Td>
                                      <Td>{compra.servico}</Td>
                                      <Td isNumeric>{formatarValor(compra.valor)}</Td>
                                      <Td>{renderizarStatusPedido(compra.status)}</Td>
                                      <Td>
                                        <Button
                                          as={Link}
                                          href={`/pedidos/${compra.id}`}
                                          size="sm"
                                          variant="ghost"
                                        >
                                          Ver
                                        </Button>
                                      </Td>
                                    </Tr>
                                  ))
                                ) : (
                                  <Tr>
                                    <Td colSpan={5} textAlign="center">
                                      Nenhuma compra recente
                                    </Td>
                                  </Tr>
                                )}
                              </Tbody>
                            </Table>
                          </Box>
                        </TabPanel>
                        
                        <TabPanel px={0}>
                          <Box overflowX="auto">
                            <Table variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Data</Th>
                                  <Th>Serviço</Th>
                                  <Th isNumeric>Valor</Th>
                                  <Th>Status</Th>
                                  <Th width="80px">Ação</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {historicoCompras && historicoCompras.length > 0 ? (
                                  historicoCompras.map((compra, index) => (
                                    <Tr key={index}>
                                      <Td>{formatarData(new Date(compra.data))}</Td>
                                      <Td>{compra.servico}</Td>
                                      <Td isNumeric>{formatarValor(compra.valor)}</Td>
                                      <Td>{renderizarStatusPedido(compra.status)}</Td>
                                      <Td>
                                        <Button
                                          as={Link}
                                          href={`/pedidos/${compra.id}`}
                                          size="sm"
                                          variant="ghost"
                                        >
                                          Ver
                                        </Button>
                                      </Td>
                                    </Tr>
                                  ))
                                ) : (
                                  <Tr>
                                    <Td colSpan={5} textAlign="center">
                                      Nenhuma compra encontrada
                                    </Td>
                                  </Tr>
                                )}
                              </Tbody>
                            </Table>
                          </Box>
                          
                          {historicoCompras && historicoCompras.length > 5 && (
                            <Flex justify="center" mt={4}>
                              <Button colorScheme="blue" variant="outline">
                                Ver Mais
                              </Button>
                            </Flex>
                          )}
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </Box>
        )}
      </Container>
      
      {/* Modal de edição de usuário */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar Usuário</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nome</FormLabel>
                <Input 
                  value={usuarioEdit.nome || ''} 
                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, nome: e.target.value })}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input 
                  type="email"
                  value={usuarioEdit.email || ''} 
                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, email: e.target.value })}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Telefone</FormLabel>
                <Input 
                  value={usuarioEdit.telefone || ''} 
                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, telefone: e.target.value })}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Tipo de Usuário</FormLabel>
                <Select
                  value={usuarioEdit.tipo || 'cliente'}
                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, tipo: e.target.value })}
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </Select>
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Usuário Ativo</FormLabel>
                <Switch 
                  isChecked={usuarioEdit.status} 
                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, status: e.target.checked })}
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={salvarAlteracoes}
              isLoading={isSaving}
            >
              Salvar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Modal de alteração de senha */}
      <Modal isOpen={isPasswordOpen} onClose={onPasswordClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Alterar Senha</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nova Senha</FormLabel>
                <Input 
                  type="password"
                  value={novaSenha} 
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Confirmar Senha</FormLabel>
                <Input 
                  type="password"
                  value={confirmarSenha} 
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPasswordClose}>
              Cancelar
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={alterarSenha}
              isLoading={isSaving}
            >
              Alterar Senha
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AdminLayout>
  );
} 