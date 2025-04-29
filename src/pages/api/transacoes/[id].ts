import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão direta com o banco de dados de pagamentos usando a abordagem que funcionou no script de teste
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial
pagamentosPool.on('error', (err) => {
  console.error('[API:TransacaoDetalhe:Pool] Erro no pool de conexão:', err.message);
});

console.log('[API:TransacaoDetalhe:Init] Pool de conexão inicializado');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID da transação não fornecido ou inválido' });
  }

  try {
    console.log(`[API:TransacaoDetalhe] Buscando detalhes da transação ${id}`);
    
    // Obter conexão do pool
    const client = await pagamentosPool.connect();
    
    try {
      // Consulta para obter os detalhes da transação
      const transacaoQuery = `
        SELECT 
          t.id, 
          t.external_id, 
          t.reference,
          t.amount, 
          t.status, 
          t.method,
          t.provider,
          t.installments,
          t.created_at,
          t.updated_at,
          t.payment_request_id,
          t.metadata as transaction_metadata,
          pr.id as payment_request_id,
          pr.customer_name, 
          pr.customer_email,
          pr.customer_document,
          pr.customer_phone,
          pr.service_id,
          pr.service_name,
          pr.service_description,
          pr.metadata as payment_request_metadata
        FROM "transactions" t
        LEFT JOIN "payment_requests" pr ON t.payment_request_id = pr.id
        WHERE t.id = $1
      `;
      
      const transacaoResult = await client.query(transacaoQuery, [id]);
      
      if (transacaoResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Transação não encontrada',
          timestamp: new Date().toISOString()
        });
      }
      
      const transacaoData = transacaoResult.rows[0];
      
      // Extrair informações do metadata se disponível
      let metadataInfo = { order_id: null, user_id: null };
      try {
        if (transacaoData.transaction_metadata) {
          const metadata = typeof transacaoData.transaction_metadata === 'string' 
            ? JSON.parse(transacaoData.transaction_metadata) 
            : transacaoData.transaction_metadata;
          
          metadataInfo.order_id = metadata.order_id;
          metadataInfo.user_id = metadata.user_id;
        }
        
        if (transacaoData.payment_request_metadata) {
          const prMetadata = typeof transacaoData.payment_request_metadata === 'string'
            ? JSON.parse(transacaoData.payment_request_metadata)
            : transacaoData.payment_request_metadata;
            
          if (!metadataInfo.order_id && prMetadata.order_id) {
            metadataInfo.order_id = prMetadata.order_id;
          }
          
          if (!metadataInfo.user_id && prMetadata.user_id) {
            metadataInfo.user_id = prMetadata.user_id;
          }
        }
      } catch (e) {
        console.error('[API:TransacaoDetalhe] Erro ao processar metadata:', e);
      }
      
      // Formatar a resposta
      const transacao = {
        id: transacaoData.id,
        external_id: transacaoData.external_id || '',
        reference: transacaoData.reference || '',
        data_criacao: transacaoData.created_at,
        data_atualizacao: transacaoData.updated_at,
        valor: transacaoData.amount,
        status: transacaoData.status,
        metodo_pagamento: transacaoData.method,
        provedor: transacaoData.provider,
        parcelas: transacaoData.installments,
        payment_request_id: transacaoData.payment_request_id,
        cliente: {
          nome: transacaoData.customer_name || 'Não informado',
          email: transacaoData.customer_email || 'Não informado',
          documento: transacaoData.customer_document || '',
          telefone: transacaoData.customer_phone || ''
        },
        produto: {
          id: transacaoData.service_id || '',
          nome: transacaoData.service_name || 'Não informado',
          descricao: transacaoData.service_description || ''
        },
        vinculacoes: {
          order_id: metadataInfo.order_id || transacaoData.external_id || '',
          user_id: metadataInfo.user_id || ''
        },
        metadata: {
          transaction: transacaoData.transaction_metadata,
          payment_request: transacaoData.payment_request_metadata
        }
      };
      
      // Buscar informações adicionais sobre a transação, como logs ou histórico
      const logsQuery = `
        SELECT id, event_type, created_at, data
        FROM "payment_notification_logs"
        WHERE transaction_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const logsResult = await client.query(logsQuery, [id]);
      const logs = logsResult.rows.map(log => ({
        id: log.id,
        tipo: log.event_type,
        data: log.created_at,
        detalhes: log.data
      }));
      
      // Resposta com dados completos
      return res.status(200).json({
        transacao,
        logs,
        debug: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (queryError) {
      console.error('[API:TransacaoDetalhe] Erro ao executar consultas:', queryError);
      return res.status(500).json({ 
        error: 'Erro ao executar consultas no banco de dados',
        message: queryError instanceof Error ? queryError.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    } finally {
      // Sempre liberar o cliente de volta para o pool
      client.release();
      console.log('[API:TransacaoDetalhe] Cliente liberado de volta para o pool');
    }
  } catch (error) {
    console.error('[API:TransacaoDetalhe] Erro geral:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao buscar detalhes da transação',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}
