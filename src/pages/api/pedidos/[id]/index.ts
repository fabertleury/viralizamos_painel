import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface PedidoFormatado {
  id: string;
  status: string;
  amount: number;
  created_at: Date;
  produto_nome?: string;
  produto_descricao?: string;
  provedor_nome?: string;
  provider_order_id?: string;
  quantidade?: number;
  transacao_id?: string;
  error_message?: string;
  api_response?: any;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  cliente_id?: string;
  historico?: Array<{
    data: Date;
    status: string;
    descricao: string;
  }>;
  metadados?: Record<string, any>;
  transacao_detalhes?: {
    status: string;
    metodo_pagamento?: string;
    data_pagamento?: Date;
    parcelas?: number;
    valor_parcela?: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Tratar apenas requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID de pedido inválido' });
  }

  try {
    // Recuperar o token
    const authToken = req.headers.authorization;
    
    if (!authToken || !authToken.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    // Chamar a API de orders para obter detalhes do pedido
    const ordersApiUrl = process.env.NEXT_PUBLIC_ORDERS_API_URL;
    
    // Verificar se a URL da API está configurada
    if (!ordersApiUrl) {
      console.error('URL da API de pedidos não configurada');
      return res.status(500).json({ 
        message: 'Erro de configuração do servidor',
        mock: true,
        id: id,
        status: 'pending',
        amount: 49.9,
        created_at: new Date(),
        produto_nome: 'Produto (mock)',
        cliente_nome: 'Cliente (mock)',
        cliente_email: 'cliente@exemplo.com'
      });
    }
    
    console.log(`Buscando detalhes do pedido ${id} na API de pedidos...`);
    
    const response = await axios.get(`${ordersApiUrl}/api/orders/${id}`, {
      headers: {
        'Authorization': `ApiKey ${process.env.ORDERS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 segundos
    });
    
    // Mapear a resposta da API para o formato esperado pelo frontend
    const pedidoData = response.data;
    
    const pedidoFormatado: PedidoFormatado = {
      id: pedidoData.id,
      status: pedidoData.status,
      amount: pedidoData.price || pedidoData.amount,
      created_at: pedidoData.created_at,
      produto_nome: pedidoData.service_name || pedidoData.product_name,
      produto_descricao: pedidoData.service_description,
      provedor_nome: pedidoData.provider_name,
      provider_order_id: pedidoData.provider_order_id,
      quantidade: pedidoData.quantity,
      transacao_id: pedidoData.transaction_id,
      error_message: pedidoData.error_message,
      api_response: pedidoData.api_response,
      cliente_nome: pedidoData.user_name || pedidoData.customer_name,
      cliente_email: pedidoData.user_email || pedidoData.customer_email,
      cliente_telefone: pedidoData.user_phone || pedidoData.customer_phone,
      cliente_id: pedidoData.user_id || pedidoData.customer_id,
      historico: pedidoData.history ? pedidoData.history.map((item: any) => ({
        data: item.created_at || item.date,
        status: item.status,
        descricao: item.description || item.message
      })) : [],
      metadados: pedidoData.metadata
    };

    // Adicionar detalhes da transação, se disponíveis
    if (pedidoData.transaction) {
      pedidoFormatado.transacao_detalhes = {
        status: pedidoData.transaction.status,
        metodo_pagamento: pedidoData.transaction.payment_method,
        data_pagamento: pedidoData.transaction.approved_at,
        parcelas: pedidoData.transaction.installments,
        valor_parcela: pedidoData.transaction.installment_amount
      };
    }
    
    return res.status(200).json(pedidoFormatado);
    
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    
    // Verificar se é um erro de timeout ou conexão
    const isConnectionError = error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED';
    
    // Em caso de erro, retornar dados simulados para visualização
    return res.status(200).json({
      id: id,
      data_criacao: new Date(),
      provedor_id: 'mock-prov',
      provedor_nome: 'Provedor (offline)',
      produto_id: 'mock-prod',
      produto_nome: 'Produto de teste',
      quantidade: 100,
      valor: 50.0,
      status: 'pending',
      cliente_id: 'mock-client',
      cliente_nome: 'Cliente de teste',
      cliente_email: 'teste@exemplo.com',
      error_message: 'Dados simulados devido a erro de conexão com o serviço de pedidos',
      mock: true,
      error: isConnectionError ? 'Serviço temporariamente indisponível' : 'Erro ao processar pedido'
    });
  }
} 