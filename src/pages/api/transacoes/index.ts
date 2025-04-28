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
      console.warn('[API:Transacoes] URL da API de pagamentos não configurada, usando conexão direta');
    }
    if (!apiKey) {
      console.warn('[API:Transacoes] API Key não configurada, usando conexão direta');
    }

    console.log('[API:Transacoes] Iniciando busca de transações');
    
    const { 
      status, 
      metodo, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    // SOLUÇÃO ALTERNATIVA: Usar conexão direta ao banco de dados
    // devido a problemas de autenticação com a API
    console.log('[API:Transacoes] Usando conexão direta ao banco de dados (V2)');
    
    try {
      // Chamar o endpoint direto V2 que acessa o banco de dados com tratamento de erros melhorado
      const diretaParams: Record<string, any> = {};
      
      if (status && status !== 'todos') {
        diretaParams.status = status;
      }
      
      if (metodo && metodo !== 'todos') {
        diretaParams.metodo = metodo;
      }
      
      if (termoBusca) {
        diretaParams.termoBusca = termoBusca;
      }
      
      diretaParams.pagina = pagina;
      diretaParams.limite = limite;
      
      // Fazer requisição para o endpoint direto V2
      console.log('[API:Transacoes] Chamando endpoint direto-v2 com parâmetros:', diretaParams);
      
      // Usar o caminho absoluto para evitar problemas de roteamento no servidor
      const baseUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL}` 
        : '';
      
      // Construir a URL completa
      const apiUrl = `${baseUrl}/api/transacoes/direto-v2`;
      console.log('[API:Transacoes] URL completa:', apiUrl);
      
      // Fazer a requisição com tratamento de erro melhorado
      const response = await axios.get(apiUrl, { 
        params: diretaParams,
        timeout: 10000 // timeout de 10 segundos
      });
      
      console.log('[API:Transacoes] Resposta da conexão direta V2:', response.status);
      
      if (response.data && response.data.transacoes) {
        return res.status(200).json({
          transacoes: response.data.transacoes,
          total: response.data.total || response.data.transacoes.length,
          pagina: response.data.pagina,
          limite: response.data.limite,
          total_paginas: response.data.total_paginas,
          origem: 'banco_direto_v2',
          debug: {
            conexaoDireta: true,
            env: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        throw new Error('Formato de resposta inválido da conexão direta V2');
      }
    } catch (directError) {
      console.error('[API:Transacoes] Erro na conexão direta V2:', directError);
      
      // Tentar o endpoint direto original como fallback
      try {
        console.log('[API:Transacoes] Tentando endpoint direto original como fallback');
        const diretaParams: Record<string, any> = {};
        
        if (status && status !== 'todos') {
          diretaParams.status = status;
        }
        
        if (metodo && metodo !== 'todos') {
          diretaParams.metodo = metodo;
        }
        
        if (termoBusca) {
          diretaParams.termoBusca = termoBusca;
        }
        
        diretaParams.pagina = pagina;
        diretaParams.limite = limite;
        
        const fallbackResponse = await axios.get('/api/transacoes/direto', { params: diretaParams });
        
        if (fallbackResponse.data && fallbackResponse.data.transacoes) {
          return res.status(200).json({
            transacoes: fallbackResponse.data.transacoes,
            total: fallbackResponse.data.total_transactions || fallbackResponse.data.transacoes.length,
            origem: 'banco_direto_fallback',
            debug: {
              conexaoDireta: true,
              env: process.env.NODE_ENV,
              fallback: true
            }
          });
        } else {
          throw new Error('Formato de resposta inválido do fallback');
        }
      } catch (fallbackError) {
        console.error('[API:Transacoes] Erro no fallback:', fallbackError);
        throw directError; // Lançar o erro original
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