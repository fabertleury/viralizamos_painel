import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwtToken } from '../../../../utils/auth';
import { buscarUsuarioPorId } from '../../../../services/usuariosService';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurar o pool de conexão para o banco de dados de pedidos
const ordersPool = new Pool({
  connectionString: process.env.DATABASE_URL_ORDERS,
});

// Inicializar o pool e testar a conexão
ordersPool.on('error', (err) => {
  console.error('Erro inesperado no pool de pedidos', err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const token = authHeader.substring(7);
  const tokenData = await verifyJwtToken(token);

  if (!tokenData) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  // Verificar se o usuário tem permissão de administrador
  if (tokenData.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID de usuário inválido' });
  }

  // Apenas permitir requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  console.log(`[${new Date().toISOString()}] Iniciando busca de detalhes do usuário`);
  
  try {
    console.log(`[${new Date().toISOString()}] Buscando detalhes do usuário ID: ${id}`);

    // Buscar detalhes do usuário da tabela de pedidos
    const userQuery = `
      SELECT 
        customer_name as nome,
        customer_email as email,
        customer_phone as telefone,
        'cliente' as tipo,
        true as ativo,
        MIN(created_at) as data_criacao,
        MAX(created_at) as ultimo_acesso
      FROM "Order"
      WHERE customer_name IS NOT NULL
      AND customer_email IS NOT NULL
      AND customer_email = $1
      GROUP BY customer_name, customer_email, customer_phone
    `;

    const userResult = await ordersPool.query(userQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const usuario = userResult.rows[0];

    // Buscar estatísticas do usuário
    const statsQuery = `
      SELECT 
        COUNT(*) as total_pedidos,
        COALESCE(SUM(total_amount), 0) as total_gasto,
        MAX(created_at) as ultimo_pedido
      FROM "Order"
      WHERE customer_email = $1
    `;

    const statsResult = await ordersPool.query(statsQuery, [id]);
    const stats = statsResult.rows[0];

    // Buscar serviços mais utilizados por este usuário
    const servicosQuery = `
      SELECT 
        provider_name as servico,
        COUNT(*) as total
      FROM "Order"
      WHERE customer_email = $1
      AND provider_name IS NOT NULL
      GROUP BY provider_name
      ORDER BY total DESC
      LIMIT 5
    `;

    const servicosResult = await ordersPool.query(servicosQuery, [id]);
    const servicos = servicosResult.rows.map(row => row.servico);

    // Combinar os dados
    const usuarioCompleto = {
      ...usuario,
      id: id, // Usar o e-mail como ID
      total_pedidos: parseInt(stats.total_pedidos) || 0,
      total_gasto: parseFloat(stats.total_gasto) || 0,
      ultimo_pedido: stats.ultimo_pedido || null,
      servicos_usados: servicos || []
    };

    console.log(`[${new Date().toISOString()}] Detalhes do usuário encontrados com sucesso`);
    
    return res.status(200).json(usuarioCompleto);
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar detalhes do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 