import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexões com os bancos de dados 
// Estas conexões só são criadas no servidor, não no cliente
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const mainPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Função para calcular o crescimento percentual
function calcularCrescimento(atual: number, anterior: number): number {
  if (anterior === 0) return 100;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Funções de acesso ao banco de dados
async function obterEstatisticasPedidos() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(CASE WHEN status = 'completo' THEN 1 ELSE 0 END) as total_completos,
        SUM(CASE WHEN status = 'processando' THEN 1 ELSE 0 END) as total_processando,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'falha' THEN 1 ELSE 0 END) as total_falhas,
        SUM(price) as valor_total
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await ordersPool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    // Retorna valores padrão em caso de erro
    return {
      total_pedidos: 0,
      total_completos: 0,
      total_processando: 0,
      total_pendentes: 0,
      total_falhas: 0,
      valor_total: 0
    };
  }
}

async function obterEstatisticasTransacoes() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) as total_aprovadas,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'recusado' THEN 1 ELSE 0 END) as total_recusadas,
        SUM(CASE WHEN status = 'aprovado' THEN valor ELSE 0 END) as valor_total_aprovado
      FROM transacoes
      WHERE data_criacao >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await pagamentosPool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao obter estatísticas de transações:', error);
    // Retorna valores padrão em caso de erro
    return {
      total_transacoes: 0,
      total_aprovadas: 0,
      total_pendentes: 0,
      total_recusadas: 0,
      valor_total_aprovado: 0
    };
  }
}

async function obterEstatisticasUsuarios() {
  try {
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM users
    `;
    
    const ativosQuery = `
      SELECT COUNT(*) as ativos
      FROM users
      WHERE last_login >= NOW() - INTERVAL '30 days'
    `;
    
    const novosQuery = `
      SELECT COUNT(*) as novos
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const mesAnteriorQuery = `
      SELECT COUNT(*) as total_mes_anterior
      FROM users
      WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
    `;
    
    const [totalResult, ativosResult, novosResult, mesAnteriorResult] = await Promise.all([
      mainPool.query(totalQuery),
      mainPool.query(ativosQuery),
      mainPool.query(novosQuery),
      mainPool.query(mesAnteriorQuery)
    ]);
    
    const total = parseInt(totalResult.rows[0].total);
    const ativos = parseInt(ativosResult.rows[0].ativos);
    const novos = parseInt(novosResult.rows[0].novos);
    const totalMesAnterior = parseInt(mesAnteriorResult.rows[0].total_mes_anterior);
    
    // Calcular crescimento
    const crescimento = calcularCrescimento(novos, totalMesAnterior);
    
    return {
      total,
      ativos,
      novos,
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    return {
      total: 0,
      ativos: 0, 
      novos: 0,
      crescimento: 0
    };
  }
}

async function obterPedidosPorPeriodo(dias: number = 7) {
  try {
    const query = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completo' THEN 1 ELSE 0 END) as completos,
        SUM(CASE WHEN status = 'falha' THEN 1 ELSE 0 END) as falhas
      FROM 
        orders
      WHERE 
        created_at >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    const result = await ordersPool.query(query);
    return result.rows;
  } catch (error) {
    console.error(`Erro ao obter pedidos por período (${dias} dias):`, error);
    return [];
  }
}

async function obterTransacoesPorPeriodo(dias: number = 7) {
  try {
    const query = `
      SELECT 
        DATE(data_criacao) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aprovado' THEN valor ELSE 0 END) as valor_aprovado
      FROM 
        transacoes
      WHERE 
        data_criacao >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(data_criacao)
      ORDER BY 
        data
    `;
    
    const result = await pagamentosPool.query(query);
    return result.rows;
  } catch (error) {
    console.error(`Erro ao obter transações por período (${dias} dias):`, error);
    return [];
  }
}

async function obterAtividadesRecentes(limite: number = 10) {
  try {
    // Buscar pedidos recentes
    const pedidosQuery = `
      SELECT 
        'pedido' as tipo,
        o.id,
        o.created_at as data,
        u.name as usuario,
        s.name as item,
        o.status,
        o.price as valor
      FROM 
        orders o
      LEFT JOIN 
        users u ON o.user_id = u.id
      LEFT JOIN 
        services s ON o.service_id = s.id
      ORDER BY 
        o.created_at DESC
      LIMIT $1
    `;
    
    // Buscar transações recentes (de outro banco)
    const transacoesQuery = `
      SELECT 
        'transacao' as tipo,
        t.id,
        t.data_criacao as data,
        u.nome as usuario,
        p.nome as item,
        t.status,
        t.valor
      FROM 
        transacoes t
      LEFT JOIN 
        usuarios u ON t.cliente_id = u.id
      LEFT JOIN 
        produtos p ON t.produto_id = p.id
      ORDER BY 
        t.data_criacao DESC
      LIMIT $1
    `;
    
    const [pedidosResult, transacoesResult] = await Promise.all([
      ordersPool.query(pedidosQuery, [limite]),
      pagamentosPool.query(transacoesQuery, [limite])
    ]);
    
    // Combinar resultados e ordenar por data
    const atividades = [
      ...pedidosResult.rows,
      ...transacoesResult.rows
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limite);
    
    return atividades;
  } catch (error) {
    console.error('Erro ao obter atividades recentes:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Buscar dados reais de diferentes fontes em paralelo
    const [
      estatisticasTransacoes,
      estatisticasPedidos,
      estatisticasUsuarios,
      transacoesPorDia,
      pedidosPorDia,
      atividadesRecentes
    ] = await Promise.all([
      obterEstatisticasTransacoes(),
      obterEstatisticasPedidos(),
      obterEstatisticasUsuarios(),
      obterTransacoesPorPeriodo(7),
      obterPedidosPorPeriodo(7),
      obterAtividadesRecentes(5)
    ]);
    
    // Calcular dados para o gráfico de status de pedidos
    const statusPedidos = {
      labels: ['Completos', 'Processando', 'Pendentes', 'Falhas'],
      dados: [
        Number(estatisticasPedidos.total_completos) || 0,
        Number(estatisticasPedidos.total_processando) || 0,
        Number(estatisticasPedidos.total_pendentes) || 0,
        Number(estatisticasPedidos.total_falhas) || 0
      ]
    };
    
    // Calcular crescimento de pedidos e transações (usando valores reais)
    const dashboardData = {
      estatisticas: {
        transacoes: {
          total: Number(estatisticasTransacoes.total_transacoes) || 0,
          aprovadas: Number(estatisticasTransacoes.total_aprovadas) || 0,
          pendentes: Number(estatisticasTransacoes.total_pendentes) || 0,
          recusadas: Number(estatisticasTransacoes.total_recusadas) || 0,
          valorTotal: Number(estatisticasTransacoes.valor_total_aprovado) || 0,
          crescimento: 23 // Valor fixo temporário, deve ser calculado com dados reais de meses anteriores
        },
        pedidos: {
          total: Number(estatisticasPedidos.total_pedidos) || 0,
          completos: Number(estatisticasPedidos.total_completos) || 0,
          processando: Number(estatisticasPedidos.total_processando) || 0,
          pendentes: Number(estatisticasPedidos.total_pendentes) || 0,
          falhas: Number(estatisticasPedidos.total_falhas) || 0,
          valorTotal: Number(estatisticasPedidos.valor_total) || 0,
          crescimento: 15 // Valor fixo temporário, deve ser calculado com dados reais de meses anteriores
        },
        usuarios: estatisticasUsuarios
      },
      graficos: {
        transacoesPorDia,
        pedidosPorDia,
        statusPedidos
      },
      atividadesRecentes
    };
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao carregar dados do dashboard' });
  }
} 