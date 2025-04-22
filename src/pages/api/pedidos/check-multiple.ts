import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// Conexão com o banco de dados de orders
const ordersPool = new Pool({
  connectionString: process.env.DATABASE_URL_ORDERS,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicializar o pool e testar a conexão
ordersPool.on('error', (err) => {
  console.error('Erro inesperado no pool de pedidos', err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas permitir requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Obter lista de IDs de pedidos do corpo da requisição
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Lista de IDs de pedidos é obrigatória'
    });
  }

  // Limitar o número de pedidos que podem ser verificados de uma vez
  if (ids.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limite máximo de 100 pedidos por requisição'
    });
  }

  try {
    console.log(`[${new Date().toISOString()}] Verificando status de ${ids.length} pedidos`);
    
    // Buscar informações dos pedidos, agrupando por provedor
    const pedidosQuery = `
      SELECT 
        o.id, 
        o.external_order_id,
        o.provider_id,
        p.name as provider_name,
        p.api_url,
        p.api_key,
        o.status as current_status
      FROM 
        "Order" o
      LEFT JOIN 
        "Provider" p ON o.provider_id = p.id
      WHERE 
        o.id = ANY($1::uuid[])
        AND o.external_order_id IS NOT NULL
    `;
    
    const pedidosResult = await ordersPool.query(pedidosQuery, [ids]);
    
    if (pedidosResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nenhum pedido válido encontrado' 
      });
    }
    
    // Agrupar pedidos por provedor
    const pedidosPorProvedor = pedidosResult.rows.reduce((acc, pedido) => {
      if (!acc[pedido.provider_id]) {
        acc[pedido.provider_id] = {
          provedor: {
            id: pedido.provider_id,
            nome: pedido.provider_name,
            api_url: pedido.api_url,
            api_key: pedido.api_key
          },
          pedidos: []
        };
      }
      
      acc[pedido.provider_id].pedidos.push({
        id: pedido.id,
        external_order_id: pedido.external_order_id,
        current_status: pedido.current_status
      });
      
      return acc;
    }, {});
    
    // Resultados de todos os pedidos
    const resultados = {
      total: pedidosResult.rows.length,
      atualizados: 0,
      erros: 0,
      pedidos: []
    };
    
    // Para cada provedor, verificar os status dos pedidos
    for (const provedorId in pedidosPorProvedor) {
      const { provedor, pedidos } = pedidosPorProvedor[provedorId];
      
      if (!provedor.api_url || !provedor.api_key) {
        console.log(`[${new Date().toISOString()}] Provedor ${provedor.nome} (${provedorId}) não possui URL ou chave de API configurada`);
        
        // Adicionar pedidos deste provedor como erro
        pedidos.forEach(pedido => {
          resultados.pedidos.push({
            id: pedido.id,
            external_order_id: pedido.external_order_id,
            status_anterior: pedido.current_status,
            status_atual: pedido.current_status,
            atualizado: false,
            erro: 'Provedor sem API configurada'
          });
          
          resultados.erros++;
        });
        
        continue;
      }
      
      try {
        console.log(`[${new Date().toISOString()}] Enviando requisição para o provedor: ${provedor.nome} com ${pedidos.length} pedidos`);
        
        // Montar parâmetros para enviar ao provedor
        const params = new URLSearchParams();
        params.append('key', provedor.api_key);
        params.append('action', 'status');
        
        // Juntar todos os IDs de pedidos externos em uma string separada por vírgulas
        const orderIds = pedidos.map(p => p.external_order_id).join(',');
        params.append('order', orderIds);
        
        // Fazer requisição para o provedor
        const response = await axios.post(provedor.api_url, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 20000 // 20 segundos
        });
        
        // Processar a resposta do provedor (objeto com IDs como chaves)
        if (response.data && typeof response.data === 'object') {
          // Para cada pedido deste provedor
          for (const pedido of pedidos) {
            const responseData = response.data[pedido.external_order_id];
            
            // Se não temos dados para este pedido específico
            if (!responseData) {
              resultados.pedidos.push({
                id: pedido.id,
                external_order_id: pedido.external_order_id,
                status_anterior: pedido.current_status,
                status_atual: pedido.current_status,
                atualizado: false,
                erro: 'Sem resposta do provedor para este pedido'
              });
              
              resultados.erros++;
              continue;
            }
            
            // Se o provedor retornou um erro para este pedido
            if (responseData.error) {
              resultados.pedidos.push({
                id: pedido.id,
                external_order_id: pedido.external_order_id,
                status_anterior: pedido.current_status,
                status_atual: pedido.current_status,
                atualizado: false,
                erro: responseData.error
              });
              
              resultados.erros++;
              continue;
            }
            
            // Mapear o status do provedor para o formato interno
            let statusAtualizado = pedido.current_status;
            
            if (responseData.status) {
              switch (responseData.status.toLowerCase()) {
                case 'completed':
                case 'complete':
                  statusAtualizado = 'completo';
                  break;
                case 'in progress':
                case 'processing':
                case 'pending':
                  statusAtualizado = 'processando';
                  break;
                case 'partial':
                  statusAtualizado = 'parcial';
                  break;
                case 'canceled':
                case 'cancelled':
                  statusAtualizado = 'cancelado';
                  break;
                case 'failed':
                case 'error':
                  statusAtualizado = 'falha';
                  break;
                default:
                  statusAtualizado = pedido.current_status; // Manter o status atual
              }
            }
            
            // Se o status foi atualizado, atualizar no banco de dados
            if (statusAtualizado !== pedido.current_status) {
              const updateQuery = `
                UPDATE "Order"
                SET 
                  status = $1,
                  updated_at = NOW()
                WHERE id = $2
                RETURNING id, status
              `;
              
              await ordersPool.query(updateQuery, [statusAtualizado, pedido.id]);
              
              // Registrar log da verificação
              const logQuery = `
                INSERT INTO "OrderLog" (order_id, level, message, data)
                VALUES ($1, 'info', $2, $3)
              `;
              
              await ordersPool.query(logQuery, [
                pedido.id, 
                `Status atualizado de "${pedido.current_status}" para "${statusAtualizado}" via verificação em lote`,
                JSON.stringify({
                  provider_response: responseData,
                  previous_status: pedido.current_status,
                  new_status: statusAtualizado,
                  updated_at: new Date().toISOString()
                })
              ]);
              
              resultados.atualizados++;
            }
            
            // Adicionar resultado ao objeto de resultados
            resultados.pedidos.push({
              id: pedido.id,
              external_order_id: pedido.external_order_id,
              status_anterior: pedido.current_status,
              status_atual: statusAtualizado,
              atualizado: statusAtualizado !== pedido.current_status,
              detalhes: responseData
            });
          }
        } else {
          // Resposta inválida do provedor
          pedidos.forEach(pedido => {
            resultados.pedidos.push({
              id: pedido.id,
              external_order_id: pedido.external_order_id,
              status_anterior: pedido.current_status,
              status_atual: pedido.current_status,
              atualizado: false,
              erro: 'Resposta inválida do provedor'
            });
            
            resultados.erros++;
          });
        }
      } catch (errorProvedor) {
        console.error(`[${new Date().toISOString()}] Erro ao processar pedidos do provedor ${provedor.nome}:`, errorProvedor);
        
        // Adicionar todos os pedidos deste provedor como erro
        pedidos.forEach(pedido => {
          resultados.pedidos.push({
            id: pedido.id,
            external_order_id: pedido.external_order_id,
            status_anterior: pedido.current_status,
            status_atual: pedido.current_status,
            atualizado: false,
            erro: errorProvedor instanceof Error ? errorProvedor.message : 'Erro desconhecido'
          });
          
          resultados.erros++;
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Verificação concluída: ${resultados.atualizados} pedidos atualizados, ${resultados.erros} erros`,
      resultados
    });
  } catch (error) {
    console.error('Erro ao verificar status dos pedidos:', error);
    
    return res.status(500).json({ 
      success: false,
      message: 'Erro ao verificar status dos pedidos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 