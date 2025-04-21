import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Badge,
  Stack,
  Code,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  details?: any;
}

// Serviços disponíveis
const SERVICES = [
  { id: 'orders', name: 'Orders API' },
  { id: 'payments', name: 'Payments API' },
  { id: 'painel', name: 'Admin Panel' },
];

export default function Logs() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  
  const [selectedService, setSelectedService] = useState<string>('orders');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Verificar se o usuário é administrador
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.replace('/dashboard');
    }
  }, [user, router, toast]);
  
  // Mock de dados para demonstração
  const fetchLogs = async (service: string) => {
    setIsLoadingLogs(true);
    setError(null);
    
    try {
      // Em produção, substituir por chamada real à API
      setTimeout(() => {
        const mockLogs: LogEntry[] = [];
        
        // Gerar logs fictícios para demonstração
        const now = new Date();
        const levels = ['info', 'warn', 'error', 'debug'];
        const messages = [
          'Requisição processada com sucesso',
          'Tentativa de acesso não autorizado',
          'Falha ao conectar com o banco de dados',
          'Novo usuário registrado',
          'Pedido criado com sucesso',
          'Tempo de resposta excedeu o limite',
          'Transação finalizada'
        ];
        
        // Criar 30 registros de logs
        for (let i = 0; i < 30; i++) {
          const timestamp = new Date(now.getTime() - i * 1000 * 60 * Math.random() * 10);
          const level = levels[Math.floor(Math.random() * levels.length)] as 'info' | 'warn' | 'error' | 'debug';
          const message = messages[Math.floor(Math.random() * messages.length)];
          
          mockLogs.push({
            timestamp: timestamp.toISOString(),
            level,
            message,
            service,
            details: {
              path: `/api/${service}/${Math.floor(Math.random() * 100)}`,
              method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
              statusCode: [200, 201, 400, 401, 403, 404, 500][Math.floor(Math.random() * 7)]
            }
          });
        }
        
        // Ordenar logs por timestamp (mais recentes primeiro)
        mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(mockLogs);
        setIsLoadingLogs(false);
      }, 1000);
      
    } catch (err: any) {
      setError('Erro ao carregar logs: ' + err.message);
      setIsLoadingLogs(false);
    }
  };
  
  // Carregar logs ao montar o componente ou mudar o serviço
  useEffect(() => {
    if (selectedService) {
      fetchLogs(selectedService);
    }
  }, [selectedService]);
  
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedService(e.target.value);
  };
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'blue';
      case 'warn': return 'orange';
      case 'error': return 'red';
      case 'debug': return 'gray';
      default: return 'gray';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (isLoading) {
    return (
      <Container centerContent maxW="container.xl" py={8}>
        <Spinner />
        <Text mt={4}>Carregando...</Text>
      </Container>
    );
  }
  
  return (
    <>
      <Head>
        <title>Logs do Sistema | Viralizamos</title>
      </Head>
      
      <Container maxW="container.xl" py={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading as="h1" size="xl">Logs do Sistema</Heading>
            <Text mt={2} color="gray.600">Monitore a atividade dos serviços em tempo real</Text>
          </Box>
          
          <FormControl maxW="300px">
            <Select
              value={selectedService}
              onChange={handleServiceChange}
              bg="white"
              borderRadius="md"
            >
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </FormControl>
        </Flex>
        
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Box
          bg="white"
          shadow="sm"
          borderRadius="lg"
          overflow="hidden"
        >
          {isLoadingLogs ? (
            <Flex justify="center" align="center" p={8}>
              <Spinner mr={4} />
              <Text>Carregando logs...</Text>
            </Flex>
          ) : logs.length === 0 ? (
            <Box p={8} textAlign="center">
              <Text>Nenhum log encontrado para este serviço.</Text>
            </Box>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Timestamp</Th>
                  <Th>Nível</Th>
                  <Th>Mensagem</Th>
                  <Th>Detalhes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log, index) => (
                  <Tr key={index} _hover={{ bg: 'gray.50' }} fontSize="sm">
                    <Td whiteSpace="nowrap" color="gray.600" fontFamily="mono">
                      {formatDate(log.timestamp)}
                    </Td>
                    <Td>
                      <Badge colorScheme={getLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>{log.message}</Td>
                    <Td>
                      {log.details && (
                        <Code p={2} borderRadius="md" fontSize="xs" maxH="100px" overflowY="auto">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </Code>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
        
        <Flex justify="flex-end" mt={4}>
          <Stack direction="row" spacing={4}>
            <Button
              colorScheme="gray"
              isLoading={isLoadingLogs}
              onClick={() => fetchLogs(selectedService)}
            >
              Atualizar
            </Button>
            <Button
              colorScheme="blue"
              isDisabled={isLoadingLogs}
            >
              Exportar Logs
            </Button>
          </Stack>
        </Flex>
      </Container>
    </>
  );
} 