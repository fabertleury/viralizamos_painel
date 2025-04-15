import { pagamentosPool } from '../../lib/prisma';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroTransacaoInput {
  status?: string;
  metodo?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

export const transacoesResolvers = {
  Query: {
    transacoes: async (_: any, { filtro, paginacao }: { filtro?: FiltroTransacaoInput, paginacao: PaginacaoInput }) => {
      try {
        const { pagina, limite } = paginacao;
        const offset = (pagina - 1) * limite;
        
        let query = `
          SELECT 
            t.id, 
            t.data_criacao, 
            t.valor, 
            t.status, 
            t.metodo_pagamento as metodoPagamento,
            t.cliente_id as clienteId,
            u.nome as clienteNome,
            u.email as clienteEmail,
            t.produto_id as produtoId,
            p.nome as produtoNome,
            t.order_id as orderId
          FROM 
            transacoes t
          LEFT JOIN 
            usuarios u ON t.cliente_id = u.id
          LEFT JOIN 
            produtos p ON t.produto_id = p.id
          WHERE 1=1
        `;
        
        const queryParams: any[] = [];
        let paramCount = 1;

        // Aplicar filtros se existirem
        if (filtro) {
          if (filtro.status && filtro.status !== 'todos') {
            query += ` AND t.status = $${paramCount++}`;
            queryParams.push(filtro.status);
          }
          
          if (filtro.metodo && filtro.metodo !== 'todos') {
            query += ` AND t.metodo_pagamento = $${paramCount++}`;
            queryParams.push(filtro.metodo);
          }
          
          if (filtro.dataInicio) {
            query += ` AND t.data_criacao >= $${paramCount++}`;
            queryParams.push(filtro.dataInicio);
          }
          
          if (filtro.dataFim) {
            query += ` AND t.data_criacao <= $${paramCount++}`;
            queryParams.push(filtro.dataFim);
          }
          
          if (filtro.termoBusca) {
            query += ` AND (
              t.id::text ILIKE $${paramCount} OR 
              u.nome ILIKE $${paramCount} OR 
              u.email ILIKE $${paramCount} OR
              p.nome ILIKE $${paramCount}
            )`;
            queryParams.push(`%${filtro.termoBusca}%`);
            paramCount++;
          }
        }
        
        // Query para contagem total
        const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
        const countResult = await pagamentosPool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);
        
        // Adicionar ordenação e paginação
        query += ` ORDER BY t.data_criacao DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        queryParams.push(limite);
        queryParams.push(offset);
        
        const result = await pagamentosPool.query(query, queryParams);
        
        return {
          transacoes: result.rows,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar transações:', error);
        throw new Error('Erro ao buscar transações do banco de dados');
      }
    },
    
    transacao: async (_: any, { id }: { id: string }) => {
      try {
        const query = `
          SELECT 
            t.id, 
            t.data_criacao as dataCriacao, 
            t.valor, 
            t.status, 
            t.metodo_pagamento as metodoPagamento,
            t.cliente_id as clienteId,
            u.nome as clienteNome,
            u.email as clienteEmail,
            t.produto_id as produtoId,
            p.nome as produtoNome,
            t.order_id as orderId
          FROM 
            transacoes t
          LEFT JOIN 
            usuarios u ON t.cliente_id = u.id
          LEFT JOIN 
            produtos p ON t.produto_id = p.id
          WHERE 
            t.id = $1
        `;
        
        const result = await pagamentosPool.query(query, [id]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        return result.rows[0];
      } catch (error) {
        console.error(`Erro ao buscar transação ${id}:`, error);
        throw new Error(`Erro ao buscar transação ${id}`);
      }
    }
  },
  
  Mutation: {
    // Mutations para transações podem ser adicionadas aqui, se necessárias
  }
}; 