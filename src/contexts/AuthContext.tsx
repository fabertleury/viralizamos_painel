import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';
import { useRouter } from 'next/router';

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

// Default context with dummy implementation
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
  const toast = useToast();
  
  // Safe router usage - initialize only if needed
  const router = typeof window !== 'undefined' ? useRouter() : null;

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('viralizamos.token');
      const storedUser = localStorage.getItem('viralizamos.user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error restoring auth state:', error);
    } finally {
      setIsLoading(false);
    }
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
        
        // Salvar token e usuário no localStorage
        localStorage.setItem('viralizamos.token', token);
        localStorage.setItem('viralizamos.user', JSON.stringify(userData));
        setUser(userData);
        
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });

        // Usar window.location.href para garantir um redirecionamento completo
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
      
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('viralizamos.token');
        localStorage.removeItem('viralizamos.user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('viralizamos.token');
      localStorage.removeItem('viralizamos.user');
    }
    setUser(null);
    
    toast({
      title: 'Logout realizado',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
    
    // Usar window.location.href para garantir um redirecionamento completo
    window.location.href = '/login';
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