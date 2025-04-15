import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL base do microserviço de pagamentos (deve ser configurado no arquivo .env)
// Configurar para usar IPv4 explicitamente
const PAYMENTS_API_URL = (process.env.PAYMENTS_API_URL || 'http://127.0.0.1:3001/api').replace('localhost', '127.0.0.1');

console.log(`[API:Transacoes] URL configurada do microserviço: ${PAYMENTS_API_URL}`);

// Dados mockados para fallback em caso de erro
const transacoesMock = [
  {
    id: 'tx_67890',
    data_criacao: '2023-08-07T15:25:00Z',
    valor: 89900,
    status: 'aprovado',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_123',
    cliente_nome: 'João Silva',
    cliente_email: 'joao.silva@example.com',
    produto_id: 'prod_456',
    produto_nome: 'Instagram Followers (1000)',
    order_id: 'ord_12345'
  },
  {
    id: 'tx_67891',
    data_criacao: '2023-08-07T14:45:00Z',
    valor: 129900,
    status: 'aprovado',
    metodo_pagamento: 'pix',
    cliente_id: 'usr_456',
    cliente_nome: 'Maria Santos',
    cliente_email: 'maria.santos@example.com',
    produto_id: 'prod_789',
    produto_nome: 'TikTok Likes (5000)',
    order_id: 'ord_12346'
  },
  {
    id: 'tx_67892',
    data_criacao: '2023-08-07T13:10:00Z',
    valor: 199900,
    status: 'recusado',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_789',
    cliente_nome: 'Carlos Ferreira',
    cliente_email: 'carlos.ferreira@example.com',
    produto_id: 'prod_101',
    produto_nome: 'YouTube Views (10000)',
    order_id: 'ord_12347'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { 
      status, 
      metodo, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    // Consultar API do microserviço de pagamentos
    console.log(`[API:Transacoes] Consultando transações: ${PAYMENTS_API_URL}/transactions/list com parâmetros: pagina=${pagina}, limite=${limite}, status=${status}, metodo=${metodo}, termoBusca=${termoBusca}`);
    
    let transacoes;
    let total;
    let origem = 'api';
    
    try {
      // Verificar se o serviço está ativo
      console.log(`[API:Transacoes] Tentando conexão com ${PAYMENTS_API_URL}/health...`);
      try {
        const healthCheck = await axios.get(`${PAYMENTS_API_URL}/health`, { timeout: 2000 });
        console.log(`[API:Transacoes] Serviço de pagamentos online: ${JSON.stringify(healthCheck.data)}`);
      } catch (healthError) {
        console.error(`[API:Transacoes] Erro na verificação de saúde: ${healthError}`);
      }
      
      const response = await axios.get(`${PAYMENTS_API_URL}/transactions/list`, {
        params: {
          page: pagina,
          limit: limite,
          status: status,
          method: metodo,
          search: termoBusca
        },
        timeout: 5000, // 5 segundos de timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ViralizamosPainelAdmin/1.0',
        }
      });

      if (response.status === 200) {
        const data = response.data;
        console.log(`[API:Transacoes] Resposta recebida: ${JSON.stringify(data).substring(0, 200)}...`);
        
        // Mapear os dados para o formato esperado pelo frontend
        transacoes = data.transactions.map((transaction: any) => ({
          id: transaction.id,
          data_criacao: transaction.created_at,
          valor: transaction.amount,
          status: transaction.status,
          metodo_pagamento: transaction.method,
          cliente_id: transaction.payment_request?.customer_id || 'N/A',
          cliente_nome: transaction.payment_request?.customer_name || 'N/A',
          cliente_email: transaction.payment_request?.customer_email || 'N/A',
          produto_id: transaction.payment_request?.product_id || 'N/A',
          produto_nome: transaction.payment_request?.service_name || 'N/A',
          order_id: transaction.payment_request?.order_id || 'N/A'
        }));
        
        total = data.total || transacoes.length;
        console.log(`[API:Transacoes] Dados reais obtidos: ${transacoes.length} transações`);
      } else {
        throw new Error(`Resposta inválida: ${response.status}`);
      }
    } catch (apiError: any) {
      console.error(`[API:Transacoes] Erro ao conectar com API de pagamentos:`, apiError);
      
      if (apiError.code === 'ECONNREFUSED') {
        console.log(`[API:Transacoes] Conexão recusada na porta ${apiError.port}. Verifique se o serviço está rodando.`);
      }
      
      console.log('[API:Transacoes] Usando dados mockados como fallback devido a erro na API');
      
      // Fallback para dados mockados em caso de erro na API
      let transacoesFiltradas = [...transacoesMock];
      
      // Aplicar filtros nos dados mockados
      if (status && status !== 'todos') {
        transacoesFiltradas = transacoesFiltradas.filter(
          t => t.status.toLowerCase() === (status as string).toLowerCase()
        );
      }
      
      if (metodo && metodo !== 'todos') {
        transacoesFiltradas = transacoesFiltradas.filter(
          t => t.metodo_pagamento.toLowerCase() === (metodo as string).toLowerCase()
        );
      }
      
      if (termoBusca) {
        const busca = (termoBusca as string).toLowerCase();
        transacoesFiltradas = transacoesFiltradas.filter(t => 
          t.id.toLowerCase().includes(busca) || 
          t.cliente_nome.toLowerCase().includes(busca) || 
          t.cliente_email.toLowerCase().includes(busca) ||
          t.produto_nome.toLowerCase().includes(busca)
        );
      }
      
      // Total de resultados após a filtragem
      total = transacoesFiltradas.length;
      
      // Paginação
      const paginaNum = parseInt(pagina as string);
      const limiteNum = parseInt(limite as string);
      const inicio = (paginaNum - 1) * limiteNum;
      const fim = inicio + limiteNum;
      
      transacoes = transacoesFiltradas.slice(inicio, fim);
      origem = 'mock';
      
      console.log(`[API:Transacoes] Usando ${transacoes.length} transações mockadas (de ${total} total)`);
    }

    res.status(200).json({
      transacoes,
      total,
      origem
    });
  } catch (error) {
    console.error('[API:Transacoes] Erro geral ao processar requisição de transações:', error);
    
    // Em caso de erro geral, retornar dados mockados
    let transacoesMockPaginados = transacoesMock.slice(0, 10);
    
    res.status(200).json({ 
      transacoes: transacoesMockPaginados,
      total: transacoesMock.length,
      origem: 'fallback-error'
    });
  }
} 