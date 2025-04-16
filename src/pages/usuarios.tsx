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
import { buscarUsuariosDetalhados, atualizarStatusUsuario } from '../services/usuariosService';

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
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Carregar usuários
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
  
  // Executar busca quando as dependências mudarem
  useEffect(() => {
    if (isAuthenticated) {
      carregarUsuarios();
    }
  }, [isAuthenticated, paginaAtual]);
  
  // Filtrar usuários manualmente
  const filtrarUsuarios = () => {
    setPaginaAtual(1); // Voltar para a primeira página ao filtrar
    carregarUsuarios();
  };
  
  // Formatação de data
  const formatarData = (dataISO: string) => {
    if (!dataISO) return 'N/A';
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
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
  
  // Navegar para página de edição
  const editarUsuario = (id: string) => {
    router.push(`/usuarios/${id}`);
  };
  
  // Excluir usuário
  const excluirUsuario = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${nome}?`)) {
      try {
        setIsMutating(true);
        
        // Implementar chamada à API para excluir usuário
        const response = await fetch(`/api/usuarios/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setUsuarios(prevUsuarios => prevUsuarios.filter(user => user.id !== id));
          
          toast({
            title: 'Usuário excluído',
            description: 'O usuário foi excluído com sucesso.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          throw new Error('Falha ao excluir usuário');
        }
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        toast({
          title: 'Erro ao excluir usuário',
          description: 'Não foi possível excluir o usuário. Tente novamente.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsMutating(false);
      }
    }
  };
  
  // Enviar email para usuário
  const enviarEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };
  
  // Renderizar tipo de usuário com estilo
  const renderTipoUsuario = (tipo: string) => {
    const isAdmin = tipo === 'admin';
    return (
      <Badge
        colorScheme={isAdmin ? 'purple' : 'blue'}
        variant={isAdmin ? 'solid' : 'subtle'}
      >
        {isAdmin ? 'Administrador' : 'Cliente'}
      </Badge>
    );
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
      <Box p={4}>
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          justify="space-between" 
          align={{ base: 'flex-start', md: 'center' }}
          mb={6}
        >
          <Heading as="h1" size="xl">
            Usuários
          </Heading>
          
          <Button
            as={Link}
            href="/usuarios/novo"
            colorScheme="brand"
            leftIcon={<FiUserPlus />}
            mt={{ base: 4, md: 0 }}
          >
            Novo Usuário
          </Button>
        </Flex>
        
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
              placeholder="Buscar por nome ou email" 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </InputGroup>
          
          <HStack spacing={4} flexWrap="wrap">
            <Select 
              maxW="180px"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos os tipos</option>
              <option value="admin">Administradores</option>
              <option value="cliente">Clientes</option>
            </Select>
            
            <Select 
              maxW="180px"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </Select>
            
            <Button 
              colorScheme="brand"
              onClick={filtrarUsuarios}
              leftIcon={<FiFilter />}
              isDisabled={isLoading}
            >
              Filtrar
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
                <Th>Usuário</Th>
                <Th>Email</Th>
                <Th>Tipo</Th>
                <Th>Cadastrado em</Th>
                <Th>Último acesso</Th>
                <Th>Status</Th>
                <Th width="100px">Ações</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={6}>
                    <Spinner size="md" />
                    <Text mt={2}>Carregando usuários...</Text>
                  </Td>
                </Tr>
              ) : usuarios.length > 0 ? (
                usuarios.map((usuario) => (
                  <Tr key={usuario.id}>
                    <Td>
                      <Flex align="center">
                        <Avatar 
                          size="sm" 
                          name={usuario.nome}
                          src={usuario.foto_perfil} 
                          mr={2} 
                        />
                        <Text fontWeight="medium">{usuario.nome}</Text>
                      </Flex>
                    </Td>
                    <Td>{usuario.email}</Td>
                    <Td>{renderTipoUsuario(usuario.tipo)}</Td>
                    <Td>{formatarData(usuario.data_criacao)}</Td>
                    <Td>{formatarData(usuario.ultimo_acesso)}</Td>
                    <Td>
                      <FormControl display="flex" alignItems="center" justifyContent="center">
                        <Switch 
                          colorScheme="green" 
                          isChecked={usuario.ativo}
                          onChange={() => alternarStatus(usuario.id, usuario.ativo)}
                          size="sm"
                          isDisabled={isMutating}
                        />
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
                            icon={<FiEdit />}
                            onClick={() => editarUsuario(usuario.id)}
                          >
                            Editar
                          </MenuItem>
                          <MenuItem 
                            icon={<FiMail />}
                            onClick={() => enviarEmail(usuario.email)}
                          >
                            Enviar email
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem 
                            icon={<FiTrash2 />}
                            onClick={() => excluirUsuario(usuario.id, usuario.nome)}
                            color="red.500"
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
                  <Td colSpan={7} textAlign="center" py={4}>
                    Nenhum usuário encontrado
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
        
        {totalUsuarios > 10 && (
          <Flex justify="center" mt={6}>
            <HStack>
              <Button
                onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                isDisabled={paginaAtual === 1 || isLoading}
              >
                Anterior
              </Button>
              <Text>
                Página {paginaAtual} de {Math.ceil(totalUsuarios / 10)}
              </Text>
              <Button
                onClick={() => setPaginaAtual(prev => prev + 1)}
                isDisabled={paginaAtual >= Math.ceil(totalUsuarios / 10) || isLoading}
              >
                Próxima
              </Button>
            </HStack>
          </Flex>
        )}
      </Box>
    </AdminLayout>
  );
} 