'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Button,
  Badge,
  Flex,
  Input,
  Select,
  HStack,
  useToast,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { FiRefreshCw, FiSearch, FiEdit, FiCheck, FiX, FiEye, FiPlus } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buscarReposicoes, criarReposicao, processarReposicaoManual, atualizarStatusReposicao, buscarEstatisticasReposicoes } from '@/services/reposicoesService';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

// Componente para exibir o status da reposição
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'gray';
  let label = 'Desconhecido';

  switch (status) {
    case 'pendente':
      color = 'yellow';
      label = 'Pendente';
      break;
    case 'processado':
      color = 'green';
      label = 'Processado';
      break;
    case 'processando':
      color = 'blue';
      label = 'Processando';
      break;
    case 'rejeitado':
      color = 'red';
      label = 'Rejeitado';
      break;
    case 'erro':
      color = 'red';
      label = 'Erro';
      break;
    default:
      label = status || 'Desconhecido';
  }

  return <Badge colorScheme={color}>{label}</Badge>;
};

// Interface para o objeto de reposição
interface Reposicao {
  id: string;
  orderId: string;
  motivo: string;
  observacoes?: string;
  status: string;
  resposta?: string;
  tentativas: number;
  dataSolicitacao: Date;
  dataProcessamento?: Date;
  processadoPor?: string;
  order?: any;
  cliente?: any;
}

// Página principal de reposições
export default function ReposicoesPage() {
  const [reposicoes, setReposicoes] = useState<Reposicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [limite, setLimite] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    processadas: 0,
    rejeitadas: 0,
    ultimasDias: [] as { data: string; quantidade: number }[]
  });
  
  // Modal para criar nova reposição
  const { isOpen: isNovaReposicaoOpen, onOpen: onNovaReposicaoOpen, onClose: onNovaReposicaoClose } = useDisclosure();
  const [novaReposicao, setNovaReposicao] = useState({
    orderId: '',
    motivo: '',
    observacoes: ''
  });
  const [enviandoReposicao, setEnviandoReposicao] = useState(false);
  
  // Dialog para confirmar processamento
  const [reposicaoParaProcessar, setReposicaoParaProcessar] = useState<string | null>(null);
  const { isOpen: isConfirmacaoOpen, onOpen: onConfirmacaoOpen, onClose: onConfirmacaoClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [processando, setProcessando] = useState(false);
  
  const toast = useToast();
  const router = useRouter();

  // Carregar reposições e estatísticas
  useEffect(() => {
    carregarReposicoes();
    carregarEstatisticas();
  }, [paginaAtual, filtroStatus, limite]);

  // Função para carregar as reposições
  const carregarReposicoes = async () => {
    setLoading(true);
    try {
      const resultado = await buscarReposicoes({
        status: filtroStatus || undefined,
        termoBusca: termoBusca || undefined,
        pagina: paginaAtual,
        limite
      });
      
      setReposicoes(resultado.dados);
      setTotal(resultado.total);
      setTotalPaginas(resultado.totalPaginas);
    } catch (error) {
      console.error('Erro ao carregar reposições:', error);
      toast({
        title: 'Erro ao carregar reposições',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar estatísticas
  const carregarEstatisticas = async () => {
    try {
      const estatisticas = await buscarEstatisticasReposicoes();
      setStats(estatisticas);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    setPaginaAtual(1); // Volta para a primeira página ao filtrar
    carregarReposicoes();
  };

  // Função para resetar filtros
  const resetarFiltros = () => {
    setFiltroStatus('');
    setTermoBusca('');
    setPaginaAtual(1);
  };

  // Função para ir para a página de detalhes
  const verDetalhes = (id: string) => {
    router.push(`/reposicoes/${id}`);
  };

  // Função para criar nova reposição
  const handleNovaReposicao = async () => {
    if (!novaReposicao.orderId) {
      toast({
        title: 'ID do pedido obrigatório',
        description: 'Por favor, informe o ID do pedido para criar a reposição',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    if (!novaReposicao.motivo) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo para a reposição',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    setEnviandoReposicao(true);
    try {
      await criarReposicao(novaReposicao);
      toast({
        title: 'Reposição criada com sucesso',
        status: 'success',
        duration: 3000
      });
      onNovaReposicaoClose();
      setNovaReposicao({
        orderId: '',
        motivo: '',
        observacoes: ''
      });
      carregarReposicoes();
      carregarEstatisticas();
    } catch (error) {
      toast({
        title: 'Erro ao criar reposição',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
        duration: 5000
      });
    } finally {
      setEnviandoReposicao(false);
    }
  };

  // Função para iniciar confirmação de processamento
  const confirmarProcessamento = (id: string) => {
    setReposicaoParaProcessar(id);
    onConfirmacaoOpen();
  };

  // Função para processar reposição manualmente
  const processarReposicao = async () => {
    if (!reposicaoParaProcessar) return;
    
    setProcessando(true);
    try {
      await processarReposicaoManual(reposicaoParaProcessar);
      toast({
        title: 'Reposição processada com sucesso',
        status: 'success',
        duration: 3000
      });
      carregarReposicoes();
      carregarEstatisticas();
    } catch (error) {
      toast({
        title: 'Erro ao processar reposição',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
        duration: 5000
      });
    } finally {
      setProcessando(false);
      onConfirmacaoClose();
      setReposicaoParaProcessar(null);
    }
  };

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>Gerenciamento de Reposições</Heading>
      
      {/* Cards de estatísticas */}
      <StatGroup mb={6} gap={4}>
        <Card flex="1">
          <CardBody>
            <Stat>
              <StatLabel>Total de Reposições</StatLabel>
              <StatNumber>{stats.total}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        
        <Card flex="1">
          <CardBody>
            <Stat>
              <StatLabel>Pendentes</StatLabel>
              <StatNumber>{stats.pendentes}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        
        <Card flex="1">
          <CardBody>
            <Stat>
              <StatLabel>Processadas</StatLabel>
              <StatNumber>{stats.processadas}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        
        <Card flex="1">
          <CardBody>
            <Stat>
              <StatLabel>Rejeitadas</StatLabel>
              <StatNumber>{stats.rejeitadas}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </StatGroup>
      
      {/* Filtros */}
      <Flex mb={5} wrap="wrap" gap={4} alignItems="flex-end">
        <Box flex="1" minW="200px">
          <FormLabel htmlFor="filtroStatus">Status</FormLabel>
          <Select 
            id="filtroStatus"
            value={filtroStatus} 
            onChange={e => setFiltroStatus(e.target.value)}
            placeholder="Todos os status"
          >
            <option value="pendente">Pendente</option>
            <option value="processando">Processando</option>
            <option value="processado">Processado</option>
            <option value="rejeitado">Rejeitado</option>
            <option value="erro">Erro</option>
          </Select>
        </Box>
        
        <Box flex="2" minW="300px">
          <FormLabel htmlFor="termoBusca">Buscar</FormLabel>
          <Input 
            id="termoBusca"
            value={termoBusca} 
            onChange={e => setTermoBusca(e.target.value)}
            placeholder="ID do pedido, motivo..."
          />
        </Box>
        
        <HStack spacing={2}>
          <Button
            leftIcon={<FiSearch />}
            colorScheme="blue"
            onClick={aplicarFiltros}
          >
            Buscar
          </Button>
          
          <Button
            variant="outline"
            onClick={resetarFiltros}
          >
            Limpar
          </Button>
          
          <Button
            leftIcon={<FiPlus />}
            colorScheme="green"
            onClick={onNovaReposicaoOpen}
          >
            Nova Reposição
          </Button>
        </HStack>
      </Flex>
      
      {/* Tabela de reposições */}
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Pedido</Th>
              <Th>Motivo</Th>
              <Th>Status</Th>
              <Th>Data Solicitação</Th>
              <Th>Tentativas</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={10}>
                  <Spinner size="lg" />
                  <Text mt={4}>Carregando reposições...</Text>
                </Td>
              </Tr>
            ) : reposicoes.length === 0 ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={10}>
                  <Text>Nenhuma reposição encontrada</Text>
                </Td>
              </Tr>
            ) : (
              reposicoes.map(reposicao => (
                <Tr key={reposicao.id}>
                  <Td>{reposicao.id.substring(0, 8)}...</Td>
                  <Td>{reposicao.orderId.substring(0, 8)}...</Td>
                  <Td>{reposicao.motivo.length > 30 ? `${reposicao.motivo.substring(0, 30)}...` : reposicao.motivo}</Td>
                  <Td><StatusBadge status={reposicao.status} /></Td>
                  <Td>{reposicao.dataSolicitacao 
                    ? format(new Date(reposicao.dataSolicitacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }) 
                    : '-'}</Td>
                  <Td>{reposicao.tentativas}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Ver detalhes"
                        icon={<FiEye />}
                        size="sm"
                        onClick={() => verDetalhes(reposicao.id)}
                      />
                      
                      {reposicao.status === 'pendente' && (
                        <IconButton
                          aria-label="Processar"
                          icon={<FiRefreshCw />}
                          size="sm"
                          colorScheme="blue"
                          onClick={() => confirmarProcessamento(reposicao.id)}
                        />
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
      
      {/* Paginação */}
      <Flex justifyContent="space-between" alignItems="center" mt={4}>
        <Text fontSize="sm">
          Mostrando {reposicoes.length} de {total} reposições
        </Text>
        
        <HStack spacing={2}>
          <Button
            size="sm"
            onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
            isDisabled={paginaAtual === 1 || loading}
          >
            Anterior
          </Button>
          
          <Text fontSize="sm">
            Página {paginaAtual} de {totalPaginas}
          </Text>
          
          <Button
            size="sm"
            onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
            isDisabled={paginaAtual === totalPaginas || loading}
          >
            Próxima
          </Button>
        </HStack>
      </Flex>
      
      {/* Modal para criar nova reposição */}
      <Modal isOpen={isNovaReposicaoOpen} onClose={onNovaReposicaoClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nova Solicitação de Reposição</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl isRequired mb={4}>
              <FormLabel>ID do Pedido</FormLabel>
              <Input 
                value={novaReposicao.orderId} 
                onChange={e => setNovaReposicao({...novaReposicao, orderId: e.target.value})}
                placeholder="Informe o ID do pedido"
              />
            </FormControl>
            
            <FormControl isRequired mb={4}>
              <FormLabel>Motivo</FormLabel>
              <Input 
                value={novaReposicao.motivo} 
                onChange={e => setNovaReposicao({...novaReposicao, motivo: e.target.value})}
                placeholder="Motivo da solicitação"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Observações</FormLabel>
              <Textarea 
                value={novaReposicao.observacoes} 
                onChange={e => setNovaReposicao({...novaReposicao, observacoes: e.target.value})}
                placeholder="Observações adicionais"
                rows={4}
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={handleNovaReposicao}
              isLoading={enviandoReposicao}
            >
              Criar
            </Button>
            <Button onClick={onNovaReposicaoClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Dialog de confirmação para processar reposição */}
      <AlertDialog
        isOpen={isConfirmacaoOpen}
        leastDestructiveRef={cancelRef}
        onClose={onConfirmacaoClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Processar Reposição
            </AlertDialogHeader>
            
            <AlertDialogBody>
              Tem certeza que deseja processar esta reposição manualmente? 
              Esta ação não pode ser desfeita.
            </AlertDialogBody>
            
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onConfirmacaoClose}>
                Cancelar
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={processarReposicao} 
                ml={3}
                isLoading={processando}
              >
                Processar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 