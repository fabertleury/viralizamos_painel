import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Log inicial para depuração
  console.log('API /usuarios - Iniciando processamento da requisição');
  
  try {
    // Extrair parâmetros da requisição
    const { 
      tipo, 
      status, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    console.log(`API /usuarios - Parâmetros: tipo=${tipo}, status=${status}, termoBusca=${termoBusca}, pagina=${pagina}, limite=${limite}`);

    // Configuração dos endpoints dos microserviços
    const pagamentosApiUrl = process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL || 'https://pagamentos.viralizamos.com/api';
    const ordersApiUrl = process.env.NEXT_PUBLIC_ORDERS_API_URL || 'https://orders.viralizamos.com/api';
    
    // Chaves de API para autenticação
    const pagamentosApiKey = process.env.PAYMENTS_API_KEY || '';
    const ordersApiKey = process.env.ORDERS_API_KEY || '';

    console.log(`API /usuarios - Usando endpoints: Pagamentos=${pagamentosApiUrl}, Orders=${ordersApiUrl}`);

    // Buscar os usuários diretamente do microserviço de pagamentos
    const queryParams = new URLSearchParams();
    
    // Adicionar filtros aos parâmetros de consulta
    if (tipo && tipo !== 'todos') {
      queryParams.append('role', tipo as string);
    }
    
    if (status && status !== 'todos') {
      queryParams.append('active', status === 'ativo' ? 'true' : 'false');
    }
    
    if (termoBusca) {
      queryParams.append('search', termoBusca as string);
    }
    
    // Adicionar parâmetros de paginação
    queryParams.append('page', pagina as string);
    queryParams.append('limit', limite as string);
    
    console.log(`API /usuarios - Preparando requisição para ${pagamentosApiUrl}/admin/users/list`);
    
    // Fazer requisição para o microserviço de pagamentos
    const usuariosResponse = await axios.get(`${pagamentosApiUrl}/admin/users/list?${queryParams.toString()}`, {
      headers: {
        'Authorization': `ApiKey ${pagamentosApiKey}`
      },
      timeout: 8000 // 8 segundos de timeout para não bloquear a UI
    });
    
    console.log(`API /usuarios - Resposta do microserviço de pagamentos: status=${usuariosResponse.status}`);
    
    // Dados base dos usuários
    const usuariosData = usuariosResponse.data || {};
    const usuarios = usuariosData.users || [];
    const total = usuariosData.total || 0;
    
    // Mapear os dados para o formato esperado pelo frontend
    let usuariosMapeados = usuarios.map((user: any) => ({
      id: user.id,
      nome: user.name || 'Sem nome',
      email: user.email,
      telefone: user.phone || 'Não informado',
      tipo: user.role || 'cliente',
      ativo: user.active !== undefined ? user.active : true,
      data_criacao: user.created_at,
      ultimo_acesso: user.last_login || null,
      total_gasto: 0, // Será preenchido com dados do microserviço de orders
      total_pedidos: 0, // Será preenchido com dados do microserviço de orders
      ultimo_pedido: null, // Será preenchido com dados do microserviço de orders
      servicos_usados: [] // Será preenchido com dados do microserviço de orders
    }));
    
    // Se houver usuários, buscar informações complementares de pedidos
    if (usuariosMapeados.length > 0) {
      try {
        // Obter os emails de todos os usuários
        const emails = usuariosMapeados.map(user => user.email);
        
        console.log(`API /usuarios - Buscando informações de pedidos para ${emails.length} usuários`);
        
        // Buscar estatísticas de pedidos de todos os usuários
        const pedidosResponse = await axios.post(`${ordersApiUrl}/stats/users/orders`, {
          emails: emails
        }, {
          headers: {
            'Authorization': `Bearer ${ordersApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000 // 8 segundos de timeout
        });
        
        console.log(`API /usuarios - Resposta do microserviço de orders: status=${pedidosResponse.status}`);
        
        // Dados de pedidos por email
        const pedidosPorEmail = pedidosResponse.data || {};
        
        // Complementar os dados de usuários com as informações de pedidos
        usuariosMapeados = usuariosMapeados.map(usuario => {
          const dadosPedidos = pedidosPorEmail[usuario.email] || {};
          
          return {
            ...usuario,
            total_gasto: dadosPedidos.total_gasto || 0,
            total_pedidos: dadosPedidos.total_pedidos || 0,
            ultimo_pedido: dadosPedidos.ultimo_pedido || null,
            servicos_usados: dadosPedidos.servicos || []
          };
        });
      } catch (ordersError) {
        console.error('API /usuarios - Erro ao buscar dados de pedidos:', ordersError);
        // Continuar mesmo se não conseguir buscar dados de pedidos
      }
    }
    
    console.log(`API /usuarios - Retornando ${usuariosMapeados.length} usuários`);
    
    // Retornar os dados completos
    return res.status(200).json({
      usuarios: usuariosMapeados,
      total: total,
      pagina: parseInt(pagina as string),
      limite: parseInt(limite as string),
      paginas: Math.ceil(total / parseInt(limite as string))
    });
  } catch (error) {
    console.error('API /usuarios - Erro ao buscar dados dos microserviços:', error);
    
    // Detalhes do erro para logging
    if (error instanceof Error) {
      console.error(`API /usuarios - Mensagem: ${error.message}`);
      if (axios.isAxiosError(error)) {
        console.error(`API /usuarios - Status: ${error.response?.status}`);
        console.error(`API /usuarios - Dados: ${JSON.stringify(error.response?.data)}`);
      }
    }
    
    // Retornar erro 500 - Agora sem fallback para dados mockados
    return res.status(500).json({ 
      error: 'Erro ao buscar dados dos usuários',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 