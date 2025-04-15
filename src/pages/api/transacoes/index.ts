import { NextApiRequest, NextApiResponse } from 'next';

// Dados mockados que já funcionam
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

    // Filtrar transações
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
    
    // Paginação
    const total = transacoesFiltradas.length;
    const paginaNum = parseInt(pagina as string);
    const limiteNum = parseInt(limite as string);
    const inicio = (paginaNum - 1) * limiteNum;
    const fim = inicio + limiteNum;
    
    const transacoesPaginadas = transacoesFiltradas.slice(inicio, fim);
    
    res.status(200).json({
      transacoes: transacoesPaginadas,
      total
    });
  } catch (error) {
    console.error('Erro ao processar transações:', error);
    res.status(200).json({ 
      transacoes: transacoesMock.slice(0, 3),
      total: 3 
    });
  }
} 