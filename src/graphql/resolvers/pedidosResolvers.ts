import { ordersPool } from '../../lib/prisma';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroInput {
  status?: string;
  provedor?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

export const pedidosResolvers = {
  Query: {
    pedidos: async (_: any, { filtro, paginacao }: { filtro?: FiltroInput, paginacao: PaginacaoInput }) => {
      try {
        const { pagina, limite } = paginacao;
        const offset = (pagina - 1) * limite;
        
        let query = `
          SELECT 
            o.id, 
            o.created_at as data_criacao, 
            o.provider_id as provedor_id,
            p.name as provedor_nome,
            o.service_id as produto_id,
            s.name as produto_nome,
            o.quantity as quantidade,
            o.price as valor,
            o.status,
            o.user_id as cliente_id,
            u.name as cliente_nome,
            u.email as cliente_email,
            o.transaction_id as transacao_id,
            o.provider_order_id,
            o.api_response as resposta,
            o.error_message as erro,
            o.last_check as ultima_verificacao
          FROM 
            orders o
          LEFT JOIN 
            providers p ON o.provider_id = p.id
          LEFT JOIN 
            services s ON o.service_id = s.id
          LEFT JOIN 
            users u ON o.user_id = u.id
          WHERE 1=1
        `;
        
        const queryParams: any[] = [];
        let paramCount = 1;

        // Aplicar filtros se existirem
        if (filtro) {
          if (filtro.status && filtro.status !== 'todos') {
            query += ` AND o.status = $${paramCount++}`;
            queryParams.push(filtro.status);
          }
          
          if (filtro.provedor && filtro.provedor !== 'todos') {
            query += ` AND o.provider_id = $${paramCount++}`;
            queryParams.push(filtro.provedor);
          }
          
          if (filtro.dataInicio) {
            query += ` AND o.created_at >= $${paramCount++}`;
            queryParams.push(filtro.dataInicio);
          }
          
          if (filtro.dataFim) {
            query += ` AND o.created_at <= $${paramCount++}`;
            queryParams.push(filtro.dataFim);
          }
          
          if (filtro.termoBusca) {
            query += ` AND (
              o.id::text ILIKE $${paramCount} OR 
              u.name ILIKE $${paramCount} OR 
              u.email ILIKE $${paramCount} OR
              s.name ILIKE $${paramCount} OR
              o.provider_order_id ILIKE $${paramCount}
            )`;
            queryParams.push(`%${filtro.termoBusca}%`);
            paramCount++;
          }
        }
        
        // Query para contagem total
        const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
        const countResult = await ordersPool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);
        
        // Adicionar ordenação e paginação
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        queryParams.push(limite);
        queryParams.push(offset);
        
        const result = await ordersPool.query(query, queryParams);
        
        return {
          pedidos: result.rows,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        throw new Error('Erro ao buscar pedidos do banco de dados');
      }
    },
    
    pedido: async (_: any, { id }: { id: string }) => {
      try {
        const query = `
          SELECT 
            o.id, 
            o.created_at as data_criacao, 
            o.provider_id as provedor_id,
            p.name as provedor_nome,
            o.service_id as produto_id,
            s.name as produto_nome,
            o.quantity as quantidade,
            o.price as valor,
            o.status,
            o.user_id as cliente_id,
            u.name as cliente_nome,
            u.email as cliente_email,
            o.transaction_id as transacao_id,
            o.provider_order_id,
            o.api_response as resposta,
            o.error_message as erro,
            o.last_check as ultima_verificacao
          FROM 
            orders o
          LEFT JOIN 
            providers p ON o.provider_id = p.id
          LEFT JOIN 
            services s ON o.service_id = s.id
          LEFT JOIN 
            users u ON o.user_id = u.id
          WHERE 
            o.id = $1
        `;
        
        const result = await ordersPool.query(query, [id]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        return result.rows[0];
      } catch (error) {
        console.error(`Erro ao buscar pedido ${id}:`, error);
        throw new Error(`Erro ao buscar pedido ${id}`);
      }
    },
    
    provedores: async () => {
      try {
        const query = `
          SELECT 
            id,
            name as nome,
            type as tipo,
            status,
            balance as saldo
          FROM 
            providers
          WHERE 
            status = 'active'
          ORDER BY 
            name ASC
        `;
        
        const result = await ordersPool.query(query);
        return result.rows;
      } catch (error) {
        console.error('Erro ao buscar provedores:', error);
        throw new Error('Erro ao buscar provedores');
      }
    }
  },
  
  Mutation: {
    reenviarPedido: async (_: any, { id }: { id: string }) => {
      try {
        // Atualizando o status do pedido para "processando" e marcando para reprocessamento
        const query = `
          UPDATE orders
          SET 
            status = 'processando',
            retry_count = 0,
            last_check = NULL,
            error_message = NULL,
            updated_at = NOW()
          WHERE 
            id = $1 AND 
            (status = 'falha' OR status = 'pendente')
          RETURNING id
        `;
        
        const result = await ordersPool.query(query, [id]);
        
        if (result.rows.length === 0) {
          return {
            sucesso: false,
            mensagem: 'Pedido não encontrado ou não está em um estado que permita reenvio'
          };
        }
        
        return {
          sucesso: true,
          mensagem: `Pedido ${id} marcado para reprocessamento`
        };
      } catch (error: any) {
        console.error(`Erro ao reenviar pedido ${id}:`, error);
        return {
          sucesso: false,
          mensagem: `Erro ao reenviar pedido: ${error.message}`
        };
      }
    }
  }
}; 