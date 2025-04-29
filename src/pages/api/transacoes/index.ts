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
      
      // Em vez de fazer uma chamada HTTP para o endpoint direto-v2, vamos importar e usar a lógica diretamente
      // Esta abordagem evita problemas de rede e é mais eficiente
      console.log('[API:Transacoes] Acessando diretamente o banco de dados com parâmetros:', diretaParams);
      
      // Importar o módulo Pool do pg para conexão direta com o banco de dados
      const { Pool } = require('pg');
      
      // Criar conexão com o banco de dados usando a abordagem que funcionou nos testes JS
      const pagamentosPool = new Pool({
        connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
        keepAlive: true
      });
      
      // Obter conexão do pool
      const client = await pagamentosPool.connect();
      
      try {
        // Construir a consulta SQL com base nos parâmetros
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        
        // Filtro por status
        if (diretaParams.status && diretaParams.status !== 'todos') {
          whereConditions.push(`t.status = $${paramIndex}`);
          queryParams.push(diretaParams.status);
          paramIndex++;
        }
        
        // Filtro por método de pagamento
        if (diretaParams.metodo && diretaParams.metodo !== 'todos') {
          whereConditions.push(`t.method = $${paramIndex}`);
          queryParams.push(diretaParams.metodo);
          paramIndex++;
        }
        
        // Busca por termo
        if (diretaParams.termoBusca) {
          whereConditions.push(`(
            t.id::text ILIKE $${paramIndex} OR
            t.external_id ILIKE $${paramIndex + 1} OR
            t.status ILIKE $${paramIndex + 2}
          )`);
          const searchTerm = `%${diretaParams.termoBusca}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm);
          paramIndex += 3;
        }
        
        // Construir a cláusula WHERE
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : '';
        
        // Calcular offset para paginação
        const paginaNum = parseInt(diretaParams.pagina as string) || 1;
        const limiteNum = parseInt(diretaParams.limite as string) || 10;
        const offset = (paginaNum - 1) * limiteNum;
        
        // Consulta para contar o total de transações
        const countQuery = `
          SELECT COUNT(*) as total
          FROM "transactions" t
          LEFT JOIN "payment_requests" pr ON t.payment_request_id = pr.id
          ${whereClause}
        `;
        
        const countResult = await client.query(countQuery, queryParams);
        const totalTransacoes = parseInt(countResult.rows[0].total);
        
        // Consulta principal para buscar as transações
        const transacoesQuery = `
          SELECT 
            t.id, 
            t.external_id, 
            t.amount, 
            t.status, 
            t.method, 
            t.created_at,
            pr.customer_name, 
            pr.customer_email, 
            pr.service_name
          FROM "transactions" t
          LEFT JOIN "payment_requests" pr ON t.payment_request_id = pr.id
          ${whereClause}
          ORDER BY t.created_at DESC
          LIMIT ${limiteNum} OFFSET ${offset}
        `;
        
        const transacoesResult = await client.query(transacoesQuery, queryParams);
        
        // Calcular o total de páginas
        const totalPaginas = Math.ceil(totalTransacoes / limiteNum);
        
        // Mapear as transações para o formato esperado pelo frontend
        const transacoes = transacoesResult.rows.map(t => ({
          id: t.id,
          data_criacao: t.created_at,
          valor: t.amount,
          status: t.status,
          metodo_pagamento: t.method,
          cliente: {
            nome: t.customer_name || 'Não informado',
            email: t.customer_email || 'Não informado'
          },
          servico: t.service_name || 'Não informado',
          external_id: t.external_id || ''
        }));
        
        // Simular uma resposta como se fosse do endpoint direto-v2
        const response = {
          data: {
            transacoes,
            total: totalTransacoes,
            pagina: paginaNum,
            limite: limiteNum,
            total_paginas: totalPaginas
          },
          status: 200
        };
      
        console.log('[API:Transacoes] Resposta da conexão direta V2:', response.status);
      
        if (response.data && response.data.transacoes) {
          // Liberar a conexão antes de retornar a resposta
          client.release();
          
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
          client.release();
          throw new Error('Formato de resposta inválido da conexão direta V2');
        }
      } catch (queryError) {
        // Liberar a conexão em caso de erro
        client.release();
        console.error('[API:Transacoes] Erro na execução das consultas SQL:', queryError);
        throw queryError;
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