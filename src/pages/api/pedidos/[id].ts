import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão direta com o banco de dados de orders usando a abordagem que funcionou no script de teste
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL || 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial
ordersPool.on('error', (err) => {
  console.error('[API:PedidoDetalhe:Pool] Erro no pool de conexão:', err.message);
});

console.log('[API:PedidoDetalhe:Init] Pool de conexão inicializado');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do pedido não fornecido ou inválido' });
  }

  try {
    console.log(`[API:PedidoDetalhe] Buscando detalhes do pedido ${id}`);
    
    // Obter conexão do pool
    const client = await ordersPool.connect();
    
    try {
      // Consulta para obter os detalhes do pedido
      const pedidoQuery = `
        SELECT 
          o.id, 
          o.user_id,
          o.status,
          o.amount,
          o.created_at,
          o.updated_at,
          o.customer_name,
          o.customer_email,
          o.service_id,
          o.service_name,
          o.metadata,
          u.name as user_name,
          u.email as user_email
        FROM "Order" o
        LEFT JOIN "User" u ON o.user_id = u.id
        WHERE o.id = $1
      `;
      
      const pedidoResult = await client.query(pedidoQuery, [id]);
      
      if (pedidoResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Pedido não encontrado',
          timestamp: new Date().toISOString()
        });
      }
      
      const pedidoData = pedidoResult.rows[0];
      
      // Extrair informações do metadata se disponível
      let metadataInfo = { 
        external_payment_id: null, 
        external_transaction_id: null,
        payment_method: null,
        provider: null
      };
      
      try {
        if (pedidoData.metadata) {
          const metadata = typeof pedidoData.metadata === 'string' 
            ? JSON.parse(pedidoData.metadata) 
            : pedidoData.metadata;
          
          metadataInfo.external_payment_id = metadata.external_payment_id;
          metadataInfo.external_transaction_id = metadata.external_transaction_id;
          metadataInfo.payment_method = metadata.payment_method;
          metadataInfo.provider = metadata.provider;
        }
      } catch (e) {
        console.error('[API:PedidoDetalhe] Erro ao processar metadata:', e);
      }
      
      // Formatar a resposta
      const pedido = {
        id: pedidoData.id,
        user_id: pedidoData.user_id,
        status: pedidoData.status,
        valor: pedidoData.amount,
        data_criacao: pedidoData.created_at,
        data_atualizacao: pedidoData.updated_at,
        cliente_nome: pedidoData.customer_name || pedidoData.user_name || 'Não informado',
        cliente_email: pedidoData.customer_email || pedidoData.user_email || 'Não informado',
        produto_id: pedidoData.service_id,
        produto_nome: pedidoData.service_name || 'Não informado',
        pagamento: {
          external_payment_id: metadataInfo.external_payment_id,
          external_transaction_id: metadataInfo.external_transaction_id,
          metodo: metadataInfo.payment_method,
          provedor: metadataInfo.provider
        },
        metadata: pedidoData.metadata
      };
      
      // Resposta com dados completos
      return res.status(200).json({
        pedido,
        debug: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (queryError) {
      console.error('[API:PedidoDetalhe] Erro ao executar consultas:', queryError);
      return res.status(500).json({ 
        error: 'Erro ao executar consultas no banco de dados',
        message: queryError instanceof Error ? queryError.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    } finally {
      // Sempre liberar o cliente de volta para o pool
      client.release();
      console.log('[API:PedidoDetalhe] Cliente liberado de volta para o pool');
    }
  } catch (error) {
    console.error('[API:PedidoDetalhe] Erro geral:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao buscar detalhes do pedido',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
}
