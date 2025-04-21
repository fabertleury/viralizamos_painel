import React, { useState, useEffect } from 'react';
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

// Login simples sem depender do AuthContext
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailError, setIsEmailError] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  
  const toast = useToast();

  // Verificar se já está logado antes de renderizar a página
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        
        if (token && user) {
          // Já está logado, redirecionar para o dashboard
          window.location.replace('/dashboard');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }
    };
    
    checkAuth();
  }, []);

  // Login manual sem context
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
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
    
    setIsLoading(true);
    
    try {
      // Credenciais hard-coded - apenas para demonstração
      if (email === 'admin@viralizamos.com' && password === 'admin123') {
        // Criar dados do usuário
        const userData = {
          id: '1',
          name: 'Administrador',
          email: 'admin@viralizamos.com',
          role: 'admin',
        };
        
        // Salvar no localStorage
        localStorage.setItem('auth_token', 'fake-jwt-token');
        localStorage.setItem('auth_user', JSON.stringify(userData));
        
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
        
        // Redirecionar para o dashboard
        window.location.href = '/dashboard';
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      setIsLoading(false);
    }
  };

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
          onSubmit={handleManualLogin}
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
          
          <Text fontSize="sm" color="blue.500" mt={6} cursor="pointer" 
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('auth_user');
                  window.location.reload();
                }}>
            Problemas para entrar? Clique aqui para limpar dados de sessão
          </Text>
        </Box>
      </Stack>
    </Flex>
  );
} 