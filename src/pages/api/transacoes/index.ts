import { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

// Configuração da API de pagamentos - Importante: não usar NEXT_PUBLIC no servidor
const pagamentosApiUrl = process.env.PAGAMENTOS_API_URL || process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api';
const apiKey = process.env.PAYMENTS_API_KEY;

// Log de configuração para debug
console.log('[API:Transacoes:Config] URL da API:', pagamentosApiUrl);
console.log('[API:Transacoes:Config] API Key definida:', !!apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
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
    
    console.log(`[API:Transacoes] Chamando endpoint: ${pagamentosApiUrl}/transactions/list`);
    console.log(`[API:Transacoes] Parâmetros:`, JSON.stringify(params));
    
    // Configuração dos headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Adicionar API key se estiver disponível
    if (apiKey) {
      headers['Authorization'] = `ApiKey ${apiKey}`;
    }
    
    console.log('[API:Transacoes] Headers:', JSON.stringify(headers, (_, v) => 
      v === headers['Authorization'] ? '***MASKED***' : v
    ));
    
    // Chamar a API de pagamentos
    const response = await axios.get(`${pagamentosApiUrl}/transactions/list`, {
      params,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`
      }
    });
    
    console.log(`[API:Transacoes] Resposta recebida: ${response.status}`);
    console.log(`[API:Transacoes] Total de transações: ${response.data.total || 0}`);
    
    // Mapear a resposta para o formato esperado pelo frontend
    const transacoes = (response.data.transactions || []).map((t: any) => ({
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
    
    res.status(200).json({
      transacoes,
      total: response.data.total || 0,
      apiUrl: pagamentosApiUrl, // Adicionar URL da API na resposta para debug
      debug: {
        env: process.env.NODE_ENV,
        hasApiKey: !!apiKey
      }
    });
  } catch (error) {
    console.error('[API:Transacoes] Erro ao processar transações:', error);
    
    // Log detalhado do erro para depuração
    const err = error as Error | AxiosError;
    
    if (axios.isAxiosError(err)) {
      if (err.response) {
        console.error('[API:Transacoes] Resposta de erro:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error('[API:Transacoes] Erro na requisição (sem resposta):', err.request);
      } else {
        console.error('[API:Transacoes] Erro de configuração Axios:', err.message);
      }
      
      // Retornar mensagem adequada para o cliente
      res.status(500).json({ 
        error: 'Erro ao buscar transações',
        message: err.message,
        url: pagamentosApiUrl,
        hasApiKey: !!apiKey,
        code: err.code,
        transacoes: [],
        total: 0
      });
    } else {
      console.error('[API:Transacoes] Erro genérico:', (err as Error).message);
      
      res.status(500).json({ 
        error: 'Erro ao buscar transações',
        message: (err as Error).message,
        transacoes: [],
        total: 0
      });
    }
  }
} 