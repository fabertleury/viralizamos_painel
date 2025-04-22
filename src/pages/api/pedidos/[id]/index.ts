import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Buscando detalhes do pedido ID: ${id}`);

    // Buscar detalhes do pedido
    const detailsQuery = `
      SELECT 
        o.id, 
        o.created_at, 
        o.updated_at,
        o.provider_id,
        p.name as provedor_nome,
        o.quantity as quantidade,
        o.amount as valor,
        o.status,
        o.customer_name as cliente_nome,
        o.customer_email as cliente_email,
        o.customer_phone as cliente_telefone,
        o.transaction_id,
        o.external_order_id as provider_order_id,
        o.target_username,
        o.target_url,
        o.service_id,
        COALESCE(o.service_name, p.name || ' ' || o.service_type, 'Serviço não especificado') as produto_nome,
        o.service_type,
        o.payment_method,
        o.payment_status,
        o.user_id as cliente_id
      FROM 
        "Order" o
      LEFT JOIN 
        "Provider" p ON o.provider_id = p.id
      WHERE 
        o.id = $1
    `;
    
    const detailsResult = await ordersPool.query(detailsQuery, [id]);
    
    if (detailsResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    const pedido = detailsResult.rows[0];
    
    // Buscar logs do pedido
    const logsQuery = `
      SELECT 
        id,
        order_id,
        level,
        message,
        data,
        created_at
      FROM 
        "OrderLog"
      WHERE 
        order_id = $1
      ORDER BY 
        created_at DESC
      LIMIT 50
    `;
    
    const logsResult = await ordersPool.query(logsQuery, [id]);
    
    // Processar os dados para o formato que o frontend espera
    const historico = logsResult.rows.map(log => ({
      id: log.id,
      data: log.created_at,
      status: log.level,
      descricao: log.message,
      detalhes: log.data
    }));
    
    // Construir metadados adicionais a partir dos campos disponíveis
    const metadados: Record<string, any> = {
      cliente: {
        nome: pedido.cliente_nome,
        email: pedido.cliente_email,
        telefone: pedido.cliente_telefone
      },
      servico: {
        nome: pedido.produto_nome,
        tipo: pedido.service_type,
        quantidade: pedido.quantidade
      },
      provedor: {
        nome: pedido.provedor_nome,
        id: pedido.provider_id,
        order_id: pedido.provider_order_id
      },
      pagamento: {
        metodo: pedido.payment_method,
        status: pedido.payment_status,
        transacao_id: pedido.transaction_id
      },
      target: {
        username: pedido.target_username,
        url: pedido.target_url
      },
      datas: {
        criacao: pedido.created_at,
        atualizacao: pedido.updated_at
      }
    };
    
    // Formatar resposta final
    const pedidoDetalhado = {
      id: pedido.id,
      status: pedido.status,
      created_at: pedido.created_at,
      updated_at: pedido.updated_at,
      quantidade: pedido.quantidade,
      valor: parseFloat(pedido.valor) || 0,
      produto_nome: pedido.produto_nome,
      provedor_nome: pedido.provedor_nome,
      provider_order_id: pedido.provider_order_id,
      transacao_id: pedido.transaction_id,
      cliente_nome: pedido.cliente_nome,
      cliente_email: pedido.cliente_email,
      cliente_telefone: pedido.cliente_telefone,
      cliente_id: pedido.cliente_id,
      metadados: metadados,
      historico: historico
    };
    
    console.log(`[${new Date().toISOString()}] Detalhes do pedido ${id} recuperados com sucesso`);
    
    return res.status(200).json(pedidoDetalhado);
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar detalhes do pedido',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 