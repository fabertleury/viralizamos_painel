import { Pool } from 'pg';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Inicialização do cliente Prisma
const prisma = new PrismaClient();

// Configuração para os pools de conexão com bancos externos
const isServerSide = typeof window === 'undefined';
let ordersPool: Pool | null = null;

// Inicialização da conexão com o banco de dados de orders (somente no servidor)
if (isServerSide && process.env.NEXT_PHASE !== 'phase-production-build') {
  ordersPool = new Pool({
    connectionString: process.env.ORDERS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Configuração para os endpoints da API
const ORDERS_API_URL = process.env.ORDERS_API_URL || 'https://orders.viralizamos.com/api';
const ORDERS_API_KEY = process.env.ORDERS_API_KEY || '';
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
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      dados: [],
      total: 0,
      pagina: 1,
      limite: 10,
      totalPaginas: 0
    };
  }

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
    // Tentar buscar via API primeiro (modo preferido)
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

      const response = await axios.get(`${ORDERS_API_URL}/reposicoes`, {
        params,
        headers: {
          'Authorization': `Bearer ${ORDERS_API_KEY}`
        }
      });

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
    } catch (apiError) {
      console.error('Erro ao buscar reposições via API:', apiError);
      // Continuar com fallback para busca no banco
    }

    // Fallback: buscar diretamente no banco de dados
    if (!ordersPool) {
      throw new Error('Conexão com o banco de dados de orders não disponível');
    }

    let query = `
      SELECT 
        r.id, 
        r.order_id, 
        r.motivo, 
        r.observacoes, 
        r.status, 
        r.resposta, 
        r.tentativas, 
        r.data_solicitacao, 
        r.data_processamento, 
        r.processado_por,
        o.transaction_id,
        o.user_id,
        o.service_id,
        o.provider_id,
        o.quantity,
        o.status as order_status
      FROM 
        reposicoes r
      LEFT JOIN 
        "Order" o ON r.order_id = o.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramCount = 1;

    // Aplicar filtros
    if (status) {
      query += ` AND r.status = $${paramCount++}`;
      queryParams.push(status);
    }

    if (orderId) {
      query += ` AND r.order_id = $${paramCount++}`;
      queryParams.push(orderId);
    }

    if (clienteId) {
      query += ` AND o.user_id = $${paramCount++}`;
      queryParams.push(clienteId);
    }

    if (dataInicio) {
      query += ` AND r.data_solicitacao >= $${paramCount++}`;
      queryParams.push(dataInicio);
    }

    if (dataFim) {
      query += ` AND r.data_solicitacao <= $${paramCount++}`;
      queryParams.push(dataFim);
    }

    if (termoBusca) {
      query += ` AND (
        r.motivo ILIKE $${paramCount} OR 
        r.observacoes ILIKE $${paramCount} OR
        r.order_id::text ILIKE $${paramCount}
      )`;
      queryParams.push(`%${termoBusca}%`);
      paramCount++;
    }

    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await ordersPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Aplicar paginação
    const offset = (pagina - 1) * limite;
    query += ` ORDER BY r.data_solicitacao DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limite);
    queryParams.push(offset);

    // Executar consulta principal
    const result = await ordersPool.query(query, queryParams);

    // Formatar resultados
    const reposicoes: Reposicao[] = result.rows.map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      motivo: row.motivo,
      observacoes: row.observacoes,
      status: row.status,
      resposta: row.resposta,
      tentativas: row.tentativas,
      dataSolicitacao: row.data_solicitacao,
      dataProcessamento: row.data_processamento,
      processadoPor: row.processado_por,
      order: {
        id: row.order_id,
        transactionId: row.transaction_id,
        userId: row.user_id,
        serviceId: row.service_id,
        providerId: row.provider_id,
        quantity: row.quantity,
        status: row.order_status
      }
    }));

    // Retornar resultado paginado
    return {
      dados: reposicoes,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite)
    };

  } catch (error) {
    console.error('Erro ao buscar reposições:', error);
    throw new Error('Não foi possível buscar as reposições. Detalhes: ' + (error as Error).message);
  }
}

/**
 * Busca uma reposição específica pelo ID
 */
export async function buscarReposicaoPorId(id: string): Promise<Reposicao | null> {
  try {
    // Tentar buscar via API primeiro
    try {
      const response = await axios.get(`${ORDERS_API_URL}/reposicoes/${id}`, {
        headers: {
          'Authorization': `Bearer ${ORDERS_API_KEY}`
        }
      });

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
          order: repo.ordem || null,
          cliente: repo.cliente || null
        };
      }
    } catch (apiError) {
      console.error('Erro ao buscar reposição via API:', apiError);
      // Continuar com fallback para busca no banco
    }

    // Fallback: buscar diretamente no banco de dados
    if (!ordersPool) {
      throw new Error('Conexão com o banco de dados de orders não disponível');
    }

    const query = `
      SELECT 
        r.id, 
        r.order_id, 
        r.motivo, 
        r.observacoes, 
        r.status, 
        r.resposta, 
        r.tentativas, 
        r.data_solicitacao, 
        r.data_processamento, 
        r.processado_por,
        o.transaction_id,
        o.user_id,
        o.service_id,
        o.provider_id,
        o.quantity,
        o.status as order_status
      FROM 
        reposicoes r
      LEFT JOIN 
        "Order" o ON r.order_id = o.id
      WHERE 
        r.id = $1
    `;

    const result = await ordersPool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      orderId: row.order_id,
      motivo: row.motivo,
      observacoes: row.observacoes,
      status: row.status,
      resposta: row.resposta,
      tentativas: row.tentativas,
      dataSolicitacao: row.data_solicitacao,
      dataProcessamento: row.data_processamento,
      processadoPor: row.processado_por,
      order: {
        id: row.order_id,
        transactionId: row.transaction_id,
        userId: row.user_id,
        serviceId: row.service_id,
        providerId: row.provider_id,
        quantity: row.quantity,
        status: row.order_status
      }
    };
  } catch (error) {
    console.error('Erro ao buscar reposição por ID:', error);
    throw new Error('Não foi possível buscar a reposição. Detalhes: ' + (error as Error).message);
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
    // Criar via API
    const response = await axios.post(`${ORDERS_API_URL}/reposicoes`, {
      order_id: dados.orderId,
      motivo: dados.motivo,
      observacoes: dados.observacoes || 'Solicitado via painel administrativo'
    }, {
      headers: {
        'Authorization': `Bearer ${REPOSICAO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.success && response.data.reposicao) {
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
        processadoPor: repo.processado_por
      };
    } else {
      throw new Error('A API retornou um formato de resposta inesperado');
    }
  } catch (error) {
    console.error('Erro ao criar reposição:', error);
    throw new Error('Não foi possível criar a reposição. Detalhes: ' + 
      (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
}

/**
 * Atualiza o status de uma reposição
 */
export async function atualizarStatusReposicao(id: string, status: string, resposta?: string): Promise<boolean> {
  try {
    // Atualizar via API
    const response = await axios.put(`${ORDERS_API_URL}/reposicoes/${id}`, {
      status,
      resposta,
      processado_por: 'admin'  // Indicar que foi processado pelo painel admin
    }, {
      headers: {
        'Authorization': `Bearer ${REPOSICAO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data && response.data.success === true;
  } catch (error) {
    console.error('Erro ao atualizar status da reposição:', error);
    throw new Error('Não foi possível atualizar o status da reposição. Detalhes: ' + 
      (error instanceof Error ? error.message : 'Erro desconhecido'));
  }
}

/**
 * Processa manualmente uma reposição
 */
export async function processarReposicaoManual(id: string): Promise<boolean> {
  try {
    // Processar via API
    const response = await axios.post(`${ORDERS_API_URL}/reposicoes/${id}/process`, {
      processado_por: 'admin'  // Indicar que foi processado pelo painel admin
    }, {
      headers: {
        'Authorization': `Bearer ${REPOSICAO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data && response.data.success === true;
  } catch (error) {
    console.error('Erro ao processar reposição manualmente:', error);
    throw new Error('Não foi possível processar a reposição. Detalhes: ' + 
      (error instanceof Error ? error.message : 'Erro desconhecido'));
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
    // Buscar estatísticas via API
    try {
      const response = await axios.get(`${ORDERS_API_URL}/reposicoes/stats`, {
        headers: {
          'Authorization': `Bearer ${ORDERS_API_KEY}`
        }
      });

      if (response.data && response.data.stats) {
        return response.data.stats;
      }
    } catch (apiError) {
      console.error('Erro ao buscar estatísticas via API:', apiError);
      // Continuar com fallback para busca no banco
    }

    // Fallback: calcular estatísticas usando o banco de dados
    if (!ordersPool) {
      throw new Error('Conexão com o banco de dados de orders não disponível');
    }

    // Total de reposições
    const totalQuery = 'SELECT COUNT(*) FROM reposicoes';
    const totalResult = await ordersPool.query(totalQuery);
    const total = parseInt(totalResult.rows[0].count);

    // Reposições por status
    const statusQuery = 'SELECT status, COUNT(*) FROM reposicoes GROUP BY status';
    const statusResult = await ordersPool.query(statusQuery);
    
    const pendentes = parseInt(statusResult.rows.find((r: any) => r.status === 'pendente')?.count || '0');
    const processadas = parseInt(statusResult.rows.find((r: any) => r.status === 'processado')?.count || '0');
    const rejeitadas = parseInt(statusResult.rows.find((r: any) => r.status === 'rejeitado')?.count || '0');

    // Reposições dos últimos 7 dias
    const diasQuery = `
      SELECT 
        date_trunc('day', data_solicitacao) as data,
        COUNT(*) as quantidade
      FROM 
        reposicoes
      WHERE 
        data_solicitacao >= NOW() - INTERVAL '7 days'
      GROUP BY 
        date_trunc('day', data_solicitacao)
      ORDER BY 
        data ASC
    `;
    const diasResult = await ordersPool.query(diasQuery);
    
    const ultimasDias = diasResult.rows.map((r: any) => ({
      data: r.data.toISOString().split('T')[0],
      quantidade: parseInt(r.quantidade)
    }));

    return {
      total,
      pendentes,
      processadas,
      rejeitadas,
      ultimasDias
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de reposições:', error);
    // Retornar estatísticas vazias em caso de erro
    return {
      total: 0,
      pendentes: 0,
      processadas: 0,
      rejeitadas: 0,
      ultimasDias: []
    };
  }
} 