import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { pagamentosPool } from '../../../lib/prisma';
import { pagamentosPrisma, transaction, ITransacao } from '../../../lib/pagamentos-prisma';

// URL base do microserviço de pagamentos (deve ser configurado no arquivo .env)
// Configurar para usar IPv4 explicitamente
const PAYMENTS_API_URL = (process.env.PAYMENTS_API_URL || 'http://127.0.0.1:3001/api').replace('localhost', '127.0.0.1');

console.log(`[API:Transacoes] URL configurada do microserviço: ${PAYMENTS_API_URL}`);
console.log(`[API:Transacoes] URL do banco de dados de pagamentos: ${process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 40)}...`);

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

    console.log(`[API:Transacoes] Consultando transações com parâmetros: pagina=${pagina}, limite=${limite}, status=${status}, metodo=${metodo}, termoBusca=${termoBusca}`);
    
    let transacoes;
    let total;
    let origem = 'api';

    try {
      // Vamos usar o Prisma diretamente para acessar o banco de dados de pagamentos
      console.log('[API:Transacoes] Tentando acessar o banco de dados via Prisma');
      
      // Construir a condição WHERE para filtros
      const where: any = {};
      
      if (status && status !== 'todos') {
        where.status = status.toString();
      }
      
      if (metodo && metodo !== 'todos') {
        where.method = metodo.toString();
      }
      
      // Para busca por termos, precisamos usar a condição OR
      if (termoBusca) {
        const busca = termoBusca.toString();
        where.OR = [
          { id: { contains: busca } },
          { external_id: { contains: busca } },
          {
            payment_request: {
              OR: [
                { customer_name: { contains: busca } },
                { customer_email: { contains: busca } },
                { service_name: { contains: busca } }
              ]
            }
          }
        ];
      }
      
      // Calcular paginação
      const paginaNum = parseInt(pagina as string);
      const limiteNum = parseInt(limite as string);
      const skip = (paginaNum - 1) * limiteNum;
      
      console.log(`[API:Transacoes] Consulta Prisma: where=${JSON.stringify(where)}, skip=${skip}, take=${limiteNum}`);
      
      // Obter o total de transações
      const totalCount = await transaction.transaction.count({ where });
      
      // Buscar transações com paginação
      const transacoesBanco = await transaction.transaction.findMany({
        where,
        include: {
          payment_request: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limiteNum,
      });
      
      console.log(`[API:Transacoes] Encontradas ${transacoesBanco.length} transações de ${totalCount} total`);
      
      // Mapear os dados para o formato esperado pelo frontend
      transacoes = transacoesBanco.map((t: any) => ({
        id: t.id,
        data_criacao: t.created_at,
        valor: t.amount,
        status: t.status,
        metodo_pagamento: t.method,
        cliente_id: t.payment_request?.id || 'N/A',
        cliente_nome: t.payment_request?.customer_name || 'N/A',
        cliente_email: t.payment_request?.customer_email || 'N/A',
        produto_id: t.payment_request?.id || 'N/A',
        produto_nome: t.payment_request?.service_name || 'N/A',
        order_id: t.external_id || 'N/A'
      }));
      
      total = totalCount;
      origem = 'prisma';
      
    } catch (dbError: any) {
      console.error(`[API:Transacoes] Erro ao acessar banco de dados:`, dbError);
      
      // Se ocorrer erro com o Prisma, tentar usar a conexão direta do Pool
      try {
        console.log('[API:Transacoes] Tentando conexão direta com o banco via Pool');
        
        // Construir a consulta SQL
        let sql = `
          SELECT 
            t.id, t.external_id, t.amount, t.status, t.method, t.created_at,
            pr.id as pr_id, pr.customer_name, pr.customer_email, pr.service_name
          FROM transaction t
          LEFT JOIN payment_request pr ON t.payment_request_id = pr.id
          WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramIndex = 1;
        
        if (status && status !== 'todos') {
          sql += ` AND t.status = $${paramIndex}`;
          params.push(status);
          paramIndex++;
        }
        
        if (metodo && metodo !== 'todos') {
          sql += ` AND t.method = $${paramIndex}`;
          params.push(metodo);
          paramIndex++;
        }
        
        if (termoBusca) {
          sql += ` AND (
            t.id::text ILIKE $${paramIndex} OR
            t.external_id::text ILIKE $${paramIndex} OR
            pr.customer_name ILIKE $${paramIndex} OR
            pr.customer_email ILIKE $${paramIndex} OR
            pr.service_name ILIKE $${paramIndex}
          )`;
          params.push(`%${termoBusca}%`);
          paramIndex++;
        }
        
        // Consulta para total de resultados
        const countResult = await pagamentosPool.query(
          `SELECT COUNT(*) FROM (${sql}) as count_query`, 
          params
        );
        
        total = parseInt(countResult.rows[0].count);
        
        // Paginação
        const paginaNum = parseInt(pagina as string);
        const limiteNum = parseInt(limite as string);
        const offset = (paginaNum - 1) * limiteNum;
        
        sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limiteNum, offset);
        
        console.log(`[API:Transacoes] Executando SQL: ${sql} com parâmetros: ${params.join(', ')}`);
        
        const result = await pagamentosPool.query(sql, params);
        
        // Mapear os resultados
        transacoes = result.rows.map((row: any) => ({
          id: row.id,
          data_criacao: row.created_at,
          valor: row.amount,
          status: row.status,
          metodo_pagamento: row.method,
          cliente_id: row.pr_id || 'N/A',
          cliente_nome: row.customer_name || 'N/A',
          cliente_email: row.customer_email || 'N/A',
          produto_id: row.pr_id || 'N/A',
          produto_nome: row.service_name || 'N/A',
          order_id: row.external_id || 'N/A'
        }));
        
        origem = 'pool';
        console.log(`[API:Transacoes] Obtidas ${transacoes.length} transações via Pool SQL`);
        
      } catch (poolError: any) {
        console.error(`[API:Transacoes] Erro ao usar pool de conexão:`, poolError);
        
        // Se falhar o Pool também, tentar a API REST
        try {
          console.log(`[API:Transacoes] Tentando API REST: ${PAYMENTS_API_URL}/transactions/list`);
          
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
            console.log(`[API:Transacoes] Resposta recebida da API: ${JSON.stringify(data).substring(0, 200)}...`);
            
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
            origem = 'api-rest';
          } else {
            throw new Error(`Resposta inválida: ${response.status}`);
          }
        } catch (apiError: any) {
          console.error(`[API:Transacoes] Erro ao conectar com API REST:`, apiError);
          
          // Todos os métodos falharam, vamos usar dados mockados
          console.log('[API:Transacoes] Usando dados mockados como último recurso');
          
          // Aplicar filtros nos dados mockados
          let transacoesFiltradas = [...transacoesMock];
          
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
      }
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