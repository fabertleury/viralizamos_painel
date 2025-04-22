import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Pool } from 'pg';

// Conexão com o banco de dados de orders
let ordersPool;
try {
  console.log('Inicializando pool de conexão para Orders DB...');
  
  if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    ordersPool = new Pool({
      connectionString: process.env.ORDERS_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
} catch (error) {
  console.error('Erro ao inicializar pool de conexão orders:', error);
  ordersPool = null;
}

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

    // Consultar usuários diretamente do banco de dados orders
    if (!ordersPool) {
      throw new Error('Pool de conexão orders não inicializado');
    }

    // Começar a buscar os usuários do banco de dados orders
    console.log('API /usuarios - Buscando usuários do banco orders...');

    // Query para buscar usuários únicos do banco de pedidos
    const queryUsuarios = `
      SELECT DISTINCT ON (o.user_id)
        o.user_id as id,
        o.customer_name as nome,
        o.customer_email as email,
        o.customer_phone as telefone,
        'cliente' as tipo,
        true as ativo,
        MIN(o.created_at) as data_criacao
      FROM "Order" o
      WHERE o.user_id IS NOT NULL AND o.customer_email IS NOT NULL
      GROUP BY o.user_id, o.customer_name, o.customer_email, o.customer_phone
      ORDER BY o.user_id
      LIMIT $1 OFFSET $2
    `;

    // Query para contar total de usuários únicos
    const queryContagem = `
      SELECT COUNT(DISTINCT user_id) as total
      FROM "Order"
      WHERE user_id IS NOT NULL AND customer_email IS NOT NULL
    `;

    // Calcular offset para paginação
    const offset = (parseInt(pagina as string) - 1) * parseInt(limite as string);

    // Buscar usuários e contagem total em paralelo
    const [resultUsuarios, resultContagem] = await Promise.all([
      ordersPool.query(queryUsuarios, [limite, offset]),
      ordersPool.query(queryContagem)
    ]);

    const usuarios = resultUsuarios.rows;
    const total = parseInt(resultContagem.rows[0].total);

    console.log(`API /usuarios - Encontrados ${usuarios.length} usuários de um total de ${total}`);

    // Para cada usuário, buscar estatísticas de pedidos
    const usuariosComEstatisticas = await Promise.all(usuarios.map(async (usuario) => {
      try {
        // Buscar total de pedidos e valor total
        const queryEstatisticas = `
          SELECT 
            COUNT(*) as total_pedidos,
            SUM(amount) as total_gasto,
            MAX(created_at) as ultimo_pedido
          FROM "Order"
          WHERE user_id = $1
        `;

        // Buscar serviços mais usados
        const queryServicos = `
          SELECT service_name, COUNT(*) as quantidade
          FROM "Order"
          WHERE user_id = $1 AND service_name IS NOT NULL
          GROUP BY service_name
          ORDER BY quantidade DESC
          LIMIT 3
        `;

        const [resultEstatisticas, resultServicos] = await Promise.all([
          ordersPool.query(queryEstatisticas, [usuario.id]),
          ordersPool.query(queryServicos, [usuario.id])
        ]);

        const estatisticas = resultEstatisticas.rows[0];
        const servicos = resultServicos.rows.map(row => row.service_name);

        return {
          ...usuario,
          total_pedidos: parseInt(estatisticas.total_pedidos || '0'),
          total_gasto: parseFloat(estatisticas.total_gasto || '0'),
          ultimo_pedido: estatisticas.ultimo_pedido,
          servicos_usados: servicos
        };
      } catch (error) {
        console.error(`Erro ao buscar estatísticas para usuário ${usuario.id}:`, error);
        return {
          ...usuario,
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: null,
          servicos_usados: []
        };
      }
    }));

    console.log(`API /usuarios - Retornando ${usuariosComEstatisticas.length} usuários com estatísticas`);
    
    // Retornar os dados completos
    return res.status(200).json({
      usuarios: usuariosComEstatisticas,
      total: total,
      pagina: parseInt(pagina as string),
      limite: parseInt(limite as string),
      paginas: Math.ceil(total / parseInt(limite as string))
    });
  } catch (error) {
    console.error('API /usuarios - Erro ao buscar dados:', error);
    
    if (error instanceof Error) {
      console.error(`API /usuarios - Mensagem: ${error.message}`);
    }
    
    // Dados mockados para desenvolvimento/teste em caso de erro
    console.log('API /usuarios - Retornando dados mockados como fallback');
    
    const mockUsuarios = [
      {
        id: '1',
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        telefone: '(11) 98765-4321',
        tipo: 'cliente',
        ativo: true,
        data_criacao: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        ultimo_acesso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_gasto: 1250,
        total_pedidos: 8,
        ultimo_pedido: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        servicos_usados: ['Instagram Seguidores', 'Instagram Curtidas']
      },
      {
        id: '2',
        nome: 'João Santos',
        email: 'joao@exemplo.com',
        telefone: '(21) 97654-3210',
        tipo: 'cliente',
        ativo: true,
        data_criacao: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        ultimo_acesso: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        total_gasto: 950,
        total_pedidos: 5,
        ultimo_pedido: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        servicos_usados: ['Instagram Seguidores', 'TikTok Visualizações']
      },
      {
        id: '3',
        nome: 'Ana Costa',
        email: 'ana@exemplo.com',
        telefone: '(31) 96543-2109',
        tipo: 'admin',
        ativo: true,
        data_criacao: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        ultimo_acesso: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
        total_gasto: 0,
        total_pedidos: 0,
        ultimo_pedido: null,
        servicos_usados: []
      }
    ];
    
    return res.status(200).json({ 
      usuarios: mockUsuarios,
      total: mockUsuarios.length,
      pagina: parseInt(req.query.pagina as string || '1'),
      limite: parseInt(req.query.limite as string || '10'),
      paginas: 1
    });
  }
} 