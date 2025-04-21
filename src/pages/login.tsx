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

const LoginPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailError, setIsEmailError] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  const { login, isLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  // Verificar se o componente foi montado
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verificar autenticação
  useEffect(() => {
    if (isMounted && isAuthenticated && typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isMounted]);

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
      await login(email, password);
      // O redirecionamento é feito pelo contexto de autenticação
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  // Se o componente ainda não foi montado, mostra um loader
  if (!isMounted) {
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
                />
                <InputRightElement h={'full'}>
                  <Button
                    variant={'ghost'}
                    onClick={() => setShowPassword((show) => !show)}
                  >
                    {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              {isPasswordError && (
                <FormErrorMessage>Senha é obrigatória</FormErrorMessage>
              )}
            </FormControl>
            <Stack spacing={10}>
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