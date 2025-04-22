import React, { useState, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  Avatar,
  Skeleton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Tooltip,
  Stack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiMoreVertical, FiEye, FiEdit, FiUserX } from 'react-icons/fi';
import { fetchDetailedUsers, DetailedUser } from '@/services/adminService';
import NextLink from 'next/link';
import Link from 'next/link';

interface TabelaUsuariosDetalhadosProps {
  initialSearch?: string;
  initialRole?: string;
}

const TabelaUsuariosDetalhados: React.FC<TabelaUsuariosDetalhadosProps> = ({
  initialSearch = '',
  initialRole = '',
}) => {
  const [users, setUsers] = useState<DetailedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [role, setRole] = useState(initialRole);
  const toast = useToast();

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const tableRowColor = useColorModeValue('white', 'gray.800');
  const tableHoverColor = useColorModeValue('gray.50', 'gray.700');

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Função para formatar datas
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchDetailedUsers(search, role, page, 10);
      
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search, role]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1); // Volta para a primeira página ao buscar
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value);
    setPage(1); // Volta para a primeira página ao filtrar
  };

  const goToPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // Renderizar o badge de tipo de usuário
  const renderRoleBadge = (role: string) => {
    let color;
    let label;

    switch (role) {
      case 'admin':
        color = 'red';
        label = 'Admin';
        break;
      case 'customer':
        color = 'green';
        label = 'Cliente';
        break;
      case 'provider':
        color = 'blue';
        label = 'Fornecedor';
        break;
      default:
        color = 'gray';
        label = role || 'Usuário';
    }

    return (
      <Badge colorScheme={color} variant="subtle" borderRadius="full" px={2}>
        {label}
      </Badge>
    );
  };

  return (
    <Box>
      <Flex direction={{ base: 'column', md: 'row' }} justifyContent="space-between" mb={4} gap={4}>
        <HStack spacing={4} flex={1}>
          <InputGroup maxW={{ base: 'full', md: '320px' }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Buscar usuário"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              borderRadius="md"
            />
          </InputGroup>
          <Button colorScheme="blue" onClick={handleSearch}>
            Buscar
          </Button>
        </HStack>

        <HStack spacing={4}>
          <Flex align="center">
            <FiFilter style={{ marginRight: '8px' }} />
            <Select
              placeholder="Todos os tipos"
              value={role}
              onChange={handleRoleChange}
              maxW="200px"
              borderRadius="md"
            >
              <option value="">Todos</option>
              <option value="admin">Administradores</option>
              <option value="customer">Clientes</option>
              <option value="provider">Fornecedores</option>
            </Select>
          </Flex>
        </HStack>
      </Flex>

      {loading ? (
        <Stack spacing={4}>
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
        </Stack>
      ) : (
        <>
          <Box overflowX="auto">
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th>Usuário</Th>
                  <Th>Tipo</Th>
                  <Th>Data de Cadastro</Th>
                  <Th isNumeric>Total Compras</Th>
                  <Th isNumeric>Total Gasto</Th>
                  <Th>Última Compra</Th>
                  <Th>Ações</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr 
                    key={user.id}
                    _hover={{ bg: tableHoverColor }}
                    bg={tableRowColor}
                  >
                    <Td>
                      <Flex align="center">
                        <Avatar size="sm" name={user.name} mr={2} />
                        <Box>
                          <Text fontWeight="medium">{user.name}</Text>
                          <Text fontSize="sm" color="gray.500">{user.email}</Text>
                        </Box>
                      </Flex>
                    </Td>
                    <Td>{renderRoleBadge(user.role)}</Td>
                    <Td>{formatDate(user.created_at)}</Td>
                    <Td isNumeric>{user.metrics.orders_count}</Td>
                    <Td isNumeric>{formatCurrency(user.metrics.total_spent)}</Td>
                    <Td>{user.metrics.last_purchase ? formatDate(user.metrics.last_purchase.date) : 'Nunca'}</Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                          aria-label="Ações"
                        />
                        <MenuList>
                          <Link href={`/usuarios/${user.id}`} passHref>
                            <MenuItem icon={<FiEye />}>Ver Detalhes</MenuItem>
                          </Link>
                          <Link href={`/usuarios/editar/${user.id}`} passHref>
                            <MenuItem icon={<FiEdit />}>Editar</MenuItem>
                          </Link>
                          <MenuItem icon={<FiUserX />} color="red.500">Desativar</MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          
          {users.length === 0 && (
            <Box textAlign="center" py={10}>
              <Text color="gray.500">Nenhum usuário encontrado</Text>
            </Box>
          )}

          <Flex justifyContent="space-between" mt={4} align="center">
            <Text color="gray.500">
              Mostrando {users.length} de {totalItems} usuários
            </Text>
            
            <HStack spacing={2}>
              <Button
                size="sm"
                onClick={() => goToPage(page - 1)}
                isDisabled={page <= 1}
              >
                Anterior
              </Button>
              
              <Text>
                Página {page} de {totalPages}
              </Text>
              
              <Button
                size="sm"
                onClick={() => goToPage(page + 1)}
                isDisabled={page >= totalPages}
              >
                Próxima
              </Button>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
};

export default TabelaUsuariosDetalhados; 