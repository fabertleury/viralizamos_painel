import axios from 'axios';

// Configuração para os endpoints da API
const ORDERS_API_URL = process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com/api';
const ORDERS_API_KEY = process.env.NEXT_PUBLIC_ORDERS_API_KEY || '';
const REPOSICAO_API_KEY = process.env.REPOSICAO_API_KEY || '';

// Interface para reposições
export interface Reposicao {
  id: string;
  orderId: string;
  motivo: string;
  observacoes?: string;
  status: string;
  resposta?: string;
  tentativas: number;
  dataSolicitacao: Date;
  dataProcessamento?: Date;
  processadoPor?: string;
  // Dados relacionados não diretamente pertencentes à tabela Reposicao
  order?: any;
  cliente?: any;
}

// Interface para filtros de busca de reposições
export interface FiltroReposicoes {
  status?: string;
  orderId?: string;
  clienteId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  termoBusca?: string;
  pagina?: number;
  limite?: number;
}

// Interface para resultado paginado
export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

/**
 * Busca reposições com filtros e paginação
 */
export async function buscarReposicoes(filtros: FiltroReposicoes = {}): Promise<ResultadoPaginado<Reposicao>> {
  const {
    status,
    orderId,
    clienteId,
    dataInicio,
    dataFim,
    termoBusca,
    pagina = 1,
    limite = 10
  } = filtros;

  try {
    const params: any = {
      page: pagina,
      limit: limite
    };

    if (status) params.status = status;
    if (orderId) params.orderId = orderId;
    if (clienteId) params.userId = clienteId;
    if (dataInicio) params.startDate = dataInicio.toISOString();
    if (dataFim) params.endDate = dataFim.toISOString();
    if (termoBusca) params.search = termoBusca;

    // Usar API interna do Next.js para manter o token API seguro
    const response = await axios.get('/api/reposicoes', { params });

    if (response.data && response.data.reposicoes) {
      // Mapear resposta da API para o formato desejado
      const reposicoes = response.data.reposicoes.map((repo: any) => ({
        id: repo.id,
        orderId: repo.order_id,
        motivo: repo.motivo,
        observacoes: repo.observacoes,
        status: repo.status,
        resposta: repo.resposta,
        tentativas: repo.tentativas,
        dataSolicitacao: new Date(repo.data_solicitacao),
        dataProcessamento: repo.data_processamento ? new Date(repo.data_processamento) : undefined,
        processadoPor: repo.processado_por,
        ordem: repo.ordem || null,
        cliente: repo.cliente || null
      }));

      return {
        dados: reposicoes,
        total: response.data.total || reposicoes.length,
        pagina: response.data.pagina || pagina,
        limite: response.data.limite || limite,
        totalPaginas: response.data.totalPaginas || Math.ceil((response.data.total || reposicoes.length) / limite)
      };
    }

    return {
      dados: [],
      total: 0,
      pagina,
      limite,
      totalPaginas: 0
    };
  } catch (error) {
    console.error('Erro ao buscar reposições:', error);
    
    // Retornar dados vazios em caso de erro
    return {
      dados: [],
      total: 0,
      pagina,
      limite,
      totalPaginas: 0
    };
  }
}

/**
 * Busca uma reposição específica pelo ID
 */
export async function buscarReposicaoPorId(id: string): Promise<Reposicao | null> {
  try {
    const response = await axios.get(`/api/reposicoes/${id}`);
    
    if (response.data && response.data.reposicao) {
      const repo = response.data.reposicao;
      return {
        id: repo.id,
        orderId: repo.order_id,
        motivo: repo.motivo,
        observacoes: repo.observacoes,
        status: repo.status,
        resposta: repo.resposta,
        tentativas: repo.tentativas,
        dataSolicitacao: new Date(repo.data_solicitacao),
        dataProcessamento: repo.data_processamento ? new Date(repo.data_processamento) : undefined,
        processadoPor: repo.processado_por,
        order: repo.order || null,
        cliente: repo.cliente || null
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar reposição ${id}:`, error);
    return null;
  }
}

/**
 * Cria uma nova solicitação de reposição
 */
export async function criarReposicao(dados: {
  orderId: string;
  motivo: string;
  observacoes?: string;
}): Promise<Reposicao> {
  try {
    const response = await axios.post('/api/reposicoes', dados);
    
    if (response.data && response.data.reposicao) {
      const repo = response.data.reposicao;
      return {
        id: repo.id,
        orderId: repo.order_id,
        motivo: repo.motivo,
        observacoes: repo.observacoes,
        status: repo.status,
        tentativas: repo.tentativas || 0,
        dataSolicitacao: new Date(repo.data_solicitacao),
        dataProcessamento: repo.data_processamento ? new Date(repo.data_processamento) : undefined,
        processadoPor: repo.processado_por,
      };
    }
    
    throw new Error('Falha ao criar reposição');
  } catch (error) {
    console.error('Erro ao criar reposição:', error);
    throw error;
  }
}

/**
 * Atualiza o status de uma reposição
 */
export async function atualizarStatusReposicao(id: string, status: string, resposta?: string): Promise<boolean> {
  try {
    const response = await axios.put(`/api/reposicoes/${id}`, { status, resposta });
    return response.data && response.data.success === true;
  } catch (error) {
    console.error(`Erro ao atualizar status da reposição ${id}:`, error);
    return false;
  }
}

/**
 * Processa manualmente uma reposição
 */
export async function processarReposicaoManual(id: string): Promise<boolean> {
  try {
    const response = await axios.post(`/api/reposicoes/${id}/processar`);
    return response.data && response.data.success === true;
  } catch (error) {
    console.error(`Erro ao processar manualmente a reposição ${id}:`, error);
    return false;
  }
}

/**
 * Busca estatísticas sobre reposições
 */
export async function buscarEstatisticasReposicoes(): Promise<{
  total: number;
  pendentes: number;
  processadas: number;
  rejeitadas: number;
  ultimasDias: { data: string; quantidade: number }[];
}> {
  try {
    const response = await axios.get('/api/reposicoes/estatisticas');
    
    if (response.data) {
      return response.data;
    }
    
    return {
      total: 0,
      pendentes: 0,
      processadas: 0,
      rejeitadas: 0,
      ultimasDias: []
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de reposições:', error);
    return {
      total: 0,
      pendentes: 0,
      processadas: 0,
      rejeitadas: 0,
      ultimasDias: []
    };
  }
} 