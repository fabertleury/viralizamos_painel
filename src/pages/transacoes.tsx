import React, { useEffect, useState, useMemo } from 'react';
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
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';
import AdminLayout from '../components/Layout/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';

// Interface para transações
interface Transacao {
  id: string;
  data_criacao: Date;
  valor: number;
  status: string;
  metodo_pagamento: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  produto_id: string;
  produto_nome: string;
  order_id?: string;
}

export default function Transacoes() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  // Obter as cores para uso no componente - mover para fora de qualquer condicional
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBgColor = useColorModeValue('gray.50', 'gray.700');
  
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [totalTransacoes, setTotalTransacoes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);
  
  // Função para carregar transações com filtros
  const carregarTransacoes = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {
        pagina,
        limite: itensPorPagina
      };
      
      if (filtroStatus !== 'todos') {
        params.status = filtroStatus;
      }
      
      if (filtroMetodo !== 'todos') {
        params.metodo = filtroMetodo;
      }
      
      if (termoBusca) {
        params.termoBusca = termoBusca;
      }
      
      // Adicionar logs para diagnóstico
      console.log('[Transacoes] Iniciando busca de transações');
      console.log('[Transacoes] Parâmetros:', params);
      
      const response = await axios.get('/api/transacoes', { params });
      
      console.log('[Transacoes] Resposta recebida:', response);
      console.log('[Transacoes] Total de transações:', response.data.total);
      console.log('[Transacoes] Dados retornados:', response.data);
      
      if (response.data.transacoes && Array.isArray(response.data.transacoes)) {
        console.log('[Transacoes] Número de transações recebidas:', response.data.transacoes.length);
        setTransacoes(response.data.transacoes);
        setTotalTransacoes(response.data.total);
      } else {
        console.error('[Transacoes] Formato de dados inválido:', response.data);
        setTransacoes([]);
        setTotalTransacoes(0);
        toast({
          title: 'Formato de dados inválido',
          description: 'O servidor retornou dados em um formato inesperado.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[Transacoes] Erro ao carregar transações:', error);
      setTransacoes([]);
      setTotalTransacoes(0);
      toast({
        title: 'Erro ao carregar transações',
        description: 'Ocorreu um erro ao buscar as transações. Tente novamente mais tarde.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar transações quando os filtros ou a página mudarem
  useEffect(() => {
    if (isAuthenticated) {
      carregarTransacoes();
    }
  }, [isAuthenticated, pagina, itensPorPagina]);
  
  // Função para aplicar filtros
  const aplicarFiltros = () => {
    setPagina(1); // Resetar para a primeira página ao filtrar
    carregarTransacoes();
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
  
  // Função para exibir o status com a cor adequada
  const renderStatus = (status: string) => {
    let color = 'gray';
    let texto = 'Desconhecido';
    
    switch (status.toLowerCase()) {
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
        texto = status;
    }
    
    return <Badge colorScheme={color}>{texto}</Badge>;
  };
  
  // Calcular número total de páginas
  const totalPaginas = Math.ceil(totalTransacoes / itensPorPagina);
  
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
          Transações
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
              placeholder="Buscar por ID, cliente ou email" 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </InputGroup>
          
          <HStack spacing={4}>
            <Select 
              maxW="180px"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="recusado">Recusado</option>
              <option value="estornado">Estornado</option>
              <option value="em_analise">Em Análise</option>
            </Select>
            
            <Select 
              maxW="180px"
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
            >
              <option value="todos">Todos os métodos</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="boleto">Boleto</option>
              <option value="pix">Pix</option>
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
              onClick={carregarTransacoes}
              isLoading={isLoading}
            >
              Atualizar
            </Button>
          </HStack>
        </Flex>
        
        <Box
          overflowX="auto"
          bg={bgColor}
          shadow="md"
          rounded="lg"
        >
          <Table variant="simple">
            <Thead bg={headerBgColor}>
              <Tr>
                <Th>ID</Th>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th>Método</Th>
                <Th>Produto</Th>
                <Th isNumeric>Valor</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={6}>
                    <Spinner size="md" color="brand.500" mx="auto" />
                    <Text mt={2}>Carregando transações...</Text>
                  </Td>
                </Tr>
              ) : transacoes.length > 0 ? (
                transacoes.map((transacao) => (
                  <Tr key={transacao.id}>
                    <Td fontFamily="mono">{transacao.id}</Td>
                    <Td>{formatarData(transacao.data_criacao)}</Td>
                    <Td>{transacao.cliente_nome || transacao.cliente_id}</Td>
                    <Td>{transacao.metodo_pagamento}</Td>
                    <Td>{transacao.produto_nome || '-'}</Td>
                    <Td isNumeric>{formatarValor(transacao.valor)}</Td>
                    <Td>{renderStatus(transacao.status)}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={4}>
                    Nenhuma transação encontrada
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          
          {/* Paginação */}
          {!isLoading && transacoes.length > 0 && (
            <Flex justify="space-between" align="center" p={4} borderTop="1px" borderColor="gray.200">
              <Text color="gray.500">
                Mostrando {transacoes.length} de {totalTransacoes} resultados
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
    </AdminLayout>
  );
} 