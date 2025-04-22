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
import { FiSearch, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiMail, FiUserPlus } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Importar o serviço de usuários
import { buscarUsuarios as buscarUsuariosService } from '../services/usuariosService';

// Função para buscar usuários detalhados com fallback para API direta
const buscarUsuariosDetalhados = async (filtros: any, pagina: number, limite: number) => {
  try {
    console.log('Buscando usuários com filtros:', filtros, 'página:', pagina, 'limite:', limite);
    
    // Primeiro, tentar usar o serviço de usuários diretamente
    try {
      const resultado = await buscarUsuariosService({
        tipo: filtros.tipo,
        status: filtros.status,
        termoBusca: filtros.termoBusca,
        pagina: pagina,
        limite: limite
      });
      
      console.log('Resultado da busca de usuários via serviço:', resultado);
      if (resultado && resultado.usuarios && resultado.usuarios.length > 0) {
        return resultado;
      }
    } catch (serviceError) {
      console.error('Erro ao usar serviço de usuários:', serviceError);
      // Continuar para o fallback
    }
    
    // Fallback: chamar a API diretamente
    console.log('Tentando fallback: chamada direta à API');
    const queryParams = new URLSearchParams();
    
    if (filtros.tipo) queryParams.append('tipo', filtros.tipo);
    if (filtros.status) queryParams.append('status', filtros.status);
    if (filtros.termoBusca) queryParams.append('termoBusca', filtros.termoBusca);
    
    queryParams.append('pagina', pagina.toString());
    queryParams.append('limite', limite.toString());
    
    const response = await fetch(`/api/usuarios?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Resultado da busca de usuários via API direta:', data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuários (todos os métodos falharam):', error);
    
    // Último recurso: retornar uma lista vazia
    return { usuarios: [], total: 0, pagina: 1, limite: 10, paginas: 0 };
  }
};

// Corrigido: função de atualização de status desacoplada
const atualizarStatusUsuario = async (id: string, novoStatus: boolean) => {
  try {
    const response = await fetch(`/api/usuarios/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ativo: novoStatus }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return false;
  }
};

export default function Usuarios() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  
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
  
  // Corrigido: carregamento de usuários simplificado para SSR
  const carregarUsuarios = async () => {
    try {
      setIsLoading(true);
      
      const resultado = await buscarUsuariosDetalhados(
        {
          tipo: filtroTipo !== 'todos' ? filtroTipo : undefined,
          status: filtroStatus !== 'todos' ? filtroStatus : undefined,
          termoBusca: termoBusca || undefined
        },
        paginaAtual,
        10 // Limite por página
      );
      
      setUsuarios(resultado.usuarios || []);
      setTotalUsuarios(resultado.total || 0);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível buscar os usuários. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUsuarios([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Corrigido: useEffect com verificação de montagem para evitar memory leaks
  useEffect(() => {
    let isMounted = true;
    
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated) {
      const fetch = async () => {
        try {
          setIsLoading(true);
          const resultado = await buscarUsuariosDetalhados(
            {
              tipo: filtroTipo !== 'todos' ? filtroTipo : undefined,
              status: filtroStatus !== 'todos' ? filtroStatus : undefined,
              termoBusca: termoBusca || undefined
            },
            paginaAtual,
            10
          );
          
          if (isMounted) {
            setUsuarios(resultado.usuarios || []);
            setTotalUsuarios(resultado.total || 0);
          }
        } catch (error) {
          console.error('Erro ao carregar usuários:', error);
          if (isMounted) {
            setUsuarios([]);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      
      fetch();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, router, paginaAtual]);
  
  // Filtrar usuários manualmente
  const filtrarUsuarios = () => {
    setPaginaAtual(1); // Voltar para a primeira página ao filtrar
    carregarUsuarios();
  };
  
  // Alternar status do usuário
  const alternarStatus = async (id: string, statusAtual: boolean) => {
    try {
      setIsMutating(true);
      const sucesso = await atualizarStatusUsuario(id, !statusAtual);
      
      if (sucesso) {
        setUsuarios(prevUsuarios =>
          prevUsuarios.map(user =>
            user.id === id ? { ...user, ativo: !statusAtual } : user
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
  
  // Renderizar tipo de usuário com estilo
  const renderTipoUsuario = (tipo: string) => {
    let colorScheme = 'gray';
    let label = 'Desconhecido';
    
    switch (tipo?.toLowerCase()) {
      case 'admin':
        colorScheme = 'red';
        label = 'Administrador';
        break;
      case 'cliente':
        colorScheme = 'green';
        label = 'Cliente';
        break;
      case 'afiliado':
        colorScheme = 'purple';
        label = 'Afiliado';
        break;
      case 'suporte':
        colorScheme = 'blue';
        label = 'Suporte';
        break;
      default:
        break;
    }
    
    return <Badge colorScheme={colorScheme}>{label}</Badge>;
  };
  
  // Versão minimalista do render para garantir compatibilidade
  return (
    <AdminLayout>
      <Box p={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading size="lg">Gerenciamento de Usuários</Heading>
          <Button
            leftIcon={<FiUserPlus />}
            colorScheme="blue"
            onClick={() => router.push('/usuarios/novo')}
          >
            Novo Usuário
          </Button>
        </Flex>
        
        {/* Filtros */}
        <Flex mb={6} gap={4} flexWrap="wrap">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por nome, email..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </InputGroup>
          
          <Select
            maxW="200px"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos os Tipos</option>
            <option value="admin">Administradores</option>
            <option value="cliente">Clientes</option>
            <option value="afiliado">Afiliados</option>
            <option value="suporte">Suporte</option>
          </Select>
          
          <Select
            maxW="200px"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </Select>
          
          <Button
            leftIcon={<FiFilter />}
            onClick={filtrarUsuarios}
            colorScheme="blue"
            variant="outline"
          >
            Filtrar
          </Button>
        </Flex>
        
        {/* Tabela de Usuários */}
        {isLoading ? (
          <Flex justify="center" align="center" h="300px">
            <Spinner size="xl" />
          </Flex>
        ) : (
          <>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Usuário</Th>
                    <Th>Tipo</Th>
                    <Th>Status</Th>
                    <Th>Registrado em</Th>
                    <Th>Ações</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {usuarios.length > 0 ? (
                    usuarios.map((usuario) => (
                      <Tr key={usuario.id}>
                        <Td>
                          <Flex align="center">
                            <Avatar
                              size="sm"
                              name={usuario.nome || usuario.email}
                              src={usuario.avatar_url || ''}
                              mr={2}
                            />
                            <Box>
                              <Text fontWeight="bold">{usuario.nome || 'Sem Nome'}</Text>
                              <Text fontSize="sm" color="gray.600">{usuario.email}</Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td>{renderTipoUsuario(usuario.tipo)}</Td>
                        <Td>
                          <FormControl display="flex" alignItems="center">
                            <Switch
                              isChecked={usuario.ativo}
                              onChange={() => alternarStatus(usuario.id, usuario.ativo)}
                              isDisabled={isMutating}
                              colorScheme="green"
                              size="sm"
                              mr={2}
                            />
                            <FormLabel htmlFor={`status-${usuario.id}`} mb={0} fontSize="sm">
                              {usuario.ativo ? 'Ativo' : 'Inativo'}
                            </FormLabel>
                          </FormControl>
                        </Td>
                        <Td>{formatarData(usuario.data_cadastro)}</Td>
                        <Td>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem
                                icon={<FiEdit />}
                                onClick={() => router.push(`/usuarios/${usuario.id}`)}
                              >
                                Editar
                              </MenuItem>
                              <MenuItem
                                icon={<FiMail />}
                                onClick={() => window.location.href = `mailto:${usuario.email}`}
                              >
                                Enviar Email
                              </MenuItem>
                              <MenuDivider />
                              <MenuItem
                                icon={<FiTrash2 />}
                                color="red.500"
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir o usuário ${usuario.nome || usuario.email}?`)) {
                                    // Implementar exclusão
                                  }
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
                      <Td colSpan={5} textAlign="center" py={6}>
                        <Text>Nenhum usuário encontrado</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
            
            {/* Paginação */}
            <Flex justify="space-between" align="center" mt={4}>
              <Text>
                Total: {totalUsuarios} usuários
              </Text>
              <HStack>
                <Button
                  size="sm"
                  onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
                  isDisabled={paginaAtual === 1}
                >
                  Anterior
                </Button>
                <Text>
                  Página {paginaAtual} de {Math.max(Math.ceil(totalUsuarios / 10), 1)}
                </Text>
                <Button
                  size="sm"
                  onClick={() => setPaginaAtual(p => p + 1)}
                  isDisabled={paginaAtual >= Math.ceil(totalUsuarios / 10)}
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