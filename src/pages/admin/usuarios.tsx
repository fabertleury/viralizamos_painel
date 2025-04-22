import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Flex,
  useColorModeValue,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
} from '@chakra-ui/react';
import { FiUsers, FiUserPlus, FiChevronRight } from 'react-icons/fi';
import AdminLayout from '@/components/Layout/AdminLayout';
import TabelaUsuariosDetalhados from '@/components/usuarios/TabelaUsuariosDetalhados';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function AdminUsuarios() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    // Verificar autenticação e permissões
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Verificar se o usuário é administrador
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, user, router]);

  // Extrair parâmetros de query para filtros iniciais
  const { search, role } = router.query;
  const initialSearch = typeof search === 'string' ? search : '';
  const initialRole = typeof role === 'string' ? role : '';

  if (loading || !user) {
    return (
      <AdminLayout>
        <Box p={8} textAlign="center">
          <Text>Carregando...</Text>
        </Box>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Gerenciamento de Usuários | Painel Admin</title>
      </Head>
      
      <AdminLayout>
        <Box p={{ base: 4, md: 8 }}>
          <Breadcrumb separator={<Icon as={FiChevronRight} color="gray.500" />} mb={6}>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Usuários</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          
          <Flex 
            justify="space-between" 
            align="center" 
            mb={6} 
            direction={{ base: "column", md: "row" }}
            gap={{ base: 4, md: 0 }}
          >
            <Box>
              <Heading as="h1" size="xl" display="flex" alignItems="center">
                <Icon as={FiUsers} mr={3} />
                Gerenciamento de Usuários
              </Heading>
              <Text mt={1} color="gray.600">
                Visualize e gerencie todos os usuários da plataforma
              </Text>
            </Box>
            
            <Button 
              as={Link} 
              href="/admin/adicionar"
              colorScheme="blue" 
              leftIcon={<FiUserPlus />}
            >
              Adicionar Usuário
            </Button>
          </Flex>
          
          <Box 
            bg={bgColor} 
            borderRadius="lg" 
            borderWidth="1px"
            borderColor={borderColor}
            p={{ base: 4, md: 6 }}
            shadow="sm"
          >
            <TabelaUsuariosDetalhados 
              initialSearch={initialSearch}
              initialRole={initialRole}
            />
          </Box>
        </Box>
      </AdminLayout>
    </>
  );
} 