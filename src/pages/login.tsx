import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Container,
  FormErrorMessage,
  useColorModeValue,
  Flex,
  Image,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Cookies from 'js-cookie';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirecionar se estiver autenticado
  useEffect(() => {
    // Se já estiver autenticado, redireciona para o dashboard
    const token = Cookies.get('auth_token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const validateForm = () => {
    let isValid = true;

    // Validar email
    if (!email) {
      setEmailError('Email é obrigatório');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validar senha
    if (!password) {
      setPasswordError('Senha é obrigatória');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await login(email, password);
      // Não precisamos de redirecionamento aqui, o contexto de autenticação já cuida disso
    } catch (error) {
      console.error('Erro no login:', error);
      // Erros são tratados pelo contexto de autenticação
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgColor = useColorModeValue('white', 'gray.700');

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <Stack spacing="8">
        <Stack spacing="6" textAlign="center">
          <Flex justify="center" mb={4}>
            <Image src="/logo.png" alt="Viralizamos Logo" width="200px" />
          </Flex>
          <Heading size="lg" fontWeight="600">
            Login - Painel Administrativo
          </Heading>
        </Stack>
        <Box
          py={{ base: '0', sm: '8' }}
          px={{ base: '4', sm: '10' }}
          bg={bgColor}
          boxShadow={{ base: 'none', sm: 'md' }}
          borderRadius={{ base: 'none', sm: 'xl' }}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing="6">
              <Stack spacing="5">
                <FormControl isInvalid={!!emailError}>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <FormErrorMessage>{emailError}</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!passwordError}>
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <FormErrorMessage>{passwordError}</FormErrorMessage>
                </FormControl>
              </Stack>
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                fontSize="md"
                isLoading={isSubmitting}
              >
                Entrar
              </Button>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  );
} 