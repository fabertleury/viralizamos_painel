import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Simulando verificação de token - em produção, verifique com uma API
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Simulando dados do usuário - em produção, busque da API
          const userData: User = {
            id: '1',
            name: 'Administrador',
            email: 'admin@viralizamos.com',
            role: 'admin',
          };
          
          setUser(userData);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulando autenticação - em produção, faça uma chamada API real
      if (email === 'admin@viralizamos.com' && password === 'admin123') {
        // Simulando resposta da API com token e dados do usuário
        const token = 'fake-jwt-token';
        const userData: User = {
          id: '1',
          name: 'Administrador',
          email: 'admin@viralizamos.com',
          role: 'admin',
        };
        
        // Salvar token e usuário
        localStorage.setItem('auth_token', token);
        setUser(userData);
        
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
        
        router.push('/dashboard');
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
      
      setUser(null);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    router.push('/login');
    
    toast({
      title: 'Logout realizado',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 