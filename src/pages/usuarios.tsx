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
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiMail } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

// Dados simulados de usuários
const usuariosSimulados = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'joao@exemplo.com',
    tipo: 'cliente',
    ativo: true,
    dataCadastro: '2023-05-12',
    ultimoAcesso: '2023-10-18',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: '2',
    nome: 'Maria Oliveira',
    email: 'maria@exemplo.com',
    tipo: 'cliente',
    ativo: true,
    dataCadastro: '2023-06-24',
    ultimoAcesso: '2023-10-17',
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
  {
    id: '3',
    nome: 'Carlos Santos',
    email: 'carlos@exemplo.com',
    tipo: 'cliente',
    ativo: false,
    dataCadastro: '2023-04-30',
    ultimoAcesso: '2023-09-05',
    avatar: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: '4',
    nome: 'Ana Costa',
    email: 'ana@exemplo.com',
    tipo: 'admin',
    ativo: true,
    dataCadastro: '2023-03-15',
    ultimoAcesso: '2023-10-20',
    avatar: 'https://i.pravatar.cc/150?img=9',
  },
  {
    id: '5',
    nome: 'Paulo Souza',
    email: 'paulo@exemplo.com',
    tipo: 'cliente',
    ativo: true,
    dataCadastro: '2023-07-11',
    ultimoAcesso: '2023-10-15',
    avatar: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: '6',
    nome: 'Fernanda Lima',
    email: 'fernanda@exemplo.com',
    tipo: 'admin',
    ativo: true,
    dataCadastro: '2023-02-28',
    ultimoAcesso: '2023-10-19',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    id: '7',
    nome: 'Ricardo Pereira',
    email: 'ricardo@exemplo.com',
    tipo: 'cliente',
    ativo: false,
    dataCadastro: '2023-08-05',
    ultimoAcesso: '2023-09-10',
    avatar: 'https://i.pravatar.cc/150?img=7',
  },
];

export default function Usuarios() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(usuariosSimulados);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Filtrar usuários
  const filtrarUsuarios = () => {
    let resultado = usuariosSimulados;
    
    // Aplicar filtro de tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(item => item.tipo === filtroTipo);
    }
    
    // Aplicar filtro de status
    if (filtroStatus !== 'todos') {
      const status = filtroStatus === 'ativo';
      resultado = resultado.filter(item => item.ativo === status);
    }
    
    // Aplicar termo de busca
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      resultado = resultado.filter(
        item =>
          item.nome.toLowerCase().includes(termo) ||
          item.email.toLowerCase().includes(termo)
      );
    }
    
    setUsuarios(resultado);
  };
  
  // Executar filtro quando as dependências mudarem
  useEffect(() => {
    filtrarUsuarios();
  }, [filtroTipo, filtroStatus, termoBusca]);
  
  // Formatação de data
  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
  };
  
  // Simulação de alternar status do usuário
  const alternarStatus = (id: string, statusAtual: boolean) => {
    // Em produção, esta função chamaria uma API
    setUsuarios(prevUsuarios =>
      prevUsuarios.map(user =>
        user.id === id ? { ...user, ativo: !statusAtual } : user
      )
    );
  };
  
  // Simulação de edição de usuário
  const editarUsuario = (id: string) => {
    alert(`Edição simulada do usuário ${id}`);
  };
  
  // Simulação de exclusão de usuário
  const excluirUsuario = (id: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${id}?`)) {
      setUsuarios(prevUsuarios => prevUsuarios.filter(user => user.id !== id));
    }
  };
  
  // Simulação de envio de email
  const enviarEmail = (email: string) => {
    alert(`Email simulado enviado para ${email}`);
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

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Text>Carregando...</Text>
      </Flex>
    );
  }

  return (
    <AdminLayout>
      <Box p={4}>
        <Heading as="h1" size="xl" mb={6}>
          Usuários
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
              {usuarios.length > 0 ? (
                usuarios.map((usuario) => (
                  <Tr key={usuario.id}>
                    <Td>
                      <Flex align="center">
                        <Avatar size="sm" src={usuario.avatar} mr={2} />
                        <Text fontWeight="medium">{usuario.nome}</Text>
                      </Flex>
                    </Td>
                    <Td>{usuario.email}</Td>
                    <Td>{renderTipoUsuario(usuario.tipo)}</Td>
                    <Td>{formatarData(usuario.dataCadastro)}</Td>
                    <Td>{formatarData(usuario.ultimoAcesso)}</Td>
                    <Td>
                      <FormControl display="flex" alignItems="center" justifyContent="center">
                        <Switch 
                          colorScheme="green" 
                          isChecked={usuario.ativo}
                          onChange={() => alternarStatus(usuario.id, usuario.ativo)}
                          size="sm"
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
                            onClick={() => excluirUsuario(usuario.id)}
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
      </Box>
    </AdminLayout>
  );
} 