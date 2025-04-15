import axios from 'axios';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroUsuarioInput {
  ativo?: boolean;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

// Configuração da API de usuários
const apiUrl = process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api';
const usuariosApi = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const usuariosResolvers = {
  Query: {
    usuarios: async (_: any, { filtro, paginacao }: { filtro?: FiltroUsuarioInput, paginacao: PaginacaoInput }) => {
      try {
        const { pagina, limite } = paginacao;
        
        // Construir parâmetros para a requisição à API
        const params: Record<string, any> = {
          page: pagina,
          limit: limite
        };
        
        // Adicionar filtros, se existirem
        if (filtro) {
          if (filtro.ativo !== undefined) {
            params.active = filtro.ativo;
          }
          
          if (filtro.termoBusca) {
            params.search = filtro.termoBusca;
          }
          
          if (filtro.dataInicio) {
            params.startDate = filtro.dataInicio;
          }
          
          if (filtro.dataFim) {
            params.endDate = filtro.dataFim;
          }
        }
        
        console.log(`[API:Usuarios] Tentando API REST: ${apiUrl}/admin/users/list`);
        
        // Chamar a API de usuários
        const response = await usuariosApi.get('/admin/users/list', { 
          params,
          headers: {
            'Authorization': `ApiKey ${process.env.PAGAMENTOS_API_KEY}`
          }
        });
        
        const users = response.data.users || [];
        const total = response.data.total || 0;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        const usuariosFormatados = users.map((u: any) => ({
          id: u.id,
          nome: u.name,
          email: u.email,
          ativo: u.active,
          dataUltimoLogin: u.last_login || null,
          dataCriacao: u.created_at
        }));
        
        return {
          usuarios: usuariosFormatados,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        throw new Error('Erro ao buscar usuários da API');
      }
    },
    
    usuario: async (_: any, { id }: { id: string }) => {
      try {
        console.log(`[API:Usuario] Tentando buscar usuário ${id} via API REST`);
        
        // Buscar usuário por ID
        const response = await usuariosApi.get(`/admin/users/${id}`, {
          headers: {
            'Authorization': `ApiKey ${process.env.PAGAMENTOS_API_KEY}`
          }
        });
        
        if (!response.data || response.data.error) {
          return null;
        }
        
        const u = response.data;
        
        // Mapear o resultado da API para o formato esperado pelo GraphQL
        return {
          id: u.id,
          nome: u.name,
          email: u.email,
          ativo: u.active,
          dataUltimoLogin: u.last_login || null,
          dataCriacao: u.created_at
        };
      } catch (error) {
        console.error(`Erro ao buscar usuário ${id}:`, error);
        throw new Error(`Erro ao buscar usuário ${id} da API`);
      }
    }
  },
  
  Mutation: {
    // Mutations para usuários podem ser adicionadas aqui, se necessárias
  }
}; 