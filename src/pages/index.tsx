import { useEffect, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import dynamic from 'next/dynamic';

// Componente principal
const HomePage = () => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    // Redirecionar para a página de login usando location.href para evitar problemas com router
    if (typeof window !== 'undefined') {
      // Adicionar um pequeno delay para garantir que tudo esteja carregado
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
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
};

// Exportar como componente dinâmico para evitar erros de hidratação
export default dynamic(() => Promise.resolve(HomePage), {
  ssr: false
}); 