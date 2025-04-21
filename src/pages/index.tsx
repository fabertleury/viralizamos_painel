import { useEffect } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';

export default function Home() {
  useEffect(() => {
    // Redirecionar para a página de login usando location.href para evitar problemas com router
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

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