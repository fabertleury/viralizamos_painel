import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
// Conexão com o banco de dados de pedidos
const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL || 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false },
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial com o banco de dados de orders
ordersPool.on('error', (err) => {
  console.error('[API:Dashboard:Pool] Erro no pool de conexão de orders:', err.message);
});

console.log('[API:Dashboard:Init] Pool de conexão de orders inicializado com a abordagem do script de teste');

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false },
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial com o banco de dados de pagamentos
pagamentosPool.on('error', (err) => {
  console.error('[API:Dashboard:Pool] Erro no pool de conexão de pagamentos:', err.message);
});

console.log('[API:Dashboard:Init] Pool de conexão de pagamentos inicializado com a abordagem do script de teste');

// Conexão com o banco de dados principal
const mainPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5, // Reduzido para 5 conexões máximas como no script de teste
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

// Verificar conexão inicial com o banco de dados principal
mainPool.on('error', (err) => {
  console.error('[API:Dashboard:Pool] Erro no pool de conexão principal:', err.message);
});

console.log('[API:Dashboard:Init] Pool de conexão principal inicializado com a abordagem do script de teste');

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
    // Abordagem baseada no script de teste que funcionou
    // Obter a data atual no fuso horário de São Paulo
    const hoje = new Date();
    const dataHojeBrasil = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [dia, mes, ano] = dataHojeBrasil.split('/');
    const dataFormatada = `${ano}-${mes}-${dia}`;
    
    console.log(`[Dashboard] Data atual no fuso horário de São Paulo: ${dataFormatada}`);
    
    // Calcular a data de início do período (dias atrás)
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - (dias - 1));
    const dataInicioBrasil = dataInicio.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [diaInicio, mesInicio, anoInicio] = dataInicioBrasil.split('/');
    const dataInicioFormatada = `${anoInicio}-${mesInicio}-${diaInicio}`;
    
    console.log(`[Dashboard] Data de início do período: ${dataInicioFormatada}`);
    
    // Calcular a data de fim do período (amanhã)
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 1);
    const dataFimBrasil = dataFim.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [diaFim, mesFim, anoFim] = dataFimBrasil.split('/');
    const dataFimFormatada = `${anoFim}-${mesFim}-${diaFim}`;
    
    console.log(`[Dashboard] Data de fim do período: ${dataFimFormatada}`);
    
    // Primeiro, vamos obter dados para cada dia no período, incluindo dias sem transações
    // Criar um array com todas as datas no período
    const todasDatas = [];
    const dataInicioPeriodo = new Date(`${dataInicioFormatada}T00:00:00`);
    const dataAtual = new Date(`${dataFormatada}T00:00:00`);
    
    // Adicionar cada data no período ao array
    let dataLoop = new Date(dataInicioPeriodo);
    while (dataLoop <= dataAtual) {
      const dataLoopStr = dataLoop.toISOString().split('T')[0];
      todasDatas.push(dataLoopStr);
      dataLoop.setDate(dataLoop.getDate() + 1);
    }
    
    console.log(`[Dashboard] Datas no período:`, todasDatas);
    
    // Usar a abordagem que funcionou no script de teste
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
        DATE(created_at) >= '${dataInicioFormatada}'::date
        AND DATE(created_at) <= '${dataFormatada}'::date
      GROUP BY 
        DATE(created_at)
      ORDER BY 
        data
    `;
    
    console.log(`[Dashboard] Consulta SQL para transações por período: ${query}`);
    
    const result = await pagamentosPool.query(query);
    
    // Garantir que estamos tratando os valores como números de ponto flutuante
    const transacoesDB = result.rows.map(row => ({
      data: row.data.toISOString().split('T')[0],
      total: parseInt(row.total || '0'),
      totalAprovadas: parseInt(row.total_aprovadas || '0'),
      totalRejeitadas: parseInt(row.total_rejeitadas || '0'),
      totalPendentes: parseInt(row.total_pendentes || '0'),
      valorAprovado: parseFloat(row.valor_aprovado || '0'),
      valorTotal: parseFloat(row.valor_total || '0')
    }));
    
    // Verificar se o dia atual está presente nos resultados
    const diaAtualPresente = transacoesDB.some(t => t.data === dataFormatada);
    
    // Se o dia atual não estiver presente, adicionar com os dados do dia
    if (!diaAtualPresente) {
      console.log(`[Dashboard] Dia atual (${dataFormatada}) não encontrado nos resultados, obtendo dados separadamente`);
      
      // Obter dados do dia atual separadamente usando a abordagem do script de teste
      const client = await pagamentosPool.connect();
      
      try {
        // Consulta para o dia atual
        const queryHoje = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as total_aprovadas,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as total_rejeitadas,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pendentes,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_aprovado,
            SUM(amount) as valor_total
          FROM 
            "transactions"
          WHERE 
            DATE(created_at) = '${dataFormatada}'::date
        `;
        
        console.log(`[Dashboard] Consulta SQL para transações de hoje: ${queryHoje}`);
        
        const resultHoje = await client.query(queryHoje);
        
        if (resultHoje.rows.length > 0) {
          const dadosHoje = resultHoje.rows[0];
          
          // Adicionar o dia atual aos resultados
          transacoesDB.push({
            data: dataFormatada,
            total: parseInt(dadosHoje.total || '0'),
            totalAprovadas: parseInt(dadosHoje.total_aprovadas || '0'),
            totalRejeitadas: parseInt(dadosHoje.total_rejeitadas || '0'),
            totalPendentes: parseInt(dadosHoje.total_pendentes || '0'),
            valorAprovado: parseFloat(dadosHoje.valor_aprovado || '0'),
            valorTotal: parseFloat(dadosHoje.valor_total || '0')
          });
          
          console.log(`[Dashboard] Dados de hoje adicionados:`, transacoesDB[transacoesDB.length - 1]);
        }
      } finally {
        client.release();
      }
    }
    
    // Criar um mapa com os dados de transações por data
    const transacoesMap = {};
    transacoesDB.forEach(t => {
      transacoesMap[t.data] = t;
    });
    
    // Preencher o array final com dados para todas as datas
    const transacoes = todasDatas.map(data => {
      if (transacoesMap[data]) {
        return transacoesMap[data];
      } else {
        // Retornar um objeto com valores zerados para datas sem transações
        return {
          data,
          total: 0,
          totalAprovadas: 0,
          totalRejeitadas: 0,
          totalPendentes: 0,
          valorAprovado: 0,
          valorTotal: 0
        };
      }
    });
    
    // Ordenar os resultados por data
    transacoes.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    console.log(`[Dashboard] Transações por período (${dias} dias) após processamento:`, transacoes);
    
    console.log(`Transações por período (${dias} dias):`, transacoes);
    
    return transacoes;
  } catch (error) {
    console.error(`Erro ao obter transações por período (${dias} dias):`, error);
    return [];
  }
}

async function obterAtividadesRecentes(limite: number = 10) {
  try {
    // Buscar pedidos recentes com mais informações relevantes
    const pedidosQuery = `
      SELECT 
        'pedido' as tipo,
        o.id,
        o.created_at as data,
        o.customer_name as usuario,
        o.customer_email as email,
        o.service_name as servico,
        o.status,
        o.amount as valor,
        o.metadata
      FROM 
        "Order" o
      ORDER BY 
        o.created_at DESC
      LIMIT $1
    `;
    
    // Buscar transações recentes com mais detalhes
    const transacoesQuery = `
      SELECT 
        'transacao' as tipo,
        t.id,
        t.external_id,
        t.created_at as data,
        pr.customer_name as usuario,
        pr.customer_email as email,
        pr.service_name as servico,
        t.status,
        t.method as metodo_pagamento,
        t.amount as valor
      FROM 
        "transactions" t
      LEFT JOIN 
        "payment_requests" pr ON t.payment_request_id = pr.id
      ORDER BY 
        t.created_at DESC
      LIMIT $1
    `;
    
    // Executar as consultas em paralelo
    const [pedidosResult, transacoesResult] = await Promise.all([
      ordersPool.query(pedidosQuery, [limite]),
      pagamentosPool.query(transacoesQuery, [limite])
    ]);
    
    // Mapear status para português com cores para facilitar a visualização
    const mapearStatus = (status: string) => {
      const statusMap: {[key: string]: {label: string, cor: string}} = {
        'completed': {label: 'Concluído', cor: 'green'},
        'pending': {label: 'Pendente', cor: 'yellow'},
        'processing': {label: 'Processando', cor: 'blue'},
        'in progress': {label: 'Em Processamento', cor: 'blue'},
        'failed': {label: 'Falha', cor: 'red'},
        'approved': {label: 'Aprovado', cor: 'green'},
        'rejected': {label: 'Rejeitado', cor: 'red'},
        'canceled': {label: 'Cancelado', cor: 'gray'}
      };
      return statusMap[status?.toLowerCase()] || {label: status || 'Desconhecido', cor: 'gray'};
    };
    
    // Função para formatar valores monetários
    const formatarValor = (valor: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor || 0);
    };
    
    // Função para extrair informações dos metadados
    const extrairInfoMetadata = (metadata: any) => {
      if (!metadata) return {};
      
      try {
        const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        return {
          external_payment_id: metadataObj.external_payment_id,
          external_transaction_id: metadataObj.external_transaction_id,
          provider: metadataObj.provider,
          payment_method: metadataObj.payment_method
        };
      } catch (e) {
        console.error('Erro ao processar metadata:', e);
        return {};
      }
    };
    
    // Processar pedidos com informações mais detalhadas
    const pedidos = pedidosResult.rows.map(p => {
      const metadata = extrairInfoMetadata(p.metadata);
      const statusInfo = mapearStatus(p.status);
      
      return {
        id: p.id,
        tipo: 'PEDIDO',
        icone: 'shopping-bag',
        data: p.data.toISOString(),
        data_formatada: new Date(p.data).toLocaleString('pt-BR'),
        usuario: p.usuario || 'Não informado',
        email: p.email,
        servico: p.servico || `Serviço #${p.id}`,
        item: p.servico || `Pedido #${p.id.substring(0, 8)}`,
        descricao: `Pedido de ${p.usuario || 'Cliente'} - ${p.servico || 'Serviço'}`,
        status: statusInfo.label,
        status_cor: statusInfo.cor,
        valor: parseFloat(p.valor || '0'),
        valor_formatado: formatarValor(parseFloat(p.valor || '0')),
        metodo_pagamento: metadata.payment_method || 'Não informado',
        provider: metadata.provider,
        external_payment_id: metadata.external_payment_id,
        external_transaction_id: metadata.external_transaction_id,
        link: `/pedidos/${p.id}`
      };
    });
    
    // Processar transações com informações mais detalhadas
    const transacoes = transacoesResult.rows.map(t => {
      const statusInfo = mapearStatus(t.status);
      
      return {
        id: t.id,
        tipo: 'TRANSAÇÃO',
        icone: 'credit-card',
        data: t.data.toISOString(),
        data_formatada: new Date(t.data).toLocaleString('pt-BR'),
        usuario: t.usuario || 'Cliente',
        email: t.email,
        servico: t.servico,
        item: t.external_id ? `ID: ${t.external_id.substring(0, 8)}` : `Transação #${t.id.substring(0, 8)}`,
        descricao: t.servico ? `Pagamento de ${t.servico}` : `Pagamento de ${formatarValor(parseFloat(t.valor || '0'))}`,
        status: statusInfo.label,
        status_cor: statusInfo.cor,
        valor: parseFloat(t.valor || '0'),
        valor_formatado: formatarValor(parseFloat(t.valor || '0')),
        metodo_pagamento: t.metodo_pagamento || 'Não informado',
        external_id: t.external_id,
        link: `/transacoes/${t.id}`
      };
    });
    
    // Combinar resultados e ordenar por data (mais recentes primeiro)
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
    // Obter a data atual no fuso horário de São Paulo
    const hoje = new Date();
    const dataHojeBrasil = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [dia, mes, ano] = dataHojeBrasil.split('/');
    const dataFormatada = `${ano}-${mes}-${dia}`;
    
    console.log(`[Dashboard] Data atual no fuso horário de São Paulo: ${dataFormatada}`);
    
    const query = `
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_aprovadas,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pendentes,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_recusadas,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as valor_total_aprovado,
        SUM(amount) as valor_total
      FROM "transactions"
      WHERE DATE(created_at) = '${dataFormatada}'::date
    `;
    
    console.log(`[Dashboard] Consulta SQL para estatísticas do dia: ${query}`);
    
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