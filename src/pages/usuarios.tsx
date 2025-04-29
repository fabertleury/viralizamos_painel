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
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiMail, FiUserPlus, FiEye } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Importar o serviço atualizado que usa o endpoint com dados detalhados
import { fetchDetailedUsers } from '../services/adminService';

export default function Usuarios() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Estado para usuários com dados detalhados
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  
  // Cores do tema
  const bgColor = useColorModeValue('white', 'gray.700');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.600');
  
  // Formatação de data simplificada
  const formatarData = (dataISO: string) => {
    if (!dataISO) return 'N/A';
    try {
      const data = new Date(dataISO);
      return data.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  // Formatar valores monetários
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };
  
  // Carregar usuários usando o novo serviço
  const carregarUsuarios = async () => {
    try {
      setIsLoading(true);
      
      // Usar o serviço de usuários detalhados para buscar os dados
      const resultado = await fetchDetailedUsers(
        termoBusca || undefined,
        filtroTipo || undefined,
        paginaAtual,
        10 // Limite por página
      );
      
      setUsuarios(resultado.users || []);
      setTotalUsuarios(resultado.totalItems || 0);
      setTotalPaginas(resultado.totalPages || 0);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: error instanceof Error ? error.message : 'Não foi possível buscar os usuários. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUsuarios([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Efeito para carregar dados quando as dependências mudarem
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated) {
      carregarUsuarios();
    }
  }, [isAuthenticated, authLoading, paginaAtual]);
  
  // Filtrar usuários
  const filtrarUsuarios = () => {
    setPaginaAtual(1); // Voltar para a primeira página ao filtrar
    carregarUsuarios();
  };
  
  // Alternar status do usuário
  const alternarStatus = async (id: string, statusAtual: boolean) => {
    try {
      setIsMutating(true);
      const response = await fetch(`/api/usuarios/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ ativo: !statusAtual }),
      });
      
      if (response.ok) {
        setUsuarios(prevUsuarios =>
          prevUsuarios.map(user =>
            user.id === id ? { ...user, active: !statusAtual } : user
          )
        );
        
        toast({
          title: 'Status atualizado',
          description: `Usuário ${!statusAtual ? 'ativado' : 'desativado'} com sucesso.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Falha ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível alterar o status do usuário. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMutating(false);
    }
  };
  
  // Renderizar badge de tipo de usuário
  const renderTipoUsuario = (tipo: string) => {
    let color = 'gray';
    let label = tipo || 'Desconhecido';
    
    switch (tipo?.toLowerCase()) {
      case 'admin':
        color = 'red';
        label = 'Administrador';
        break;
      case 'customer':
        color = 'green';
        label = 'Cliente';
        break;
      case 'provider':
        color = 'blue';
        label = 'Fornecedor';
        break;
    }
    
    return <Badge colorScheme={color}>{label}</Badge>;
  };
  
  // Mudar de página
  const irParaPagina = (novaPagina: number) => {
    setPaginaAtual(Math.max(1, Math.min(novaPagina, totalPaginas)));
  };

  return (
    <AdminLayout>
      <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6} flexWrap={{ base: "wrap", md: "nowrap" }}>
          <Heading size="lg">Usuários</Heading>
          <Button
            leftIcon={<FiUserPlus />}
            colorScheme="blue"
            as={Link}
            href="/admin/adicionar"
            ml={{ base: 0, md: 'auto' }}
            mt={{ base: 4, md: 0 }}
          >
            Adicionar Usuário
          </Button>
        </Flex>
        
        <Box bg={bgColor} p={4} borderRadius="md" shadow="sm" mb={6}>
          <HStack spacing={4} mb={4} flexWrap={{ base: "wrap", md: "nowrap" }}>
            <InputGroup maxW={{ base: '100%', md: '320px' }}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Buscar usuário"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && filtrarUsuarios()}
              />
            </InputGroup>
            
            <Select 
              placeholder="Todos os tipos" 
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              maxW={{ base: '100%', md: '200px' }}
              mt={{ base: 2, md: 0 }}
            >
              <option value="">Todos</option>
              <option value="admin">Administradores</option>
              <option value="customer">Clientes</option>
              <option value="provider">Fornecedores</option>
            </Select>
            
            <Button 
              colorScheme="blue" 
              onClick={filtrarUsuarios}
              ml={{ base: 0, md: 2 }}
              mt={{ base: 2, md: 0 }}
            >
              Filtrar
            </Button>
          </HStack>
        </Box>
        
        {isLoading ? (
          <Flex justify="center" align="center" py={10}>
            <Spinner size="xl" thickness="4px" color="blue.500" />
          </Flex>
        ) : (
          <>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Usuário</Th>
                    <Th>Tipo</Th>
                    <Th>Cadastro</Th>
                    <Th isNumeric>Pedidos</Th>
                    <Th isNumeric>Transações</Th>
                    <Th isNumeric>Total Gasto</Th>
                    <Th>Última Compra</Th>
                    <Th>Status</Th>
                    <Th>Ações</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {usuarios.length > 0 ? (
                    usuarios.map((usuario) => (
                      <Tr 
                        key={usuario.id} 
                        _hover={{ bg: hoverBgColor }}
                      >
                        <Td>
                          <Flex align="center">
                            <Avatar 
                              size="sm" 
                              name={usuario.name || usuario.nome} 
                              mr={2} 
                            />
                            <Box>
                              <Text fontWeight="medium">{usuario.name || usuario.nome || 'Sem nome'}</Text>
                              <Text fontSize="sm" color="gray.500">{usuario.email}</Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td>{renderTipoUsuario(usuario.role || usuario.tipo)}</Td>
                        <Td>{formatarData(usuario.created_at || usuario.data_cadastro)}</Td>
                        <Td isNumeric>
                          <Badge colorScheme="blue">
                            {(usuario.metrics?.orders_count || usuario.total_pedidos || 0)}
                          </Badge>
                        </Td>
                        <Td isNumeric>
                          <Badge colorScheme="purple">
                            {(usuario.metrics?.transactions_count || 0)}
                          </Badge>
                        </Td>
                        <Td isNumeric>{formatarValor((usuario.metrics?.total_spent || 0) + (usuario.metrics?.total_payments || 0))}</Td>
                        <Td>
                          {usuario.metrics?.last_purchase ? (
                            <Box>
                              <Text fontSize="sm">{formatarData(usuario.metrics.last_purchase.date)}</Text>
                              <Badge size="sm" colorScheme={usuario.metrics.last_purchase.status === 'completed' ? 'green' : 'yellow'}>
                                {formatarValor(usuario.metrics.last_purchase.amount)}
                              </Badge>
                            </Box>
                          ) : (
                            <Text fontSize="sm" color="gray.500">Nenhuma</Text>
                          )}
                        </Td>
                        <Td>
                          <FormControl display="flex" alignItems="center">
                            <Switch 
                              colorScheme="green" 
                              size="sm"
                              isChecked={usuario.active || usuario.ativo}
                              onChange={() => alternarStatus(usuario.id, usuario.active || usuario.ativo)}
                              isDisabled={isMutating}
                            />
                            <FormLabel 
                              mb="0" 
                              ml={2} 
                              fontSize="sm"
                              color={(usuario.active || usuario.ativo) ? "green.500" : "gray.500"}
                            >
                              {(usuario.active || usuario.ativo) ? "Ativo" : "Inativo"}
                            </FormLabel>
                          </FormControl>
                        </Td>
                        <Td>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Opções"
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem 
                                icon={<FiEye />}
                                as={Link}
                                href={`/usuarios/${usuario.id}`}
                              >
                                Ver Detalhes
                              </MenuItem>
                              <MenuItem 
                                icon={<FiEdit />}
                                as={Link}
                                href={`/usuarios/editar/${usuario.id}`}
                              >
                                Editar
                              </MenuItem>
                              <MenuItem 
                                icon={<FiMail />}
                                onClick={() => {
                                  // Função para enviar mensagem
                                  toast({
                                    title: 'Funcionalidade em desenvolvimento',
                                    description: 'O envio de mensagens estará disponível em breve.',
                                    status: 'info',
                                    duration: 3000,
                                  });
                                }}
                              >
                                Enviar Mensagem
                              </MenuItem>
                              <MenuDivider />
                              <MenuItem 
                                icon={<FiTrash2 />}
                                color="red.500"
                                onClick={() => {
                                  // Função para excluir
                                  toast({
                                    title: 'Funcionalidade em desenvolvimento',
                                    description: 'A exclusão de usuários estará disponível em breve.',
                                    status: 'info',
                                    duration: 3000,
                                  });
                                }}
                              >
                                Excluir
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={9} textAlign="center" py={6}>
                        <Text color="gray.500">Nenhum usuário encontrado</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
            
            <Flex justify="space-between" mt={6} align="center">
              <Text color="gray.600">
                Mostrando {usuarios.length} de {totalUsuarios} usuários
              </Text>
              
              <HStack>
                <Button
                  size="sm"
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  isDisabled={paginaAtual === 1}
                >
                  Anterior
                </Button>
                
                <Text>Página {paginaAtual} de {totalPaginas}</Text>
                
                <Button
                  size="sm"
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  isDisabled={paginaAtual >= totalPaginas}
                >
                  Próxima
                </Button>
              </HStack>
            </Flex>
          </>
        )}
      </Box>
    </AdminLayout>
  );
} 