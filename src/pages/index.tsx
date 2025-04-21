import { useEffect } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';

// Componente de redirecionamento simples
export default function Home() {
  const router = useRouter();
  
  // Verificar se já está logado e redirecionar apropriadamente
  useEffect(() => {
    // Check if user is authenticated
    const token = Cookies.get('auth_token');
    
    if (token) {
      // If authenticated, redirect to dashboard
      router.replace('/dashboard');
    } else {
      // If not authenticated, redirect to login
      router.replace('/login');
    }
  }, [router]);

  // Mostrar loading enquanto redireciona
  return (
    <Flex 
      justify="center" 
      align="center" 
      minH="100vh"
      bg="gray.50"
    >
      <Box textAlign="center">
        <Spinner size="xl" color="brand.500" mb={4} />
        <Text>Redirecionando...</Text>
      </Box>
    </Flex>
  );
} 