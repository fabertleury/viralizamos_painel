import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  InputGroup,
  InputRightElement,
  FormErrorMessage,
  useToast,
  Image,
  Spinner,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';

// Componente de login simplificado
const LoginPage = () => {
  // Estado local do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailError, setIsEmailError] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  
  // Estado de carregamento inicial
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Context de autenticação
  const { login, isLoading } = useAuth();
  const toast = useToast();

  // Verificação única ao carregar a página
  useEffect(() => {
    // Verificar se já existe uma sessão válida e redirecionar diretamente
    if (typeof window !== 'undefined') {
      try {
        const token = window.localStorage.getItem('auth_token');
        const user = window.localStorage.getItem('auth_user');
        
        if (token && user) {
          // Já está logado, redirecionar para o dashboard
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        // Finalizar o carregamento inicial independentemente do resultado
        setInitialLoading(false);
      }
    } else {
      // No SSR, apenas mostrar o componente
      setInitialLoading(false);
    }
  }, []);

  // Função para submeter o formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações simples
    let hasError = false;
    
    if (!email) {
      setIsEmailError(true);
      hasError = true;
    } else {
      setIsEmailError(false);
    }
    
    if (!password) {
      setIsPasswordError(true);
      hasError = true;
    } else {
      setIsPasswordError(false);
    }
    
    if (hasError) return;
    
    try {
      // Tentativa de login - o redirecionamento ocorre no AuthContext
      await login(email, password);
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  // Mostrar loading enquanto verifica a autenticação inicial
  if (initialLoading) {
    return (
      <Flex
        minH={'100vh'}
        align={'center'}
        justify={'center'}
        bg={useColorModeValue('gray.50', 'gray.800')}
      >
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  // Renderizar o formulário de login
  return (
    <Flex
      minH={'100vh'}
      align={'center'}
      justify={'center'}
      bg={useColorModeValue('gray.50', 'gray.800')}
    >
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Box textAlign="center" mb={4}>
            <Image 
              src="/logo.png" 
              alt="Viralizamos Logo" 
              height="60px"
              fallbackSrc="https://placehold.co/180x60/3182CE/FFFFFF?text=Viralizamos"
            />
          </Box>
          <Heading fontSize={'4xl'} color={'brand.500'}>Painel Administrativo</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            Acesse para gerenciar o sistema
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow={'lg'}
          p={8}
          as="form"
          onSubmit={handleSubmit}
        >
          <Stack spacing={4}>
            <FormControl id="email" isRequired isInvalid={isEmailError}>
              <FormLabel>Email</FormLabel>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {isEmailError && (
                <FormErrorMessage>Email é obrigatório</FormErrorMessage>
              )}
            </FormControl>
            <FormControl id="password" isRequired isInvalid={isPasswordError}>
              <FormLabel>Senha</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <InputRightElement h={'full'}>
                  <Button
                    variant={'ghost'}
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              {isPasswordError && (
                <FormErrorMessage>Senha é obrigatória</FormErrorMessage>
              )}
            </FormControl>
            <Stack spacing={10} pt={4}>
              <Button
                type="submit"
                bg={'brand.500'}
                color={'white'}
                _hover={{
                  bg: 'brand.600',
                }}
                isLoading={isLoading}
                loadingText="Entrando..."
              >
                Entrar
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

// Exportar como componente dinâmico para evitar erros de hidratação
export default dynamic(() => Promise.resolve(LoginPage), {
  ssr: false
}); 