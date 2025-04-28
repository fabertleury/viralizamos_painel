import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pedidos
let ordersPool;
try {
  console.log('Conectando ao banco de dados de pedidos (ORDERS_DATABASE_URL):', 
             process.env.ORDERS_DATABASE_URL?.substring(0, 35) + '...');
  
  ordersPool = new Pool({
    connectionString: process.env.ORDERS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Verificar conexão
  ordersPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados de pedidos:', err.message);
    } else {
      console.log('Conexão com banco de dados de pedidos estabelecida com sucesso!');
    }
  });
} catch (error) {
  console.error('Erro ao inicializar pool de conexão de pedidos:', error);
  ordersPool = {
    query: () => Promise.reject(new Error('Conexão de banco de dados não disponível'))
  };
}

// Conexão com o banco de dados de pagamentos
let pagamentosPool;
try {
  console.log('Conectando ao banco de dados de pagamentos (PAGAMENTOS_DATABASE_URL):', 
             process.env.PAGAMENTOS_DATABASE_URL?.substring(0, 35) + '...');
  
  pagamentosPool = new Pool({
    connectionString: process.env.PAGAMENTOS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Verificar conexão
  pagamentosPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados de pagamentos:', err.message);
    } else {
      console.log('Conexão com banco de dados de pagamentos estabelecida com sucesso!');
    }
  });
} catch (error) {
  console.error('Erro ao inicializar pool de conexão de pagamentos:', error);
  pagamentosPool = {
    query: () => Promise.reject(new Error('Conexão de banco de dados não disponível'))
  };
}

// Conexão com o banco de dados principal
let mainPool;
try {
  console.log('Conectando ao banco de dados principal (DATABASE_URL):', 
             process.env.DATABASE_URL?.substring(0, 35) + '...');
  
  mainPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Verificar conexão
  mainPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados principal:', err.message);
    } else {
      console.log('Conexão com banco de dados principal estabelecida com sucesso!');
    }
  });
} catch (error) {
  console.error('Erro ao inicializar pool de conexão principal:', error);
  mainPool = {
    query: () => Promise.reject(new Error('Conexão de banco de dados não disponível'))
  };
}

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
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as pedidos_concluidos,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pedidos_pendentes,
        SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as pedidos_cancelados,
        SUM(amount) as valor_total_pedidos
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
    
    // Garantir que valores sejam tratados como números
    const valorTotal = parseFloat(dadosAtual.valor_total_pedidos || '0');
    
    console.log('Estatísticas de pedidos reais:', { 
      total: totalAtual, 
      concluidos: parseInt(dadosAtual.pedidos_concluidos || '0'),
      pendentes: parseInt(dadosAtual.pedidos_pendentes || '0'),
      cancelados: parseInt(dadosAtual.pedidos_cancelados || '0'),
      valorTotal,
      crescimento
    });
    
    return {
      total: totalAtual,
      concluidos: parseInt(dadosAtual.pedidos_concluidos || '0'),
      pendentes: parseInt(dadosAtual.pedidos_pendentes || '0'),
      cancelados: parseInt(dadosAtual.pedidos_cancelados || '0'),
      valorTotal: valorTotal,
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    // Retorna valores zero em caso de erro
    return {
      total: 0,
      concluidos: 0,
      pendentes: 0,
      cancelados: 0,
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
      FROM "transactions"
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    // Dados do mês anterior
    const queryAnterior = `
      SELECT COUNT(*) as total_mes_anterior
      FROM "transactions"
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
    
    // Usar parseFloat para garantir que o valor é tratado como número de ponto flutuante
    const valorTotal = parseFloat(dadosAtual.valor_total_aprovado || '0');
    
    console.log('Estatísticas de transações reais:', { 
      total: totalAtual, 
      aprovadas: parseInt(dadosAtual.total_aprovadas || '0'),
      pendentes: parseInt(dadosAtual.total_pendentes || '0'),
      recusadas: parseInt(dadosAtual.total_recusadas || '0'),
      valorTotal,
      crescimento
    });
    
    return {
      total: totalAtual,
      aprovadas: parseInt(dadosAtual.total_aprovadas || '0'),
      pendentes: parseInt(dadosAtual.total_pendentes || '0'),
      recusadas: parseInt(dadosAtual.total_recusadas || '0'),
      valorTotal: valorTotal,
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de transações:', error);
    // Retorna valores zero em caso de erro
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
    // Consulta para obter o total de usuários distintos dos pedidos
    const totalQuery = `
      SELECT COUNT(DISTINCT user_id) as total
      FROM "Order"
      WHERE user_id IS NOT NULL
    `;
    
    // Consulta para obter usuários novos nos últimos 30 dias (real)
    const novosQuery = `
      SELECT COUNT(DISTINCT user_id) as novos
      FROM "Order"
      WHERE created_at >= NOW() - INTERVAL '30 days'
      AND user_id IS NOT NULL
    `;
    
    // Consulta para obter usuários no mês anterior para calcular crescimento
    const mesAnteriorQuery = `
      SELECT COUNT(DISTINCT user_id) as total_mes_anterior
      FROM "Order"
      WHERE created_at >= NOW() - INTERVAL '60 days' 
      AND created_at < NOW() - INTERVAL '30 days'
      AND user_id IS NOT NULL
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
    
    console.log('Estatísticas de usuários reais:', { total, novos, crescimento });
    
    return {
      total,
      novos,
      crescimento
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    
    // Retorna valores zero em caso de erro
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
        SUM(amount) as valor_total
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
    
    // Garantir que os valores são tratados como números
    const pedidos = result.rows.map(row => ({
      data: row.data.toISOString().split('T')[0],
      total: parseInt(row.total || '0'),
      valorTotal: parseFloat(row.valor_total || '0')
    }));
    
    console.log(`Pedidos por período (${dias} dias):`, pedidos);
    
    return pedidos;
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
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as total_aprovadas,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as total_rejeitadas,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pendentes,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_aprovado,
        SUM(amount) as valor_total
      FROM 
        "transactions"
      WHERE 
        created_at >= CURRENT_DATE - INTERVAL '${dias - 1} days'
        AND created_at <= CURRENT_DATE + INTERVAL '1 day'
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    const result = await pagamentosPool.query(query);
    
    // Garantir que estamos tratando os valores como números de ponto flutuante
    const transacoes = result.rows.map(row => ({
      data: row.data.toISOString().split('T')[0],
      total: parseInt(row.total || '0'),
      totalAprovadas: parseInt(row.total_aprovadas || '0'),
      totalRejeitadas: parseInt(row.total_rejeitadas || '0'),
      totalPendentes: parseInt(row.total_pendentes || '0'),
      valorAprovado: parseFloat(row.valor_aprovado || '0'),
      valorTotal: parseFloat(row.valor_total || '0')
    }));
    
    console.log(`Transações por período (${dias} dias):`, transacoes);
    
    return transacoes;
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
        o.customer_name as usuario,
        o.service_id as item,
        o.status,
        o.amount as valor
      FROM 
        "Order" o
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
        null as usuario,
        t.payment_request_id as item,
        t.status,
        t.amount as valor
      FROM 
        "transactions" t
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
      item: `Serviço #${p.item}` || 'Pedido ' + p.id,
      status: mapearStatus(p.status),
      valor: parseFloat(p.valor || '0')
    }));
    
    // Processar transações
    const transacoes = transacoesResult.rows.map(t => ({
      id: t.id,
      tipo: t.tipo,
      data: t.data.toISOString(),
      usuario: 'Cliente', // Valor padrão já que não temos join com a tabela de usuários
      item: t.valor ? `R$ ${parseFloat(t.valor).toFixed(2)}` : 'Transação ' + t.id,
      status: mapearStatus(t.status),
      valor: parseFloat(t.valor || '0')
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

async function obterEstatisticasDoDia() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_aprovadas,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_recusadas,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_total_aprovado,
        SUM(amount) as valor_total
      FROM "transactions"
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    
    const result = await pagamentosPool.query(query);
    const dados = result.rows[0];
    
    return {
      total: parseInt(dados.total_transacoes || '0'),
      aprovadas: parseInt(dados.total_aprovadas || '0'),
      pendentes: parseInt(dados.total_pendentes || '0'),
      recusadas: parseInt(dados.total_recusadas || '0'),
      valorTotal: parseFloat(dados.valor_total || '0'),
      valorAprovado: parseFloat(dados.valor_total_aprovado || '0')
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas do dia:', error);
    return {
      total: 0,
      aprovadas: 0,
      pendentes: 0,
      recusadas: 0,
      valorTotal: 0,
      valorAprovado: 0
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }
  
  try {
    // Executar todas as consultas em paralelo
    const [
      estatisticasPedidos,
      estatisticasTransacoes,
      estatisticasUsuarios,
      pedidosPorPeriodo,
      transacoesPorPeriodo,
      atividadesRecentes,
      estatisticasDoDia
    ] = await Promise.all([
      obterEstatisticasPedidos(),
      obterEstatisticasTransacoes(),
      obterEstatisticasUsuarios(),
      obterPedidosPorPeriodo(),
      obterTransacoesPorPeriodo(),
      obterAtividadesRecentes(),
      obterEstatisticasDoDia()
    ]);
    
    // Construir resposta
    const response = {
      estatisticas: {
        transacoes: {
          total: estatisticasTransacoes.total,
          crescimento: estatisticasTransacoes.crescimento,
          valorTotal: estatisticasTransacoes.valorTotal,
          hoje: {
            total: estatisticasDoDia.total,
            valorTotal: estatisticasDoDia.valorTotal,
            valorAprovado: estatisticasDoDia.valorAprovado
          }
        },
        pedidos: {
          total: estatisticasPedidos.total,
          crescimento: estatisticasPedidos.crescimento,
          completados: estatisticasPedidos.concluidos,
          pendentes: estatisticasPedidos.pendentes,
          falhas: estatisticasPedidos.cancelados
        },
        usuarios: {
          total: estatisticasUsuarios.total,
          crescimento: estatisticasUsuarios.crescimento,
          novos: estatisticasUsuarios.novos
        }
      },
      graficos: {
        transacoesPorDia: transacoesPorPeriodo,
        pedidosPorDia: pedidosPorPeriodo,
        statusPedidos: {
          labels: ['Completados', 'Pendentes', 'Falhas'],
          dados: [
            estatisticasPedidos.concluidos,
            estatisticasPedidos.pendentes,
            estatisticasPedidos.cancelados
          ]
        }
      },
      atividades: atividadesRecentes,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao processar requisição do dashboard:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 