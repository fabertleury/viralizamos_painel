import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Conexão com o banco de dados de orders
let ordersPool;
try {
  console.log('Inicializando pool de conexão para Orders DB...');
  
  if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    ordersPool = new Pool({
      connectionString: process.env.DATABASE_URL_ORDERS || process.env.ORDERS_DATABASE_URL,
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

    // Verificar e recriar o pool de conexão se necessário
    if (!ordersPool) {
      console.log('API /usuarios - Tentando reinicializar o pool de conexão...');
      try {
        ordersPool = new Pool({
          connectionString: process.env.DATABASE_URL_ORDERS || process.env.ORDERS_DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
      } catch (poolError) {
        throw new Error(`Falha ao reinicializar o pool de conexão: ${poolError.message}`);
      }
    }

    // Construir query básica
    let queryUsuariosBase = `
      SELECT DISTINCT ON (customer_email)
        id,
        customer_email as email,
        customer_name as nome,
        customer_phone as telefone,
        'cliente' as tipo,
        true as ativo,
        MIN(created_at) as data_criacao
      FROM "Order"
      WHERE customer_email IS NOT NULL AND customer_email != ''
    `;
    
    let countQueryBase = `
      SELECT COUNT(DISTINCT customer_email) as total
      FROM "Order"
      WHERE customer_email IS NOT NULL AND customer_email != ''
    `;
    
    // Adicionar filtros se necessário
    const queryParams = [];
    let whereConditions = [];
    
    // Filtrar por termo de busca
    if (termoBusca) {
      queryParams.push(`%${termoBusca}%`);
      whereConditions.push(`(customer_name ILIKE $${queryParams.length} OR customer_email ILIKE $${queryParams.length})`);
    }
    
    // Adicionar condições WHERE se existirem
    if (whereConditions.length > 0) {
      queryUsuariosBase += ` AND ${whereConditions.join(' AND ')}`;
      countQueryBase += ` AND ${whereConditions.join(' AND ')}`;
    }
    
    // Finalizar a query principal
    const queryUsuarios = `
      ${queryUsuariosBase}
      GROUP BY id, customer_email, customer_name, customer_phone
      ORDER BY customer_email
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    // Calcular offset para paginação
    const offset = (parseInt(pagina as string) - 1) * parseInt(limite as string);
    queryParams.push(limite as string);
    queryParams.push(offset.toString());

    console.log('API /usuarios - Executando query para buscar usuários...');
    console.log('Query:', queryUsuarios);
    console.log('Params:', queryParams);

    // Buscar usuários e contagem total em paralelo
    const [resultUsuarios, resultContagem] = await Promise.all([
      ordersPool.query(queryUsuarios, queryParams),
      ordersPool.query(countQueryBase, queryParams.slice(0, queryParams.length - 2))
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
            COALESCE(SUM(amount), 0) as total_gasto,
            MAX(created_at) as ultimo_pedido
          FROM "Order"
          WHERE customer_email = $1
        `;

        // Buscar serviços mais usados
        const queryServicos = `
          SELECT 
            COALESCE(service_name, provider_name) as servico_nome, 
            COUNT(*) as quantidade
          FROM "Order"
          WHERE customer_email = $1 
            AND (service_name IS NOT NULL OR provider_name IS NOT NULL)
          GROUP BY servico_nome
          ORDER BY quantidade DESC
          LIMIT 3
        `;

        const [resultEstatisticas, resultServicos] = await Promise.all([
          ordersPool.query(queryEstatisticas, [usuario.email]),
          ordersPool.query(queryServicos, [usuario.email])
        ]);

        const estatisticas = resultEstatisticas.rows[0];
        const servicos = resultServicos.rows.map(row => row.servico_nome);

        return {
          ...usuario,
          total_pedidos: parseInt(estatisticas.total_pedidos || '0'),
          total_gasto: parseFloat(estatisticas.total_gasto || '0'),
          ultimo_pedido: estatisticas.ultimo_pedido,
          servicos_usados: servicos
        };
      } catch (error) {
        console.error(`Erro ao buscar estatísticas para usuário ${usuario.email}:`, error);
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
    
    return res.status(500).json({
      message: 'Erro ao buscar usuários',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
} 