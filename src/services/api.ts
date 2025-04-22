import axios from 'axios';

// Criando instâncias do Axios para cada microserviço
export const pagamentosApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ordersApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configurando interceptadores para tokens de autenticação
const addAuthTokenToRequests = (api: any, authType = 'Bearer') => {
  api.interceptors.request.use(
    (config: any) => {
      // Em ambiente de navegador, pegamos o token do localStorage
      let token;
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('auth_token');
      } else {
        // Em ambiente de servidor, dependemos do tipo de API
        if (authType === 'ApiKey') {
          token = process.env.PAYMENTS_API_KEY || process.env.API_KEY;
        } else {
          token = process.env.ORDERS_API_KEY || process.env.API_KEY;
        }
      }
      
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `${authType} ${token}`,
        };
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
};

// Aplicando interceptadores com tipos específicos de auth
addAuthTokenToRequests(pagamentosApi, 'ApiKey');
addAuthTokenToRequests(ordersApi, 'Bearer');

// Função geral para tratar erros
export const handleApiError = (error: any) => {
  let errorMessage = 'Erro ao se comunicar com o servidor';
  
  if (error.response) {
    // Resposta do servidor com código de erro
    errorMessage = error.response.data?.message || error.response.data?.error || `Erro ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    // Sem resposta do servidor
    errorMessage = 'Não foi possível se conectar ao servidor. Verifique sua conexão.';
  }
  
  console.error('API Error:', error);
  return errorMessage;
}; 