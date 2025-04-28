import { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

// Configuração da API de pagamentos - Importante: não usar NEXT_PUBLIC no servidor
const pagamentosApiUrl = process.env.PAYMENTS_API_URL || process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api';
const apiKey = process.env.PAYMENTS_API_KEY;

// Log de configuração para debug
console.log('[API:Transacoes:Config] URL da API:', pagamentosApiUrl);
console.log('[API:Transacoes:Config] API Key definida:', !!apiKey);
console.log('[API:Transacoes:Config] NODE_ENV:', process.env.NODE_ENV);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Verificar configurações críticas
    if (!pagamentosApiUrl) {
      throw new Error('URL da API de pagamentos não configurada');
    }
    if (!apiKey) {
      throw new Error('API Key não configurada');
    }

    console.log('[API:Transacoes] Iniciando busca de transações');
    console.log(`[API:Transacoes] API URL: ${pagamentosApiUrl}`);
    console.log(`[API:Transacoes] API Key presente: ${!!apiKey}`);
    
    const { 
      status, 
      metodo, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    // Construir parâmetros para a API de pagamentos
    const params: Record<string, any> = {
      page: pagina,
      limit: limite
    };
    
    if (status && status !== 'todos') {
      params.status = status;
    }
    
    if (metodo && metodo !== 'todos') {
      params.method = metodo;
    }
    
    if (termoBusca) {
      params.search = termoBusca;
    }
    
    // Configuração dos headers - Alterando o formato da autorização
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}` // Mudando de ApiKey para Bearer
    };
    
    console.log(`[API:Transacoes] Chamando endpoint: ${pagamentosApiUrl}/api/transactions/list`);
    console.log(`[API:Transacoes] Parâmetros:`, JSON.stringify(params));
    console.log('[API:Transacoes] Headers:', JSON.stringify({
      ...headers,
      'Authorization': '***MASKED***'
    }));
    
    // Tentar fazer a requisição com retry
    let retryCount = 0;
    const maxRetries = 3;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        // Ajustando o endpoint para incluir /api no path
        const response = await axios.get(`${pagamentosApiUrl}/api/transactions/list`, {
          params,
          headers,
          timeout: 10000 // 10 segundos timeout
        });

        console.log(`[API:Transacoes] Resposta recebida: ${response.status}`);
        console.log(`[API:Transacoes] Total de transações: ${response.data.total || 0}`);
        
        // Verificar se a resposta tem o formato esperado
        if (!response.data || !Array.isArray(response.data.transactions)) {
          throw new Error(`Resposta inválida da API: ${JSON.stringify(response.data)}`);
        }

        // Mapear a resposta para o formato esperado pelo frontend
        const transacoes = response.data.transactions.map((t: any) => ({
          id: t.id,
          data_criacao: t.created_at,
          valor: t.amount,
          status: t.status,
          metodo_pagamento: t.method,
          cliente_id: t.payment_request?.customer_id || '',
          cliente_nome: t.payment_request?.customer_name || '',
          cliente_email: t.payment_request?.customer_email || '',
          produto_id: t.payment_request?.service_id || '',
          produto_nome: t.payment_request?.service_name || '',
          order_id: t.external_id || ''
        }));
        
        return res.status(200).json({
          transacoes,
          total: response.data.total || 0,
          debug: {
            env: process.env.NODE_ENV,
            apiUrl: pagamentosApiUrl,
            hasApiKey: !!apiKey,
            retryCount
          }
        });
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log(`[API:Transacoes] Tentativa ${retryCount} falhou, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        
        throw error;
      }
    }
    
  } catch (error) {
    console.error('[API:Transacoes] Erro ao processar transações:', error);
    
    const err = error as Error | AxiosError;
    let errorResponse: any = {
      error: 'Erro ao buscar transações',
      message: err.message,
      debug: {
        env: process.env.NODE_ENV,
        apiUrl: pagamentosApiUrl,
        hasApiKey: !!apiKey,
        timestamp: new Date().toISOString()
      },
      transacoes: [],
      total: 0
    };
    
    if (axios.isAxiosError(err)) {
      if (err.response) {
        console.error('[API:Transacoes] Resposta de erro:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        errorResponse = {
          ...errorResponse,
          status: err.response.status,
          data: err.response.data,
          code: err.code
        };
      } else if (err.request) {
        console.error('[API:Transacoes] Erro na requisição (sem resposta):', err.request);
        errorResponse.type = 'REQUEST_ERROR';
      } else {
        console.error('[API:Transacoes] Erro de configuração Axios:', err.message);
        errorResponse.type = 'CONFIG_ERROR';
      }
    }
    
    res.status(500).json(errorResponse);
  }
} 