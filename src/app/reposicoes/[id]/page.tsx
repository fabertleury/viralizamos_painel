'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Heading,
  Text,
  Flex,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Stack,
  StackDivider,
  Button,
  Spinner,
  useToast,
  HStack,
  Icon,
  Textarea,
  FormControl,
  FormLabel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiArrowLeft, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi';
import { buscarReposicaoPorId, atualizarStatusReposicao, processarReposicaoManual } from '@/services/reposicoesService';
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

export default function DetalhesReposicaoPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [reposicao, setReposicao] = useState<Reposicao | null>(null);
  const [loading, setLoading] = useState(true);
  const [resposta, setResposta] = useState('');
  const router = useRouter();
  const toast = useToast();
  
  // Estado para controlar ações
  const [processando, setProcessando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  
  // Dialog para confirmar ações
  const { isOpen: isConfirmacaoOpen, onOpen: onConfirmacaoOpen, onClose: onConfirmacaoClose } = useDisclosure();
  const [acaoConfirmacao, setAcaoConfirmacao] = useState<'processar' | 'aprovar' | 'rejeitar' | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    carregarReposicao();
  }, [id]);

  const carregarReposicao = async () => {
    setLoading(true);
    try {
      const resultado = await buscarReposicaoPorId(id);
      if (resultado) {
        setReposicao(resultado);
        setResposta(resultado.resposta || '');
      }
    } catch (error) {
      console.error('Erro ao carregar reposição:', error);
      toast({
        title: 'Erro ao carregar reposição',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmarAcao = (acao: 'processar' | 'aprovar' | 'rejeitar') => {
    setAcaoConfirmacao(acao);
    onConfirmacaoOpen();
  };

  const executarAcao = async () => {
    if (!acaoConfirmacao || !reposicao) return;

    try {
      if (acaoConfirmacao === 'processar') {
        setProcessando(true);
        await processarReposicaoManual(reposicao.id);
        toast({
          title: 'Reposição processada com sucesso',
          status: 'success',
          duration: 3000
        });
      } else if (acaoConfirmacao === 'aprovar' || acaoConfirmacao === 'rejeitar') {
        setAtualizando(true);
        const novoStatus = acaoConfirmacao === 'aprovar' ? 'processado' : 'rejeitado';
        await atualizarStatusReposicao(reposicao.id, novoStatus, resposta);
        toast({
          title: `Reposição ${acaoConfirmacao === 'aprovar' ? 'aprovada' : 'rejeitada'} com sucesso`,
          status: 'success',
          duration: 3000
        });
      }
      
      // Recarregar reposição
      await carregarReposicao();
    } catch (error) {
      toast({
        title: `Erro ao ${acaoConfirmacao} reposição`,
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 'error',
        duration: 5000
      });
    } finally {
      setProcessando(false);
      setAtualizando(false);
      onConfirmacaoClose();
    }
  };

  const voltar = () => {
    router.push('/reposicoes');
  };

  if (loading) {
    return (
      <Box p={5} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Carregando detalhes da reposição...</Text>
      </Box>
    );
  }

  if (!reposicao) {
    return (
      <Box p={5}>
        <Button leftIcon={<FiArrowLeft />} onClick={voltar} mb={5}>
          Voltar
        </Button>
        <Text>Reposição não encontrada</Text>
      </Box>
    );
  }

  return (
    <Box p={5}>
      <Button leftIcon={<FiArrowLeft />} onClick={voltar} mb={5}>
        Voltar
      </Button>
      
      <Heading size="lg" mb={5}>Detalhes da Reposição</Heading>
      
      <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
        {/* Informações gerais */}
        <Card flex="1">
          <CardHeader>
            <Heading size="md">Informações Gerais</Heading>
          </CardHeader>
          
          <CardBody>
            <Stack divider={<StackDivider />} spacing="4">
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  ID da Reposição
                </Heading>
                <Text pt="2">{reposicao.id}</Text>
              </Box>
              
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  Status
                </Heading>
                <Box pt="2">
                  <StatusBadge status={reposicao.status} />
                </Box>
              </Box>
              
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  ID do Pedido
                </Heading>
                <Text pt="2">{reposicao.orderId}</Text>
              </Box>
              
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  Data de Solicitação
                </Heading>
                <Text pt="2">
                  {reposicao.dataSolicitacao 
                    ? format(new Date(reposicao.dataSolicitacao), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) 
                    : '-'}
                </Text>
              </Box>
              
              {reposicao.dataProcessamento && (
                <Box>
                  <Heading size="xs" textTransform="uppercase">
                    Data de Processamento
                  </Heading>
                  <Text pt="2">
                    {format(new Date(reposicao.dataProcessamento), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </Text>
                </Box>
              )}
              
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  Tentativas
                </Heading>
                <Text pt="2">{reposicao.tentativas}</Text>
              </Box>
              
              {reposicao.processadoPor && (
                <Box>
                  <Heading size="xs" textTransform="uppercase">
                    Processado Por
                  </Heading>
                  <Text pt="2">{reposicao.processadoPor}</Text>
                </Box>
              )}
            </Stack>
          </CardBody>
        </Card>
        
        {/* Detalhes do pedido e mensagens */}
        <Card flex="1">
          <CardHeader>
            <Heading size="md">Detalhes da Solicitação</Heading>
          </CardHeader>
          
          <CardBody>
            <Stack divider={<StackDivider />} spacing="4">
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  Motivo da Reposição
                </Heading>
                <Text pt="2">{reposicao.motivo}</Text>
              </Box>
              
              {reposicao.observacoes && (
                <Box>
                  <Heading size="xs" textTransform="uppercase">
                    Observações
                  </Heading>
                  <Text pt="2">{reposicao.observacoes}</Text>
                </Box>
              )}
              
              <Box>
                <Heading size="xs" textTransform="uppercase">
                  Resposta
                </Heading>
                {reposicao.status === 'pendente' ? (
                  <FormControl mt={2}>
                    <Textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Insira uma resposta para a solicitação de reposição"
                      rows={5}
                    />
                  </FormControl>
                ) : (
                  <Text pt="2">{reposicao.resposta || 'Sem resposta'}</Text>
                )}
              </Box>
            </Stack>
          </CardBody>
        </Card>
      </Flex>
      
      {/* Ações */}
      {reposicao.status === 'pendente' && (
        <Card mt={5}>
          <CardHeader>
            <Heading size="md">Ações</Heading>
          </CardHeader>
          
          <CardBody>
            <HStack spacing={4}>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                colorScheme="blue"
                onClick={() => confirmarAcao('processar')}
                isLoading={processando}
              >
                Processar Manualmente
              </Button>
              
              <Button
                leftIcon={<Icon as={FiCheck} />}
                colorScheme="green"
                onClick={() => confirmarAcao('aprovar')}
                isLoading={atualizando}
              >
                Aprovar Reposição
              </Button>
              
              <Button
                leftIcon={<Icon as={FiX} />}
                colorScheme="red"
                onClick={() => confirmarAcao('rejeitar')}
                isLoading={atualizando}
              >
                Rejeitar Reposição
              </Button>
            </HStack>
          </CardBody>
        </Card>
      )}
      
      {/* Dialog de confirmação */}
      <AlertDialog
        isOpen={isConfirmacaoOpen}
        leastDestructiveRef={cancelRef}
        onClose={onConfirmacaoClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {acaoConfirmacao === 'processar' 
                ? 'Processar Reposição' 
                : acaoConfirmacao === 'aprovar' 
                  ? 'Aprovar Reposição' 
                  : 'Rejeitar Reposição'}
            </AlertDialogHeader>
            
            <AlertDialogBody>
              {acaoConfirmacao === 'processar' 
                ? 'Tem certeza que deseja processar esta reposição manualmente?' 
                : acaoConfirmacao === 'aprovar' 
                  ? 'Tem certeza que deseja aprovar esta reposição?' 
                  : 'Tem certeza que deseja rejeitar esta reposição?'}
              {' '}Esta ação não pode ser desfeita.
            </AlertDialogBody>
            
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onConfirmacaoClose}>
                Cancelar
              </Button>
              <Button 
                colorScheme={
                  acaoConfirmacao === 'processar' 
                    ? 'blue' 
                    : acaoConfirmacao === 'aprovar' 
                      ? 'green' 
                      : 'red'
                } 
                onClick={executarAcao} 
                ml={3}
                isLoading={processando || atualizando}
              >
                Confirmar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 