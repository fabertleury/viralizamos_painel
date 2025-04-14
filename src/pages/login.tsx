import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailError, setIsEmailError] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

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
      // O redirecionamento já é feito no contexto de autenticação
    } catch (error) {
      console.error('Erro no login:', error);
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
            <Text mt={4} textAlign="center" fontSize="sm" color="gray.500">
              Para fins de teste, use: admin@viralizamos.com / admin123
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
} 