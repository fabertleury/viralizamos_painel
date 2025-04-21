import { Box, Button, Heading, Text, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import AdminLayout from '../components/Layout/AdminLayout';

export default function Custom404() {
  const router = useRouter();
  
  return (
    <AdminLayout>
      <Flex
        direction="column"
        justify="center"
        align="center"
        minH="70vh"
        textAlign="center"
        p={8}
      >
        <Heading size="2xl" mb={6}>404</Heading>
        <Heading size="lg" mb={4}>Página não encontrada</Heading>
        <Text fontSize="lg" mb={8} maxW="md">
          A página que você está procurando não existe ou foi movida.
        </Text>
        <Flex gap={4}>
          <Button colorScheme="blue" onClick={() => router.push('/dashboard')}>
            Voltar para o Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Voltar para a página anterior
          </Button>
        </Flex>
      </Flex>
    </AdminLayout>
  );
} 