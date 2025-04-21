import { useEffect } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';

// Componente de redirecionamento simples
export default function Home() {
  // Verificar se já está logado e redirecionar apropriadamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      
      if (token && user) {
        // Já está logado, redirecionar para o dashboard
        window.location.replace('/dashboard');
      } else {
        // Não está logado, redirecionar para login
        window.location.replace('/login');
      }
    }
  }, []);

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