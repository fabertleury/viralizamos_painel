import { prisma, ordersPool, pagamentosPool, calcularCrescimento } from '../../lib/prisma';

// Funções auxiliares para buscar dados de estatísticas
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
    // Busca total de usuários
    const totalUsuarios = await prisma.user.count();
    
    // Busca usuários ativos (que fizeram login nos últimos 30 dias)
    const ativos = await prisma.user.count({
      where: {
        lastLogin: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Busca novos usuários (criados nos últimos 30 dias)
    const hoje = new Date();
    const ha30Dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ha60Dias = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const novos = await prisma.user.count({
      where: {
        createdAt: {
          gte: ha30Dias
        }
      }
    });
    
    // Busca usuários criados no período anterior (60-30 dias atrás) para calcular crescimento
    const anteriores = await prisma.user.count({
      where: {
        createdAt: {
          gte: ha60Dias,
          lt: ha30Dias
        }
      }
    });
    
    // Calcular crescimento
    const crescimento = calcularCrescimento(novos, anteriores);
    
    return {
      total: totalUsuarios,
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

async function obterPedidosPorPeriodo(dias = 7) {
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

async function obterTransacoesPorPeriodo(dias = 7) {
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

async function obterAtividadesRecentes(limite = 10) {
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
    
    // Buscar transações recentes
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

export const dashboardResolvers = {
  Query: {
    dadosDashboard: async () => {
      try {
        // Buscar dados de diferentes fontes em paralelo
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
        
        // Calcular crescimentos (temporário)
        const crescimentoTransacoes = 23; // Valor fixo temporário  
        const crescimentoPedidos = 15; // Valor fixo temporário
        
        return {
          estatisticas: {
            transacoes: {
              total: Number(estatisticasTransacoes.total_transacoes) || 0,
              aprovadas: Number(estatisticasTransacoes.total_aprovadas) || 0,
              pendentes: Number(estatisticasTransacoes.total_pendentes) || 0,
              recusadas: Number(estatisticasTransacoes.total_recusadas) || 0,
              valorTotal: Number(estatisticasTransacoes.valor_total_aprovado) || 0,
              crescimento: crescimentoTransacoes
            },
            pedidos: {
              total: Number(estatisticasPedidos.total_pedidos) || 0,
              completos: Number(estatisticasPedidos.total_completos) || 0,
              processando: Number(estatisticasPedidos.total_processando) || 0,
              pendentes: Number(estatisticasPedidos.total_pendentes) || 0,
              falhas: Number(estatisticasPedidos.total_falhas) || 0,
              valorTotal: Number(estatisticasPedidos.valor_total) || 0,
              crescimento: crescimentoPedidos
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
      } catch (error) {
        console.error('Erro ao obter dados do dashboard:', error);
        throw new Error('Erro ao carregar dados do dashboard');
      }
    }
  }
}; 