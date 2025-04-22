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
      
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Falha na autenticação');
      }
      
      // Save data in cookies
      Cookies.set('auth_token', data.token, { expires: 7 });
      Cookies.set('auth_user', JSON.stringify(data.user), { expires: 7 });
      
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
    Cookies.remove('auth_token');
    Cookies.remove('auth_user');
    
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