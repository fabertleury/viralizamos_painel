import React, { useState, useEffect } from 'react';
import {
  Box, 
  Container,
  Heading,
  Text,
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
  Badge,
  useColorModeValue,
  Flex,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Code,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Endpoint {
  path: string;
  method: string;
  description: string;
}

interface ApiInfo {
  message: string;
  version: string;
  status: string;
  timestamp: string;
  endpoints: Endpoint[];
}

// APIs disponíveis no sistema
const APIs = [
  {
    name: 'Orders API',
    baseUrl: process.env.NEXT_PUBLIC_ORDERS_API_URL || 'http://localhost:3002',
    color: 'green',
    data: {
      message: "Viralizamos Orders API",
      version: "1.0.0",
      status: "running",
      timestamp: new Date().toISOString(),
      endpoints: [
        { path: "/health", method: "GET", description: "Verificação de saúde" },
        { path: "/api/orders/create", method: "POST", description: "Criar pedido individual" },
        { path: "/api/orders/batch", method: "POST", description: "Criar múltiplos pedidos de uma transação (array de posts)" },
        { path: "/api/orders/:id", method: "GET", description: "Consultar status de um pedido" },
        { path: "/api/orders/by-transaction/:transactionId", method: "GET", description: "Consultar pedidos por transaction_id" },
        { path: "/api/orders/:id/process", method: "POST", description: "Processar um pedido específico (enviar ao provedor)" },
        { path: "/api/orders/process-by-transaction/:transactionId", method: "POST", description: "Processar todos os pedidos pendentes de uma transação" },
        { path: "/api/orders/by-email", method: "POST", description: "Consultar pedidos por email do usuário" },
        { path: "/api/debug/transaction/:transactionId", method: "GET", description: "Ver estatísticas de rastreamento de uma transação" },
        { path: "/api/orders/webhook/status", method: "POST", description: "Webhook para receber atualizações de status dos provedores" },
        { path: "/api/orders/webhook/payment", method: "POST", description: "Webhook para receber notificações de pagamento" },
        { path: "/api/stats/users/orders", method: "POST", description: "Obter estatísticas de pedidos por lista de emails" }
      ]
    }
  },
  {
    name: 'Payments API',
    baseUrl: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'http://localhost:3003',
    color: 'blue',
    data: {
      message: "Viralizamos Payments API",
      version: "1.0.0",
      status: "running",
      timestamp: new Date().toISOString(),
      endpoints: [
        { path: "/health", method: "GET", description: "Verificação de saúde" },
        { path: "/api/payments/create", method: "POST", description: "Criar nova transação de pagamento" },
        { path: "/api/payments/:id", method: "GET", description: "Consultar status de um pagamento" },
        { path: "/api/payments/by-user/:userId", method: "GET", description: "Listar pagamentos de um usuário" },
        { path: "/api/payments/webhook", method: "POST", description: "Webhook para receber notificações da gateway de pagamento" },
        { path: "/api/users", method: "GET", description: "Listar usuários" },
        { path: "/api/users/:id", method: "GET", description: "Obter detalhes de um usuário" },
        { path: "/api/users/create", method: "POST", description: "Criar novo usuário" },
        { path: "/api/auth/login", method: "POST", description: "Autenticar usuário" },
        { path: "/api/auth/validate-token", method: "GET", description: "Validar token de autenticação" },
        { path: "/admin/users/check-email", method: "GET", description: "Verificar se um email já está em uso" },
        { path: "/admin/users/create", method: "POST", description: "Criar novo usuário admin" }
      ]
    }
  }
];

export default function ApiDocs() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [selectedApi, setSelectedApi] = useState<ApiInfo | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  const handleViewDetails = (api: ApiInfo) => {
    setSelectedApi(api);
    onOpen();
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'green';
      case 'POST': return 'blue';
      case 'PUT': return 'orange';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Container centerContent maxW="container.xl" py={8}>
        <Text>Carregando...</Text>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Documentação de APIs | Viralizamos</title>
      </Head>

      <Container maxW="container.xl" py={8}>
        <Box mb={8}>
          <Heading as="h1" size="xl">Documentação de APIs</Heading>
          <Text mt={2} color="gray.600">Explore os endpoints disponíveis nos microserviços da Viralizamos</Text>
        </Box>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            {APIs.map((api, index) => (
              <Tab key={index}>{api.name}</Tab>
            ))}
          </TabList>

          <TabPanels>
            {APIs.map((api, index) => (
              <TabPanel key={index} p={4}>
                <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg={bgColor}>
                  <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                      <Heading as="h2" size="lg">{api.data.message}</Heading>
                      <Flex mt={2} alignItems="center">
                        <Badge colorScheme={api.data.status === 'running' ? 'green' : 'red'} mr={2}>
                          {api.data.status}
                        </Badge>
                        <Text fontSize="sm" color="gray.500">Versão: {api.data.version}</Text>
                      </Flex>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Base URL: <Code>{api.baseUrl}</Code>
                      </Text>
                    </Box>
                    <Button colorScheme={api.color} onClick={() => handleViewDetails(api.data)}>
                      Ver Detalhes
                    </Button>
                  </Flex>

                  <Table variant="simple" mt={4}>
                    <Thead>
                      <Tr>
                        <Th>Método</Th>
                        <Th>Endpoint</Th>
                        <Th>Descrição</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {api.data.endpoints.map((endpoint, i) => (
                        <Tr key={i}>
                          <Td>
                            <Badge colorScheme={getMethodColor(endpoint.method)}>
                              {endpoint.method}
                            </Badge>
                          </Td>
                          <Td>
                            <Code>{endpoint.path}</Code>
                          </Td>
                          <Td>{endpoint.description}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>

        {/* Modal de detalhes */}
        {selectedApi && (
          <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>{selectedApi.message} - Detalhes</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack align="start" spacing={4}>
                  <Box>
                    <Text fontWeight="bold">Status:</Text>
                    <Badge colorScheme={selectedApi.status === 'running' ? 'green' : 'red'}>
                      {selectedApi.status}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Versão:</Text>
                    <Text>{selectedApi.version}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Última atualização:</Text>
                    <Text>{new Date(selectedApi.timestamp).toLocaleString()}</Text>
                  </Box>
                  <Box w="100%">
                    <Text fontWeight="bold" mb={2}>Endpoints ({selectedApi.endpoints.length}):</Text>
                    <Box borderWidth="1px" borderRadius="md" p={3} maxHeight="300px" overflowY="auto">
                      {selectedApi.endpoints.map((endpoint, i) => (
                        <Box key={i} p={2} mb={2} borderWidth="1px" borderRadius="md">
                          <Flex alignItems="center" mb={1}>
                            <Badge colorScheme={getMethodColor(endpoint.method)} mr={2}>
                              {endpoint.method}
                            </Badge>
                            <Code>{endpoint.path}</Code>
                          </Flex>
                          <Text fontSize="sm">{endpoint.description}</Text>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="blue" onClick={onClose}>Fechar</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </Container>
    </>
  );
} 