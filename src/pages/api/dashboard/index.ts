import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pedidos
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Conexão com o banco de dados principal
const mainPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Função para calcular o crescimento percentual
function calcularCrescimento(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Funções de acesso ao banco de dados
async function obterEstatisticasPedidos() {
  try {
    // Dados do mês atual
    const queryAtual = `
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completos,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as total_processando,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_falhas,
        SUM(amount) as valor_total
      FROM "Order"
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    // Dados do mês anterior
    const queryAnterior = `
      SELECT COUNT(*) as total_mes_anterior
      FROM "Order"
      WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
    `;
    
    const [resultAtual, resultAnterior] = await Promise.all([
      ordersPool.query(queryAtual),
      ordersPool.query(queryAnterior)
    ]);
    
    const dadosAtual = resultAtual.rows[0];
    const totalAnterior = parseInt(resultAnterior.rows[0].total_mes_anterior || '0');
    const totalAtual = parseInt(dadosAtual.total_pedidos || '0');
    
    // Calcular crescimento
    const crescimento = calcularCrescimento(totalAtual, totalAnterior);
    
    return {
      total: totalAtual,
      completados: parseInt(dadosAtual.total_completos || '0'),
      processando: parseInt(dadosAtual.total_processando || '0'),
      pendentes: parseInt(dadosAtual.total_pendentes || '0'),
      falhas: parseInt(dadosAtual.total_falhas || '0'),
      valorTotal: parseInt(dadosAtual.valor_total || '0'),
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    // Retorna valores padrão em caso de erro
    return {
      total: 0,
      completados: 0,
      processando: 0,
      pendentes: 0,
      falhas: 0,
      valorTotal: 0,
      crescimento: 0
    };
  }
}

async function obterEstatisticasTransacoes() {
  try {
    // Dados do mês atual
    const queryAtual = `
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_aprovadas,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_recusadas,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_total_aprovado
      FROM "Transaction"
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    // Dados do mês anterior
    const queryAnterior = `
      SELECT COUNT(*) as total_mes_anterior
      FROM "Transaction"
      WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
    `;
    
    const [resultAtual, resultAnterior] = await Promise.all([
      pagamentosPool.query(queryAtual),
      pagamentosPool.query(queryAnterior)
    ]);
    
    const dadosAtual = resultAtual.rows[0];
    const totalAnterior = parseInt(resultAnterior.rows[0].total_mes_anterior || '0');
    const totalAtual = parseInt(dadosAtual.total_transacoes || '0');
    
    // Calcular crescimento
    const crescimento = calcularCrescimento(totalAtual, totalAnterior);
    
    return {
      total: totalAtual,
      aprovadas: parseInt(dadosAtual.total_aprovadas || '0'),
      pendentes: parseInt(dadosAtual.total_pendentes || '0'),
      recusadas: parseInt(dadosAtual.total_recusadas || '0'),
      valorTotal: parseInt(dadosAtual.valor_total_aprovado || '0'),
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de transações:', error);
    // Retorna valores padrão em caso de erro
    return {
      total: 0,
      aprovadas: 0,
      pendentes: 0,
      recusadas: 0,
      valorTotal: 0,
      crescimento: 0
    };
  }
}

async function obterEstatisticasUsuarios() {
  try {
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM "User"
    `;
    
    const novosQuery = `
      SELECT COUNT(*) as novos
      FROM "User"
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const mesAnteriorQuery = `
      SELECT COUNT(*) as total_mes_anterior
      FROM "User"
      WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
    `;
    
    const [totalResult, novosResult, mesAnteriorResult] = await Promise.all([
      ordersPool.query(totalQuery),
      ordersPool.query(novosQuery),
      ordersPool.query(mesAnteriorQuery)
    ]);
    
    const total = parseInt(totalResult.rows[0].total || '0');
    const novos = parseInt(novosResult.rows[0].novos || '0');
    const totalMesAnterior = parseInt(mesAnteriorResult.rows[0].total_mes_anterior || '0');
    
    // Calcular crescimento
    const crescimento = calcularCrescimento(novos, totalMesAnterior);
    
    return {
      total,
      novos,
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    return {
      total: 0,
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
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completos,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as falhas
      FROM 
        "Order"
      WHERE 
        created_at >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    const result = await ordersPool.query(query);
    return result.rows.map(row => ({
      data: row.data.toISOString().split('T')[0],
      total: parseInt(row.total || '0'),
      completos: parseInt(row.completos || '0'),
      falhas: parseInt(row.falhas || '0')
    }));
  } catch (error) {
    console.error(`Erro ao obter pedidos por período (${dias} dias):`, error);
    return [];
  }
}

async function obterTransacoesPorPeriodo(dias: number = 7) {
  try {
    const query = `
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_aprovado
      FROM 
        "Transaction"
      WHERE 
        created_at >= NOW() - INTERVAL '${dias} days'
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    const result = await pagamentosPool.query(query);
    return result.rows.map(row => ({
      data: row.data.toISOString().split('T')[0],
      total: parseInt(row.total || '0'),
      valorAprovado: parseInt(row.valor_aprovado || '0')
    }));
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
        o.service_name as item,
        o.status,
        o.amount as valor
      FROM 
        "Order" o
      LEFT JOIN 
        "User" u ON o.user_id = u.id
      ORDER BY 
        o.created_at DESC
      LIMIT $1
    `;
    
    // Buscar transações recentes
    const transacoesQuery = `
      SELECT 
        'transacao' as tipo,
        t.id,
        t.created_at as data,
        u.name as usuario,
        t.description as item,
        t.status,
        t.amount as valor
      FROM 
        "Transaction" t
      LEFT JOIN 
        "User" u ON t.user_id = u.id
      ORDER BY 
        t.created_at DESC
      LIMIT $1
    `;
    
    const [pedidosResult, transacoesResult] = await Promise.all([
      ordersPool.query(pedidosQuery, [limite]),
      pagamentosPool.query(transacoesQuery, [limite])
    ]);
    
    // Mapear status para português
    const mapearStatus = (status: string) => {
      const statusMap: {[key: string]: string} = {
        'completed': 'concluído',
        'pending': 'pendente',
        'processing': 'processando',
        'failed': 'falha',
        'approved': 'aprovado',
        'rejected': 'rejeitado'
      };
      return statusMap[status] || status;
    };
    
    // Processar pedidos
    const pedidos = pedidosResult.rows.map(p => ({
      id: p.id,
      tipo: p.tipo,
      data: p.data.toISOString(),
      usuario: p.usuario || 'Não informado',
      item: p.item || 'Pedido ' + p.id,
      status: mapearStatus(p.status),
      valor: p.valor
    }));
    
    // Processar transações
    const transacoes = transacoesResult.rows.map(t => ({
      id: t.id,
      tipo: t.tipo,
      data: t.data.toISOString(),
      usuario: t.usuario || 'Não informado',
      item: t.valor ? `R$ ${(t.valor / 100).toFixed(2)}` : 'Transação ' + t.id,
      status: mapearStatus(t.status),
      valor: t.valor
    }));
    
    // Combinar resultados e ordenar por data
    const atividades = [
      ...pedidos,
      ...transacoes
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
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Buscar dados reais de diferentes fontes em paralelo
    console.log('Buscando dados do dashboard em tempo real...');
    
    const [
      estatisticasPedidos,
      estatisticasTransacoes,
      estatisticasUsuarios,
      transacoesPorDia,
      pedidosPorStatus,
      atividadesRecentes
    ] = await Promise.all([
      obterEstatisticasPedidos(),
      obterEstatisticasTransacoes(),
      obterEstatisticasUsuarios(),
      obterTransacoesPorPeriodo(7),
      obterPedidosPorPeriodo(7),
      obterAtividadesRecentes(10)
    ]);
    
    // Calcular dados para o gráfico de status de pedidos
    const statusPedidos = {
      labels: ['Completos', 'Processando', 'Pendentes', 'Falhas'],
      dados: [
        estatisticasPedidos.completados,
        estatisticasPedidos.processando,
        estatisticasPedidos.pendentes,
        estatisticasPedidos.falhas
      ]
    };
    
    // Estruturar dados do dashboard
    const dashboardData = {
      estatisticas: {
        transacoes: {
          total: estatisticasTransacoes.total,
          crescimento: estatisticasTransacoes.crescimento,
          valorTotal: estatisticasTransacoes.valorTotal
        },
        pedidos: {
          total: estatisticasPedidos.total,
          crescimento: estatisticasPedidos.crescimento,
          completados: estatisticasPedidos.completados,
          pendentes: estatisticasPedidos.pendentes,
          falhas: estatisticasPedidos.falhas
        },
        usuarios: {
          total: estatisticasUsuarios.total,
          crescimento: estatisticasUsuarios.crescimento,
          novos: estatisticasUsuarios.novos
        }
      },
      graficos: {
        transacoesPorDia,
        statusPedidos
      },
      atividades: atividadesRecentes,
      ultimaAtualizacao: new Date().toISOString()
    };

    // Retornar os dados do dashboard
    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 