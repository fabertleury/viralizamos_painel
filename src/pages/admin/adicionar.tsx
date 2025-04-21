import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Head from 'next/head';

export default function AdicionarAdmin() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmSenha: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirecionar se não estiver autenticado
  React.useEffect(() => {
    if (!isLoading && !user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Verificar se o usuário é administrador
  React.useEffect(() => {
    if (user && user.role !== 'admin' && typeof window !== 'undefined') {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.replace('/dashboard');
    }
  }, [user, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Limpar erro ao editar o campo
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'A senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.senha !== formData.confirmSenha) {
      newErrors.confirmSenha = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/admin/create', {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      toast({
        title: 'Sucesso!',
        description: 'Administrador criado com sucesso.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Limpar formulário
      setFormData({
        nome: '',
        email: '',
        senha: '',
        confirmSenha: '',
      });
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ocorreu um erro ao criar o administrador';
      
      toast({
        title: 'Erro',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <Container centerContent maxW="lg" py={8}>
        <Text>Carregando...</Text>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Adicionar Administrador | Viralizamos</title>
      </Head>
      <Container maxW="lg" py={8}>
        <Box mb={8} textAlign="center">
          <Heading as="h1" size="xl">Adicionar Novo Administrador</Heading>
          <Text mt={4}>Crie uma nova conta de administrador para o painel</Text>
        </Box>
        
        <Box p={8} shadow="base" rounded="lg" bg="white">
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!errors.nome} isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Digite o nome completo"
                />
                <FormErrorMessage>{errors.nome}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.email} isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Digite o email"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.senha} isRequired>
                <FormLabel>Senha</FormLabel>
                <Input
                  name="senha"
                  type="password"
                  value={formData.senha}
                  onChange={handleChange}
                  placeholder="Digite a senha"
                />
                <FormErrorMessage>{errors.senha}</FormErrorMessage>
              </FormControl>
              
              <FormControl isInvalid={!!errors.confirmSenha} isRequired>
                <FormLabel>Confirmar Senha</FormLabel>
                <Input
                  name="confirmSenha"
                  type="password"
                  value={formData.confirmSenha}
                  onChange={handleChange}
                  placeholder="Confirme a senha"
                />
                <FormErrorMessage>{errors.confirmSenha}</FormErrorMessage>
              </FormControl>
              
              <Button
                mt={6}
                colorScheme="blue"
                size="lg"
                width="full"
                type="submit"
                isLoading={isSubmitting}
                loadingText="Criando..."
              >
                Criar Administrador
              </Button>
            </Stack>
          </form>
        </Box>
      </Container>
    </>
  );
} 