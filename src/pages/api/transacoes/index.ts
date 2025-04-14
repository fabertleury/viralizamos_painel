import { NextApiRequest, NextApiResponse } from 'next';

// Dados mockados de transações
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
  },
  {
    id: 'tx_67893',
    data_criacao: '2023-08-07T12:30:00Z',
    valor: 49900,
    status: 'pendente',
    metodo_pagamento: 'boleto',
    cliente_id: 'usr_101',
    cliente_nome: 'Ana Oliveira',
    cliente_email: 'ana.oliveira@example.com',
    produto_id: 'prod_202',
    produto_nome: 'Facebook Likes (500)',
    order_id: 'ord_12348'
  },
  {
    id: 'tx_67894',
    data_criacao: '2023-08-06T18:15:00Z',
    valor: 299900,
    status: 'aprovado',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_202',
    cliente_nome: 'Roberto Almeida',
    cliente_email: 'roberto.almeida@example.com',
    produto_id: 'prod_303',
    produto_nome: 'Instagram Followers (5000)',
    order_id: 'ord_12349'
  },
  {
    id: 'tx_67895',
    data_criacao: '2023-08-06T16:40:00Z',
    valor: 79900,
    status: 'aprovado',
    metodo_pagamento: 'pix',
    cliente_id: 'usr_303',
    cliente_nome: 'Fernanda Lima',
    cliente_email: 'fernanda.lima@example.com',
    produto_id: 'prod_404',
    produto_nome: 'Twitter Followers (1000)',
    order_id: 'ord_12350'
  },
  {
    id: 'tx_67896',
    data_criacao: '2023-08-06T15:20:00Z',
    valor: 59900,
    status: 'estornado',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_404',
    cliente_nome: 'Lucas Costa',
    cliente_email: 'lucas.costa@example.com',
    produto_id: 'prod_505',
    produto_nome: 'TikTok Views (1000)',
    order_id: 'ord_12351'
  },
  {
    id: 'tx_67897',
    data_criacao: '2023-08-06T14:10:00Z',
    valor: 149900,
    status: 'aprovado',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_505',
    cliente_nome: 'Juliana Mendes',
    cliente_email: 'juliana.mendes@example.com',
    produto_id: 'prod_606',
    produto_nome: 'Instagram Reels Views (10000)',
    order_id: 'ord_12352'
  },
  {
    id: 'tx_67898',
    data_criacao: '2023-08-06T12:45:00Z',
    valor: 39900,
    status: 'aprovado',
    metodo_pagamento: 'pix',
    cliente_id: 'usr_606',
    cliente_nome: 'Pedro Santos',
    cliente_email: 'pedro.santos@example.com',
    produto_id: 'prod_707',
    produto_nome: 'Facebook Comments (100)',
    order_id: 'ord_12353'
  },
  {
    id: 'tx_67899',
    data_criacao: '2023-08-06T11:30:00Z',
    valor: 249900,
    status: 'em_analise',
    metodo_pagamento: 'credit_card',
    cliente_id: 'usr_707',
    cliente_nome: 'Camila Rocha',
    cliente_email: 'camila.rocha@example.com',
    produto_id: 'prod_808',
    produto_nome: 'YouTube Subscribers (500)',
    order_id: 'ord_12354'
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

    let transacoesFiltradas = [...transacoesMock];
    
    // Aplicar filtros
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
    const total = transacoesFiltradas.length;
    
    // Paginação
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
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ message: 'Erro ao buscar transações' });
  }
} 