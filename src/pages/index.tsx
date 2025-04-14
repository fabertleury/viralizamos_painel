import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para a página de login
    router.push('/login');
  }, [router]);

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