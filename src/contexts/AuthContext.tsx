'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Interface for User data
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Interface for Authentication Context
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Creating context with default values
export const AuthContext = createContext({} as AuthContextData);

// Props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Authentication Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  // Verificar se está rodando no cliente
  const isBrowser = typeof window !== 'undefined';

  // Effect to check if user is already authenticated
  useEffect(() => {
    // Não executar no servidor
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    // Load user data from cookies
    const token = Cookies.get('auth_token');
    const userData = Cookies.get('auth_user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        // If parsing fails, clear cookies
        Cookies.remove('auth_token');
        Cookies.remove('auth_user');
      }
    }
    
    setLoading(false);
  }, [isBrowser]);

  // Login function
  async function login(email: string, password: string) {
    try {
      setLoading(true);
      
      // Verificar se o email é válido
      const publicAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@viralizamos.com';
      if (email !== publicAdminEmail) {
        throw new Error('Apenas administradores podem acessar este painel');
      }
      
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      // Se a resposta não for bem-sucedida, tratar o erro
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Falha na autenticação';
        
        if (response.status === 401) {
          console.error('Credenciais inválidas:', errorData);
          throw new Error('Credenciais inválidas. Verifique o email e senha.');
        } else {
          console.error('Erro de autenticação:', response.status, errorData);
          throw new Error(errorMessage);
        }
      }
      
      const data = await response.json();
      
      // Verificar se o token foi retornado
      if (!data.token) {
        console.error('Token não retornado pela API', data);
        throw new Error('Erro no sistema de autenticação');
      }
      
      // Save data in cookies
      Cookies.set('auth_token', data.token, { expires: 7, path: '/' });
      Cookies.set('auth_user', JSON.stringify(data.user), { expires: 7, path: '/' });
      
      // Update state
      setUser(data.user);
      
      // Show success message
      toast({
        title: 'Login realizado com sucesso',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect to dashboard apenas se estiver no navegador
      if (isBrowser) {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Erro de autenticação',
        description: error.message || 'Credenciais inválidas',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      
      // Limpar cookies e estado de autenticação em caso de erro
      Cookies.remove('auth_token');
      Cookies.remove('auth_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  // Logout function
  function logout() {
    // Não executar no servidor
    if (!isBrowser) {
      return;
    }

    // Clear cookies
    Cookies.remove('auth_token', { path: '/' });
    Cookies.remove('auth_user', { path: '/' });
    
    // Clear state
    setUser(null);
    
    // Show success message
    toast({
      title: 'Logout realizado com sucesso',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    
    // Redirect to login page apenas se estiver no navegador
    if (isBrowser) {
      router.push('/login');
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
}; 