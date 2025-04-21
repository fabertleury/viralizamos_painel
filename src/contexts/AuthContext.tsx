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
  
  // Safe router usage - initialize only when in browser
  const router = typeof window !== 'undefined' ? useRouter() : null;

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // Usar nomes de chaves mais simples para evitar problemas
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

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
        
        // Salvar token e usuário no localStorage com nomes mais simples
        if (typeof window !== 'undefined') {
          // Limpar qualquer valor anterior
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          
          // Definir novos valores
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(userData));
        }
        
        setUser(userData);
        
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });

        // Usar redirecionamento direto para ir para o dashboard
        if (typeof window !== 'undefined') {
          // Redirecionamento direto e abrupto, que é mais confiável 
          // do que aguardar a atualização do estado
          window.location.href = '/dashboard';
          return; // Retornar para evitar processamento adicional
        }
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    } finally {
      // Só marca como concluído se nenhum redirecionamento ocorreu
      if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
        setIsLoading(false);
      }
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    setUser(null);
    
    toast({
      title: 'Logout realizado',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
    
    // Redirecionamento direto para a página de login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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