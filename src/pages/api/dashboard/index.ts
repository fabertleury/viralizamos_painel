import { NextApiRequest, NextApiResponse } from 'next';
import { analyticsPool, obterDadosDashboard } from '../../../services/analyticsService';

// Agora usamos apenas o banco Analytics
const pool = analyticsPool;

// Verificar conexão inicial com o banco de dados Analytics
pool.on('error', (err) => {
  console.error('[API:Dashboard:Pool] Erro no pool de conexão Analytics:', err.message);
});

console.log('[API:Dashboard:Init] Pool de conexão Analytics inicializado');

// Variável para armazenar o cache dos dados do dashboard
let dashboardCache: any = null;
let lastCacheTime = 0;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_DASHBOARD || '300', 10) * 1000; // 5 minutos em milissegundos por padrão

// Função para calcular o crescimento percentual
function calcularCrescimento(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Função para obter dados do dashboard com cache
async function obterDadosDashboardComCache() {
  // Verificar se temos um cache válido
  const agora = Date.now();
  if (dashboardCache && (agora - lastCacheTime < CACHE_TTL)) {
    console.log('[API:Dashboard] Retornando dados do cache');
    return dashboardCache;
  }

  try {
    console.log('[API:Dashboard] Buscando dados atualizados do banco Analytics');
    
    // Usar a função do serviço analyticsService para obter todos os dados do dashboard
    const dadosDashboard = await obterDadosDashboard();
    
    // Transformar os dados para o formato esperado pelo frontend
    const resultado = {
      estatisticas: {
        transacoes: {
          total: dadosDashboard.totalVendas || 0,
          crescimento: 0, // Será calculado depois
          valorTotal: dadosDashboard.totalVendas || 0,
          hoje: {
            total: 0, // Será preenchido depois
            valorTotal: 0, // Será preenchido depois
            valorAprovado: 0 // Será preenchido depois
          }
        },
        pedidos: {
          total: dadosDashboard.totalPedidos || 0,
          crescimento: 0, // Será calculado depois
          completados: dadosDashboard.pedidosPorStatus.find(p => p.status === 'completed')?.quantidade || 0,
          pendentes: dadosDashboard.pedidosPorStatus.find(p => p.status === 'pending')?.quantidade || 0,
          falhas: dadosDashboard.pedidosPorStatus.find(p => p.status === 'failed')?.quantidade || 0
        },
        usuarios: {
          total: dadosDashboard.totalUsuarios || 0,
          crescimento: 0, // Será calculado depois
          novos: 0 // Será preenchido depois
        }
      },
      graficos: {
        transacoesPorDia: dadosDashboard.vendasPorDia.map(venda => ({
          data: venda.dia,
          total: venda.valor || 0,
          valorAprovado: venda.valor || 0,
          totalAprovadas: venda.pedidos || 0,
          totalPendentes: 0,
          totalRejeitadas: 0
        })),
        statusPedidos: {
          labels: dadosDashboard.pedidosPorStatus.map(p => p.status),
          dados: dadosDashboard.pedidosPorStatus.map(p => p.quantidade)
        }
      },
      metodosPagamento: {
        labels: dadosDashboard.transacoesPorMetodo.map(t => t.metodo),
        dados: dadosDashboard.transacoesPorMetodo.map(t => t.quantidade)
      },
      pedidosRecentes: dadosDashboard.pedidosRecentes.map(pedido => ({
        id: pedido.order_id,
        data: new Date(pedido.created_at).toISOString(),
        cliente: {
          nome: pedido.customer_name || 'Cliente',
          email: pedido.customer_email || ''
        },
        valor: pedido.total_amount || 0,
        status: pedido.status || 'desconhecido'
      })),
      transacoesRecentes: dadosDashboard.transacoesRecentes.map(transacao => ({
        id: transacao.transaction_id,
        data: new Date(transacao.created_at).toISOString(),
        cliente: {
          nome: 'Cliente', // Pode ser melhorado com uma junção com a tabela de usuários
          email: ''
        },
        valor: transacao.amount || 0,
        status: transacao.status || 'desconhecido',
        metodo: transacao.method || 'desconhecido'
      })),
      usuariosRecentes: dadosDashboard.usuariosRecentes.map(usuario => ({
        id: usuario.user_id,
        nome: usuario.name || 'Usuário',
        email: usuario.email || '',
        dataCadastro: new Date(usuario.created_at).toISOString(),
        totalPedidos: usuario.total_orders || 0,
        valorTotal: usuario.total_spent || 0
      }))
    };

    // Calcular estatísticas do dia atual
    const hoje = new Date().toISOString().split('T')[0];
    const vendaHoje = dadosDashboard.vendasPorDia.find(v => v.dia === hoje);
    if (vendaHoje) {
      resultado.estatisticas.transacoes.hoje.total = vendaHoje.pedidos || 0;
      resultado.estatisticas.transacoes.hoje.valorTotal = vendaHoje.valor || 0;
      resultado.estatisticas.transacoes.hoje.valorAprovado = vendaHoje.valor || 0;
    }

    // Calcular crescimento (comparando com o dia anterior)
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = ontem.toISOString().split('T')[0];
    const vendaOntem = dadosDashboard.vendasPorDia.find(v => v.dia === ontemStr);
    
    if (vendaOntem && vendaHoje) {
      resultado.estatisticas.transacoes.crescimento = calcularCrescimento(
        vendaHoje.valor || 0, 
        vendaOntem.valor || 0
      );
      
      resultado.estatisticas.pedidos.crescimento = calcularCrescimento(
        vendaHoje.pedidos || 0, 
        vendaOntem.pedidos || 0
      );
    }

    // Calcular usuários novos (últimos 7 dias)
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    resultado.estatisticas.usuarios.novos = dadosDashboard.usuariosRecentes.filter(
      u => new Date(u.created_at) >= seteDiasAtras
    ).length;

    // Atualizar o cache
    dashboardCache = resultado;
    lastCacheTime = agora;
    
    return resultado;
  } catch (error) {
    console.error('[API:Dashboard] Erro ao obter dados do dashboard:', error);
    throw error;
  }
}

// Handler da API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Obter dados do dashboard (com cache)
    const dados = await obterDadosDashboardComCache();
    
    // Retornar os dados
    return res.status(200).json(dados);
  } catch (error) {
    console.error('[API:Dashboard] Erro ao processar requisição:', error);
    return res.status(500).json({ 
      message: 'Erro ao obter dados do dashboard',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}
