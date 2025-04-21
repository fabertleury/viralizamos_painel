import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';

// Interface para o usuário
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Interface para o contexto de autenticação
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Default context com implementação vazia
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

// Chaves usadas no localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Inicialização - carregar usuário do localStorage se existir
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Erro ao restaurar estado de autenticação:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função de login - simples e direta
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Apenas para demonstração - em produção, fazer uma chamada API real
      if (email === 'admin@viralizamos.com' && password === 'admin123') {
        // Dados simulados de resposta
        const token = 'fake-jwt-token';
        const userData: User = {
          id: '1',
          name: 'Administrador',
          email: 'admin@viralizamos.com',
          role: 'admin',
        };
        
        // Salvar no localStorage
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        
        // Atualizar estado
        setUser(userData);
        
        // Feedback para o usuário
        toast({
          title: 'Login realizado com sucesso!',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });

        // Redirecionamento - simples e direto
        window.location.href = '/dashboard';
        return;
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error) {
      // Feedback de erro
      toast({
        title: 'Erro ao fazer login',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // Limpar dados de autenticação em caso de erro
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      
      // Finalizar loading
      setIsLoading(false);
    }
  };

  // Função de logout - simples e direta
  const logout = () => {
    // Limpar localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Atualizar estado
    setUser(null);
    
    // Feedback para o usuário
    toast({
      title: 'Logout realizado',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top-right',
    });
    
    // Redirecionamento
    window.location.href = '/login';
  };

  // Provider do contexto
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