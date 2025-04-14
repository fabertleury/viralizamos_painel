import axios from 'axios';

// Criando instâncias do Axios para cada microserviço
export const pagamentosApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ordersApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ORDERS_API_URL || 'http://localhost:3002/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configurando interceptadores para tokens de autenticação
const addAuthTokenToRequests = (api: any) => {
  api.interceptors.request.use(
    (config: any) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
};

// Aplicando interceptadores
addAuthTokenToRequests(pagamentosApi);
addAuthTokenToRequests(ordersApi);

// Função geral para tratar erros
export const handleApiError = (error: any) => {
  let errorMessage = 'Erro ao se comunicar com o servidor';
  
  if (error.response) {
    // Resposta do servidor com código de erro
    errorMessage = error.response.data.message || `Erro ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    // Sem resposta do servidor
    errorMessage = 'Não foi possível se conectar ao servidor. Verifique sua conexão.';
  }
  
  return errorMessage;
}; 