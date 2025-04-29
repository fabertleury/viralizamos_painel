import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
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
  Tooltip,
  Switch,
  FormHelperText
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { buscarUsuario, buscarMetricasUsuario, buscarHistoricoCompras, atualizarUsuario } from '@/services/usuariosService';
import { FiUser, FiMail, FiPhone, FiCalendar, FiShoppingBag, FiDollarSign, FiClock, FiBarChart2, FiTrendingUp, FiStar, FiSave, FiArrowLeft } from 'react-icons/fi';
import NextLink from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminLayout from '@/components/Layout/AdminLayout';
import { fetchUserDetails } from '@/services/adminService';

export default function EditarUsuario() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const toast = useToast();
  
  const [usuario, setUsuario] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    nome: '',
    email: '',
    telefone: '',
    tipo: 'cliente',
    status: true,
    metadata: {}
  });
  const [metricas, setMetricas] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      case 'approved':
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
  
  // Carregar dados do usuário usando a API direta
  const carregarDadosUsuario = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      
      // Buscar dados do usuário usando a API direta
      console.log(`Buscando dados do usuário ${id} via API direta`);
      const userDetails = await fetchUserDetails(id as string);
      
      if (userDetails) {
        console.log('Dados do usuário obtidos com sucesso:', userDetails);
        
        setUsuario(userDetails);
        setMetricas(userDetails.metrics || {});
        setTransacoes(userDetails.transactions || []);
        
        // Preencher o formulário com os dados do usuário
        setFormData({
          nome: userDetails.name || '',
          email: userDetails.email || '',
          telefone: userDetails.phone || '',
          tipo: userDetails.role || 'cliente',
          status: true,
          metadata: userDetails.metadata || {}
        });
      } else {
        // Fallback para a API antiga
        console.log('Usando fallback para API antiga');
        const dadosUsuario = await buscarUsuario(id as string);
        const metricasUsuario = await buscarMetricasUsuario(id as string);
        const historicoPedidos = await buscarHistoricoCompras(id as string);
        
        setUsuario(dadosUsuario);
        setMetricas(metricasUsuario);
        setTransacoes(historicoPedidos?.pedidos || []);
        
        // Preencher o formulário com os dados do usuário
        setFormData({
          nome: dadosUsuario?.nome || '',
          email: dadosUsuario?.email || '',
          telefone: dadosUsuario?.telefone || '',
          tipo: dadosUsuario?.tipo || 'cliente',
          status: dadosUsuario?.status || true,
          metadata: dadosUsuario?.metadata || {}
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do usuário.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Salvar alterações no usuário
  const salvarAlteracoes = async () => {
    try {
      setIsSaving(true);
      
      // Atualizar dados do usuário
      await atualizarUsuario(id as string, {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        tipo: formData.tipo,
        status: formData.status,
        metadata: formData.metadata
      });
      
      toast({
        title: 'Sucesso',
        description: 'Dados do usuário atualizados com sucesso.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirecionar para a página de detalhes
      router.push(`/usuarios/${id}`);
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Manipular alterações nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manipular alteração no switch de status
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.checked
    }));
  };
  
  // Efeito para carregar dados quando o ID estiver disponível
  useEffect(() => {
    if (isAuthenticated && id) {
      carregarDadosUsuario();
    }
  }, [isAuthenticated, id]);
  
  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);
  
  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <Flex justify="center" align="center" minH="50vh">
          <Spinner size="xl" />
        </Flex>
      </AdminLayout>
    );
  }
  
  if (!usuario) {
    return (
      <AdminLayout>
        <Box p={5}>
          <Heading as="h1" size="xl" mb={6}>Usuário não encontrado</Heading>
          <Text>Não foi possível encontrar os dados do usuário solicitado.</Text>
          <Button 
            as={NextLink}
            href="/usuarios"
            leftIcon={<FiArrowLeft />}
            mt={4}
          >
            Voltar para lista de usuários
          </Button>
        </Box>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <Box p={5}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading as="h1" size="xl">Editar Usuário</Heading>
          <HStack spacing={4}>
            <Button
              as={NextLink}
              href={`/usuarios/${id}`}
              leftIcon={<FiArrowLeft />}
              variant="outline"
            >
              Voltar
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<FiSave />}
              onClick={salvarAlteracoes}
              isLoading={isSaving}
            >
              Salvar Alterações
            </Button>
          </HStack>
        </Flex>
        
        <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Informações Pessoais</Tab>
            <Tab>Métricas</Tab>
            <Tab>Transações</Tab>
            <Tab>Metadados</Tab>
          </TabList>
          
          <TabPanels>
            {/* Painel de Informações Pessoais */}
            <TabPanel>
              <Card bg={cardBg} shadow="md" mb={6}>
                <CardHeader>
                  <Heading size="md">Dados Básicos</Heading>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <FormControl id="nome">
                      <FormLabel>Nome</FormLabel>
                      <Input 
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                      />
                    </FormControl>
                    
                    <FormControl id="email">
                      <FormLabel>Email</FormLabel>
                      <Input 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        type="email"
                      />
                    </FormControl>
                    
                    <FormControl id="telefone">
                      <FormLabel>Telefone</FormLabel>
                      <Input 
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                      />
                    </FormControl>
                    
                    <FormControl id="tipo">
                      <FormLabel>Tipo de Usuário</FormLabel>
                      <Select 
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleInputChange}
                      >
                        <option value="cliente">Cliente</option>
                        <option value="admin">Administrador</option>
                        <option value="operador">Operador</option>
                        <option value="parceiro">Parceiro</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl id="status" display="flex" alignItems="center">
                      <FormLabel mb="0">Status Ativo</FormLabel>
                      <Switch 
                        isChecked={formData.status}
                        onChange={handleStatusChange}
                        colorScheme="green"
                      />
                    </FormControl>
                    
                    <Divider />
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontWeight="bold" color={subtitleColor}>ID do Usuário</Text>
                        <Text>{id}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold" color={subtitleColor}>Data de Cadastro</Text>
                        <Text>{formatarDataHora(usuario.created_at || usuario.data_cadastro)}</Text>
                      </Box>
                      
                      <Box>
                        <Text fontWeight="bold" color={subtitleColor}>Última Atualização</Text>
                        <Text>{formatarDataHora(usuario.updated_at || usuario.ultimo_acesso)}</Text>
                      </Box>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>
            </TabPanel>
            
            {/* Painel de Métricas */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <Stat>
                      <StatLabel>Total de Pedidos</StatLabel>
                      <StatNumber>{metricas?.orders_count || metricas?.quantidade_compras || 0}</StatNumber>
                      <StatHelpText>
                        <Icon as={FiShoppingBag} mr={1} />
                        Pedidos realizados
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
                
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <Stat>
                      <StatLabel>Total Gasto</StatLabel>
                      <StatNumber>{formatarValor(metricas?.total_spent || metricas?.total_gasto || 0)}</StatNumber>
                      <StatHelpText>
                        <Icon as={FiDollarSign} mr={1} />
                        Em todas as compras
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
                
                <Card bg={cardBg} shadow="md">
                  <CardBody>
                    <Stat>
                      <StatLabel>Valor Médio por Pedido</StatLabel>
                      <StatNumber>{formatarValor(metricas?.avg_order_value || 0)}</StatNumber>
                      <StatHelpText>
                        <Icon as={FiBarChart2} mr={1} />
                        Média de gastos
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card bg={cardBg} shadow="md">
                  <CardHeader>
                    <Heading size="md">Última Compra</Heading>
                  </CardHeader>
                  <CardBody>
                    {metricas?.last_purchase ? (
                      <Stack spacing={3}>
                        <Box>
                          <Text fontWeight="bold" color={subtitleColor}>Data</Text>
                          <Text>{formatarDataHora(metricas.last_purchase.date)}</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="bold" color={subtitleColor}>Valor</Text>
                          <Text>{formatarValor(metricas.last_purchase.amount)}</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="bold" color={subtitleColor}>Status</Text>
                          <Text>{getOrderStatusBadge(metricas.last_purchase.status)}</Text>
                        </Box>
                      </Stack>
                    ) : (
                      <Text>Nenhuma compra registrada</Text>
                    )}
                  </CardBody>
                </Card>
                
                <Card bg={cardBg} shadow="md">
                  <CardHeader>
                    <Heading size="md">Frequência de Compra</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={3}>
                      <Box>
                        <Text fontWeight="bold" color={subtitleColor}>Intervalo Médio</Text>
                        <Text>
                          {metricas?.purchase_frequency 
                            ? `${Math.round(metricas.purchase_frequency)} dias entre compras` 
                            : 'Dados insuficientes'}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color={subtitleColor}>Serviços Mais Comprados</Text>
                        {metricas?.top_services && metricas.top_services.length > 0 ? (
                          <VStack align="start" spacing={2}>
                            {metricas.top_services.slice(0, 3).map((service: any, index: number) => (
                              <HStack key={index}>
                                <Badge colorScheme="blue">{index + 1}</Badge>
                                <Text>{service.service_name || 'Serviço não identificado'}</Text>
                                <Badge>{service.count}x</Badge>
                              </HStack>
                            ))}
                          </VStack>
                        ) : (
                          <Text>Nenhum serviço registrado</Text>
                        )}
                      </Box>
                    </Stack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>
            
            {/* Painel de Transações */}
            <TabPanel>
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Histórico de Transações</Heading>
                </CardHeader>
                <CardBody>
                  {transacoes && transacoes.length > 0 ? (
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>ID</Th>
                            <Th>Data</Th>
                            <Th>Valor</Th>
                            <Th>Status</Th>
                            <Th>Método</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transacoes.map((transacao) => (
                            <Tr key={transacao.id}>
                              <Td>
                                <Tooltip label={transacao.id}>
                                  <Text isTruncated maxW="150px">{transacao.id}</Text>
                                </Tooltip>
                              </Td>
                              <Td>{formatarDataHora(transacao.created_at || transacao.data)}</Td>
                              <Td>{formatarValor(transacao.amount || transacao.valor)}</Td>
                              <Td>{getOrderStatusBadge(transacao.status)}</Td>
                              <Td>{transacao.method || transacao.metodo || 'N/A'}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Text>Nenhuma transação encontrada para este usuário.</Text>
                  )}
                </CardBody>
              </Card>
            </TabPanel>
            
            {/* Painel de Metadados */}
            <TabPanel>
              <Card bg={cardBg} shadow="md">
                <CardHeader>
                  <Heading size="md">Metadados</Heading>
                </CardHeader>
                <CardBody>
                  <FormControl id="metadata">
                    <FormLabel>Dados Adicionais (JSON)</FormLabel>
                    <Textarea
                      name="metadata"
                      value={JSON.stringify(formData.metadata || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsedMetadata = JSON.parse(e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            metadata: parsedMetadata
                          }));
                        } catch (error) {
                          // Manter o valor como texto se não for um JSON válido
                          setFormData(prev => ({
                            ...prev,
                            metadata: e.target.value
                          }));
                        }
                      }}
                      minH="300px"
                      fontFamily="monospace"
                    />
                    <FormHelperText>
                      Dados adicionais em formato JSON. Edite com cuidado para manter a estrutura válida.
                    </FormHelperText>
                  </FormControl>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
        
        <Flex justify="flex-end" mt={6}>
          <Button
            colorScheme="blue"
            leftIcon={<FiSave />}
            onClick={salvarAlteracoes}
            isLoading={isSaving}
            size="lg"
          >
            Salvar Alterações
          </Button>
        </Flex>
      </Box>
    </AdminLayout>
  );
}
