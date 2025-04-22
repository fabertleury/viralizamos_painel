import { Pool } from 'pg';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateJwtToken } from '../utils/auth';
import axios from 'axios';
import { pagamentosApi, ordersApi, handleApiError } from './api';

// Impede erros durante o processo de build
const isServerSide = typeof window === 'undefined';
let pagamentosPool: Pool | null = null;
let ordersPool: Pool | null = null;

// Inicialização da conexão com o banco de dados
if (isServerSide && process.env.NEXT_PHASE !== 'phase-production-build') {
  pagamentosPool = new Pool({
    connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

  ordersPool = new Pool({
    connectionString: process.env.ORDERS_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Verificar conexão com os bancos de dados
if (pagamentosPool) {
  pagamentosPool.on('error', (err) => {
    console.error('Erro inesperado na conexão com o pool de pagamentos:', err);
  });
}

if (ordersPool) {
  ordersPool.on('error', (err) => {
    console.error('Erro inesperado na conexão com o pool de orders:', err);
  });
}

// Interface para usuário
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: string;
  status: boolean;
  data_cadastro: Date;
  ultimo_acesso?: Date;
  foto_perfil?: string;
  // Propriedades adicionais para estatísticas
  total_pedidos?: number;
  total_gasto?: number;
  servicos_usados?: string[];
  ultimo_pedido?: {
    data: Date;
    produto: string;
    valor: number;
    status: string;
  };
}

// Função para verificar se o pool está inicializado
function verificarPool() {
  if (!pagamentosPool) {
    throw new Error('Pool de conexão de pagamentos não inicializado');
  }
  return pagamentosPool;
}

// Inicialização do Prisma client
const prisma = new PrismaClient();

/**
 * Testa a conexão com o banco de dados usando Prisma
 * @returns {Promise<boolean>} true se a conexão for bem-sucedida, false caso contrário
 */
export async function testarConexaoDB(): Promise<boolean> {
  // Se não estiver no servidor ou em modo de build, retorna true
  if (!isServerSide || process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando verificação de conexão durante build ou no cliente');
    return true;
  }

  try {
    await prisma.$connect();
    // Executa uma query simples para testar a conexão
    await prisma.$executeRaw`SELECT 1`;
    console.log('Conexão com o banco de dados estabelecida com sucesso via Prisma.');
    return true;
  } catch (error) {
    console.error('Erro ao testar conexão com o banco de dados via Prisma:', error);
    
    // Fallback para o método antigo se o Prisma falhar
    if (pagamentosPool) {
      try {
        const client = await pagamentosPool.connect();
        await client.query('SELECT 1 AS test');
        client.release();
        console.log('Conexão com o banco de dados de pagamentos estabelecida com sucesso via Pool.');
        return true;
      } catch (poolError) {
        console.error('Erro ao conectar com o banco de dados de pagamentos via Pool:', poolError);
      }
    }
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Busca usuários com filtros, paginação e informações sobre seus pedidos
 */
export async function buscarUsuariosDetalhados(
  filtros: {
    tipo?: string;
    status?: string;
    termoBusca?: string;
  },
  pagina: number = 1,
  limite: number = 10
) {
  // Se estiver em build, retornar dados vazios
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Pulando busca de usuários durante o build');
    return { 
      usuarios: [], 
      total: 0,
      pagina,
      limite,
      paginas: 0,
      mock: true
    };
  }

  // Garantir valores mínimos para paginação
  pagina = Math.max(1, pagina);
  limite = Math.max(1, Math.min(100, limite));
  
  const skip = (pagina - 1) * limite;
  
  try {
    console.log(`Iniciando busca de usuários via Prisma. Filtros: ${JSON.stringify(filtros)}, Página: ${pagina}, Limite: ${limite}`);
    
    // Verificar a estrutura real do banco de dados via Prisma
    // Aqui estamos supondo a estrutura do banco real usado pelo projeto
    // Em um cenário real, esse código deve se adaptar ao schema Prisma definido no projeto
    
    // Fallback para o método usando Pool diretamente, já que temos
    // menos certeza sobre a estrutura do schema Prisma
    const pool = verificarPool();
    
    const offset = (pagina - 1) * limite;
    
    // Consulta para obter usuários da tabela de clientes do módulo de pagamentos
    let query = `
      SELECT 
        u.id, 
        u.name as nome,
        u.email,
        u.phone as telefone,
        u.role as tipo,
        u.active as ativo,
        u.created_at as data_criacao,
        u.last_login as ultimo_acesso
      FROM 
        "user" u
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramCount = 1;

    // Aplicar filtros se existirem
    if (filtros.tipo && filtros.tipo !== 'todos') {
      query += ` AND u.role = $${paramCount++}`;
      queryParams.push(filtros.tipo);
    }
    
    if (filtros.status && filtros.status !== 'todos') {
      const isActive = filtros.status === 'ativo';
      query += ` AND u.active = $${paramCount++}`;
      queryParams.push(isActive);
    }
    
    if (filtros.termoBusca) {
      query += ` AND (
        u.name ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filtros.termoBusca}%`);
      paramCount++;
    }
    
    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limite);
    queryParams.push(offset);
    
    console.log('Executando query de usuários via Pool');
    
    const result = await pool.query(query, queryParams);
    console.log(`Encontrados ${result.rows.length} usuários`);
    
    // Usuários base
    let usuarios: any[] = result.rows;
    
    // Enriquecer dados com informações de pedidos
    if (ordersPool && usuarios.length > 0) {
      // IDs dos usuários para buscar informações adicionais
      const userIds = usuarios.map(u => u.id);
      
      // Buscar estatísticas de compras por usuário
      const orderStatsQuery = `
        SELECT 
          user_id,
          COUNT(*) as total_pedidos,
          SUM(amount) as total_gasto,
          MAX(created_at) as ultimo_pedido_data,
          (SELECT service_id FROM "Order" WHERE user_id = o.user_id ORDER BY created_at DESC LIMIT 1) as ultimo_servico
        FROM 
          "Order" o
        WHERE 
          user_id = ANY($1)
        GROUP BY 
          user_id
      `;
      
      try {
        const orderStatsResult = await ordersPool.query(orderStatsQuery, [userIds]);
        const orderStats = orderStatsResult.rows;
        
        // Mapear estatísticas para os usuários
        usuarios = usuarios.map(user => {
          // Encontrar estatísticas para este usuário
          const stats = orderStats.find(s => s.user_id === user.id);
          
          if (stats) {
            // Usuário tem pedidos
            return {
              ...user,
              total_gasto: parseFloat(stats.total_gasto || 0),
              total_pedidos: parseInt(stats.total_pedidos || 0),
              ultimo_pedido: stats.ultimo_pedido_data ? {
                data: new Date(stats.ultimo_pedido_data).toISOString(),
                produto: stats.ultimo_servico || 'Não identificado',
                valor: 0, // Precisaríamos de uma query adicional para detalhes do último pedido
                status: 'completo' // Simplificação
              } : null
            };
          }
          
          // Usuário sem pedidos
          return {
            ...user,
            total_gasto: 0,
            total_pedidos: 0,
            ultimo_pedido: null,
            servicos_usados: []
          };
        });
        
      } catch (orderError) {
        console.error('Erro ao buscar estatísticas de pedidos:', orderError);
        // Continuamos mesmo se falhar a obtenção de estatísticas
      }
    }
    
    return {
      usuarios,
      total,
      pagina,
      limite,
      paginas: Math.ceil(total / limite),
      mock: false
    };
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw new Error('Erro ao buscar usuários do banco de dados');
  }
}

// Função para buscar detalhes completos de um usuário
export async function buscarUsuarioPorIdDetalhado(id: string) {
  if (!pagamentosPool) {
    throw new Error('Pool de conexão de pagamentos não inicializado');
  }
  
  try {
    const query = `
      SELECT 
        u.id, 
        u.name as nome,
        u.email,
        u.phone as telefone,
        u.role as tipo,
        u.active as ativo,
        u.created_at as data_criacao,
        u.last_login as ultimo_acesso
      FROM 
        "user" u
      WHERE 
        u.id = $1
    `;
    
    const result = await pagamentosPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const usuario: Usuario = result.rows[0];
    
    // Enriquecer com dados de orders
    if (ordersPool) {
      // Pedidos recentes
      const pedidosQuery = `
        SELECT 
          o.id,
          o.amount as valor,
          o.status,
          o.created_at as data,
          o.target_username as produto
        FROM 
          "Order" o
        WHERE 
          o.user_id = $1
        ORDER BY 
          o.created_at DESC
        LIMIT 10
      `;
      
      const pedidosResult = await ordersPool.query(pedidosQuery, [id]);
      const pedidos = pedidosResult.rows;
      
      // Estatísticas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_pedidos,
          SUM(amount) as total_gasto,
          array_agg(DISTINCT target_username) as servicos_usados
        FROM 
          "Order"
        WHERE 
          user_id = $1
      `;
      
      const statsResult = await ordersPool.query(statsQuery, [id]);
      const stats = statsResult.rows[0];
      
      // Adicionar dados enriquecidos ao usuário
      usuario.total_pedidos = parseInt(stats.total_pedidos || 0);
      usuario.total_gasto = parseFloat(stats.total_gasto || 0);
      usuario.servicos_usados = stats.servicos_usados || [];
      
      if (pedidos.length > 0) {
        const ultimoPedido = pedidos[0];
        usuario.ultimo_pedido = {
          data: new Date(ultimoPedido.data),
          valor: parseFloat(ultimoPedido.valor),
          status: ultimoPedido.status,
          produto: ultimoPedido.produto
        };
      }
    }
    
    return usuario;
  } catch (error) {
    console.error(`Erro ao buscar usuário ${id}:`, error);
    throw new Error(`Erro ao buscar usuário ${id}`);
  }
}

// Função para obter estatísticas para relatórios
export async function obterEstatisticasUsuarios(): Promise<any> {
  if (!pagamentosPool) {
    throw new Error('Pool de conexão de pagamentos não inicializado');
  }
  
  try {
    // Estatísticas básicas de usuários
    const usuariosStatsQuery = `
      SELECT 
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as usuarios_ativos,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as novos_usuarios_30d
      FROM 
        "user"
    `;
    
    const usuariosStats = await pagamentosPool.query(usuariosStatsQuery);
    
    // Melhores clientes (se o banco de orders estiver disponível)
    let melhoresClientes = [];
    let topServicos = [];
    
    if (ordersPool) {
      const melhoresClientesQuery = `
        SELECT 
          u.name as nome,
          u.email,
          COUNT(o.id) as total_pedidos,
          SUM(o.amount) as total_gasto
        FROM 
          "Order" o
        JOIN 
          "User" u ON o.user_id = u.id
        GROUP BY 
          u.id, u.name, u.email
        ORDER BY 
          total_gasto DESC
        LIMIT 5
      `;
      
      try {
        const melhoresClientesResult = await ordersPool.query(melhoresClientesQuery);
        melhoresClientes = melhoresClientesResult.rows;
      } catch (e) {
        console.error('Erro ao obter melhores clientes:', e);
      }
      
      const topServicosQuery = `
        SELECT 
          target_username as servico,
          COUNT(*) as total_vendas,
          SUM(amount) as valor_total
        FROM 
          "Order"
        GROUP BY 
          target_username
        ORDER BY 
          total_vendas DESC
        LIMIT 5
      `;
      
      try {
        const topServicosResult = await ordersPool.query(topServicosQuery);
        topServicos = topServicosResult.rows;
      } catch (e) {
        console.error('Erro ao obter top serviços:', e);
      }
    }
    
    return {
      usuarios: usuariosStats.rows[0],
      melhores_clientes: melhoresClientes,
      top_servicos: topServicos
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    throw new Error('Erro ao obter estatísticas de usuários');
  }
}

// Função para buscar um usuário pelo email
export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    const query = `
      SELECT 
        id, 
        nome,
        email,
        tipo,
        ativo,
        data_cadastro,
        ultimo_acesso,
        avatar_url
      FROM 
        usuarios
      WHERE 
        email = $1
    `;
    
    const result = await pagamentosPool.query(query, [email]);
    
    if (!result || result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao buscar usuário com email ${email}:`, error);
    throw new Error(`Erro ao buscar usuário com email ${email}`);
  }
}

// Função para atualizar o status de um usuário
export async function atualizarStatusUsuario(id: string, ativo: boolean): Promise<boolean> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    const query = `
      UPDATE usuarios
      SET 
        ativo = $1,
        atualizado_em = NOW()
      WHERE 
        id = $2
      RETURNING id
    `;
    
    const result = await pagamentosPool.query(query, [ativo, id]);
    
    return result && result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao atualizar status do usuário ${id}:`, error);
    throw new Error(`Erro ao atualizar status do usuário ${id}`);
  }
}

// Função para criar um novo usuário
export async function criarUsuarioDetalhado(usuario: {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  tipo?: string;
  foto_perfil?: string;
  ativo?: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    // Verificar se já existe um usuário com este email
    const usuarioExistente = await buscarUsuarioPorEmail(usuario.email);
    
    if (usuarioExistente) {
      throw new Error(`Já existe um usuário com o email ${usuario.email}`);
    }
    
    // Hash da senha
    const senhaCriptografada = hashSenha(usuario.senha);
    
    const query = `
      INSERT INTO usuarios (
        nome, 
        email, 
        senha_hash,
        tipo,
        ativo,
        data_cadastro,
        atualizado_em,
        telefone,
        foto_perfil,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8
      )
      RETURNING 
        id, 
        nome,
        email,
        tipo,
        ativo,
        data_cadastro,
        telefone,
        foto_perfil,
        metadata
    `;
    
    const result = await pagamentosPool.query(query, [
      usuario.nome,
      usuario.email,
      senhaCriptografada,
      usuario.tipo || 'cliente',
      usuario.ativo !== undefined ? usuario.ativo : true,
      usuario.telefone || null,
      usuario.foto_perfil || null,
      usuario.metadata ? JSON.stringify(usuario.metadata) : null
    ]);
    
    if (!result || result.rows.length === 0) {
      throw new Error('Falha ao criar usuário: nenhum registro retornado');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
}

// Função para excluir um usuário
export async function excluirUsuario(id: string): Promise<boolean> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    const query = `
      DELETE FROM usuarios
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pagamentosPool.query(query, [id]);
    
    return result && result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao excluir usuário ${id}:`, error);
    throw new Error(`Erro ao excluir usuário ${id}`);
  }
}

// Função para registrar o último acesso de um usuário
export async function registrarUltimoAcesso(id: string): Promise<boolean> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    const query = `
      UPDATE usuarios
      SET ultimo_acesso = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pagamentosPool.query(query, [id]);
    
    return result && result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao registrar último acesso do usuário ${id}:`, error);
    throw new Error(`Erro ao registrar último acesso do usuário ${id}`);
  }
}

// Função para autenticar um usuário
export async function autenticarUsuario(email: string, senha: string): Promise<Usuario | null> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão de pagamentos não inicializado');
    }

    const query = `
      SELECT 
        id, 
        nome,
        email,
        tipo,
        ativo,
        senha_hash,
        data_cadastro,
        ultimo_acesso,
        avatar_url
      FROM 
        usuarios
      WHERE 
        email = $1
    `;
    
    const result = await pagamentosPool.query(query, [email]);
    
    if (!result || result.rows.length === 0) {
      return null;
    }
    
    const usuario = result.rows[0];
    
    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      throw new Error('Usuário inativo');
    }
    
    // Verificar senha
    const senhaCriptografada = hashSenha(senha);
    
    if (senhaCriptografada !== usuario.senha_hash) {
      return null;
    }
    
    // Atualizar último acesso
    await registrarUltimoAcesso(usuario.id);
    
    // Não retornar o hash da senha
    delete usuario.senha_hash;
    
    return usuario;
  } catch (error) {
    console.error(`Erro ao autenticar usuário ${email}:`, error);
    throw error;
  }
}

// Função auxiliar para criptografar senha
function hashSenha(senha: string): string {
  return createHash('sha256').update(senha).digest('hex');
}

// Interface para métricas
export interface MetricasUsuario {
  total_gasto: number;
  quantidade_compras: number;
  ultima_compra?: Date;
  servico_mais_comprado?: {
    nome: string;
    quantidade: number;
  };
  compras_recentes: any[];
  media_mensal?: number;
  primeiro_pedido?: Date;
}

// Tipo de filtro para busca
export interface FiltroUsuarios {
  tipo?: string;
  status?: string;
  termoBusca?: string;
  pagina?: number;
  limite?: number;
}

// Buscar usuários com dados dos dois microsserviços
export async function buscarUsuarios(filtros: FiltroUsuarios = {}) {
  try {
    console.log('Buscando usuários com filtros:', filtros);

    // Usar o novo endpoint panel-users para buscar usuários com métricas detalhadas
    const response = await ordersApi.get('/admin/panel-users', {
      params: {
        page: filtros.pagina || 1,
        limit: filtros.limite || 10,
        search: filtros.termoBusca || '',
        role: filtros.tipo || ''
      }
    });

    if (response.data && response.data.users) {
      console.log(`Encontrados ${response.data.users.length} usuários`);
      
      // Mapear para o formato esperado pela aplicação
      const usuarios = response.data.users.map((user: any) => {
        const metrics = user.metrics || {};
        
        return {
          id: user.id,
          nome: user.name || 'Sem nome',
          email: user.email,
          telefone: user.phone || '',
          tipo: user.role || 'cliente',
          status: true,
          data_cadastro: new Date(user.created_at),
          ultimo_acesso: user.updated_at ? new Date(user.updated_at) : null,
          foto_perfil: null,
          // Métricas detalhadas
          total_pedidos: metrics.orders_count || 0,
          total_gasto: metrics.total_spent || 0,
          ultimo_pedido: metrics.last_purchase ? new Date(metrics.last_purchase.date) : null,
          servicos_usados: metrics.top_services ? metrics.top_services.map((s: any) => s.service_name) : [],
          frequencia_compra: metrics.purchase_frequency ? `${Math.round(metrics.purchase_frequency)} dias` : null,
          valor_medio_compra: metrics.avg_order_value || 0
        };
      });

      return {
        usuarios,
        total: response.data.totalItems || usuarios.length,
        pagina: response.data.page || 1,
        limite: response.data.limit || 10,
        paginas: response.data.totalPages || 1
      };
    }

    // Tentar o endpoint antigo como fallback
    try {
      console.log('Tentando endpoint fallback /admin/users');
      const fallbackResponse = await ordersApi.get('/admin/users', {
        params: {
          page: filtros.pagina || 1,
          limit: filtros.limite || 10,
          search: filtros.termoBusca || '',
          role: filtros.tipo || ''
        }
      });

      if (fallbackResponse.data && fallbackResponse.data.users) {
        console.log(`Encontrados ${fallbackResponse.data.users.length} usuários via fallback`);
        
        // Mapear para o formato esperado pela aplicação
        const usuarios = fallbackResponse.data.users.map((user: any) => ({
          id: user.id,
          nome: user.name || 'Sem nome',
          email: user.email,
          telefone: user.phone || '',
          tipo: user.role || 'cliente',
          status: true,
          data_cadastro: new Date(user.created_at),
          ultimo_acesso: null,
          foto_perfil: null,
          total_pedidos: user.orders_count || 0,
          total_gasto: user.total_spent || 0,
          ultimo_pedido: user.last_purchase ? new Date(user.last_purchase) : null,
          servicos_usados: user.favorite_service ? [user.favorite_service] : []
        }));

        return {
          usuarios,
          total: fallbackResponse.data.totalItems || usuarios.length,
          pagina: fallbackResponse.data.page || 1,
          limite: fallbackResponse.data.limit || 10,
          paginas: fallbackResponse.data.totalPages || 1
        };
      }
    } catch (fallbackError) {
      console.error('Erro ao usar endpoint fallback:', fallbackError);
    }

    return { usuarios: [], total: 0, pagina: 1, limite: 10, paginas: 0 };
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    handleApiError(error);
    return { usuarios: [], total: 0, pagina: 1, limite: 10, paginas: 0 };
  }
}

// Buscar detalhes de um usuário específico
export async function buscarUsuario(id: string) {
  try {
    console.log(`Buscando detalhes do usuário ${id}`);
    
    // Buscar detalhes do usuário na API de orders usando o novo endpoint
    const response = await ordersApi.get(`/admin/panel-users/${id}`);
    
    if (response.data && response.data.user) {
      const user = response.data.user;
      const metrics = user.metrics || {};
      
      return {
        id: user.id,
        nome: user.name || 'Sem nome',
        email: user.email,
        telefone: user.phone || '',
        tipo: user.role || 'cliente',
        status: true,
        data_cadastro: new Date(user.created_at),
        ultimo_acesso: user.updated_at ? new Date(user.updated_at) : null,
        foto_perfil: null,
        // Métricas detalhadas
        total_pedidos: metrics.total_orders || 0,
        total_gasto: metrics.total_spent || 0,
        ultimo_pedido: metrics.last_purchase ? new Date(metrics.last_purchase.date) : null,
        servicos_usados: metrics.top_services ? metrics.top_services.map((s: any) => s.service_name) : [],
        pedidos_recentes: user.recent_orders || [],
        distribuicao_status: metrics.status_distribution || [],
        tendencia_compras: metrics.purchase_trend || [],
        valor_medio_compra: metrics.avg_order_value || 0,
        dias_entre_compras: metrics.avg_days_between_purchases || null
      };
    }
    
    // Tentar o endpoint antigo como fallback
    try {
      console.log(`Tentando endpoint fallback /admin/users/${id}`);
      const fallbackResponse = await ordersApi.get(`/admin/users/${id}`);
      
      if (fallbackResponse.data && fallbackResponse.data.user) {
        const user = fallbackResponse.data.user;
        
        return {
          id: user.id,
          nome: user.name || 'Sem nome',
          email: user.email,
          telefone: user.phone || '',
          tipo: user.role || 'cliente',
          status: true,
          data_cadastro: new Date(user.created_at),
          ultimo_acesso: null,
          foto_perfil: null
        };
      }
    } catch (fallbackError) {
      console.error(`Erro ao usar endpoint fallback para usuário ${id}:`, fallbackError);
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar detalhes do usuário ${id}:`, error);
    handleApiError(error);
    return null;
  }
};

// Atualizar dados do usuário
export const atualizarUsuario = async (id: string, dados: Partial<Usuario>) => {
  try {
    const response = await pagamentosApi.put(`/usuarios/${id}`, dados);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar métricas do usuário ${id}:`, error);
    handleApiError(error);
    return null;
  }
}

// Buscar métricas do usuário
export async function buscarMetricasUsuario(id: string) {
  try {
    console.log(`Buscando métricas do usuário ${id}`);
    
    // Buscar métricas do usuário na API de orders usando o novo endpoint
    const response = await ordersApi.get(`/admin/panel-users/${id}`);
    
    if (response.data && response.data.user && response.data.user.metrics) {
      const metrics = response.data.user.metrics;
      
      return {
        total_gasto: metrics.total_spent || 0,
        quantidade_compras: metrics.total_orders || 0,
        ultima_compra: metrics.last_purchase ? new Date(metrics.last_purchase.date) : undefined,
        servico_mais_comprado: metrics.top_services && metrics.top_services.length > 0 ? {
          nome: metrics.top_services[0].service_name,
          quantidade: metrics.top_services[0].count || 0
        } : undefined,
        compras_recentes: response.data.user.recent_orders || [],
        media_mensal: metrics.purchase_trend && metrics.purchase_trend.length > 0 ? 
          metrics.purchase_trend.reduce((sum: number, month: any) => sum + month.total_amount, 0) / metrics.purchase_trend.length : 0,
        primeiro_pedido: response.data.user.recent_orders && response.data.user.recent_orders.length > 0 ? 
          new Date(response.data.user.recent_orders[response.data.user.recent_orders.length - 1].created_at) : undefined,
        distribuicao_status: metrics.status_distribution || [],
        tendencia_compras: metrics.purchase_trend || [],
        valor_medio_compra: metrics.avg_order_value || 0,
        dias_entre_compras: metrics.avg_days_between_purchases || null
      };
    }
    
    // Tentar o endpoint antigo como fallback
    try {
      console.log(`Tentando endpoint fallback /admin/users/${id}/metrics`);
      const fallbackResponse = await ordersApi.get(`/admin/users/${id}/metrics`);
      
      if (fallbackResponse.data && fallbackResponse.data.metrics) {
        const metrics = fallbackResponse.data.metrics;
        
        return {
          total_gasto: metrics.total_spent || 0,
          quantidade_compras: metrics.orders_count || 0,
          ultima_compra: metrics.last_purchase ? new Date(metrics.last_purchase) : undefined,
          servico_mais_comprado: metrics.favorite_service ? {
            nome: metrics.favorite_service,
            quantidade: metrics.favorite_service_count || 0
          } : undefined,
          compras_recentes: metrics.recent_orders || [],
          media_mensal: metrics.monthly_average || 0,
          primeiro_pedido: metrics.first_order ? new Date(metrics.first_order) : undefined
        };
      }
    } catch (fallbackError) {
      console.error(`Erro ao usar endpoint fallback para métricas do usuário ${id}:`, fallbackError);
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar métricas do usuário ${id}:`, error);
    handleApiError(error);
    return null;
  }
}

// Buscar histórico de compras do usuário
export async function buscarHistoricoCompras(id: string, pagina = 1, limite = 10) {
  try {
    const response = await ordersApi.get(`/admin/users/${id}/orders`, {
      params: { page: pagina, limit: limite }
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar histórico de compras do usuário ${id}:`, error);
    handleApiError(error);
    return { orders: [], total: 0, page: 1, totalPages: 0 };
  }
};

// Função para obter permissões de um usuário
export async function buscarPermissoesUsuario(usuarioId: number): Promise<string[]> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão não inicializado');
    }

    const query = `
      SELECT p.codigo
      FROM permissoes p
      JOIN usuariospermissoes up ON p.id = up.permissao_id
      WHERE up.usuario_id = $1
    `;

    const result = await pagamentosPool.query(query, [usuarioId]);
    return result.rows.map(row => row.codigo);
  } catch (error) {
    console.error(`Erro ao buscar permissões do usuário ${usuarioId}:`, error);
    return [];
  }
}

// Função para atualizar permissões de um usuário
export async function atualizarPermissoesUsuario(usuarioId: number, permissoes: string[]): Promise<boolean> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão não inicializado');
    }

    const client = await pagamentosPool.connect();
    
    try {
      // Iniciar uma transação
      await client.query('BEGIN');
      
      // Remover permissões existentes
      await client.query('DELETE FROM usuariospermissoes WHERE usuario_id = $1', [usuarioId]);
      
      // Buscar IDs das permissões pelos códigos
      const permissoesQuery = 'SELECT id FROM permissoes WHERE codigo = ANY($1::text[])';
      const permissoesResult = await client.query(permissoesQuery, [permissoes]);
      
      // Adicionar novas permissões
      for (const row of permissoesResult.rows) {
        await client.query(
          'INSERT INTO usuariospermissoes (usuario_id, permissao_id) VALUES ($1, $2)',
          [usuarioId, row.id]
        );
      }
      
      // Confirmar a transação
      await client.query('COMMIT');
      return true;
    } catch (error) {
      // Reverter em caso de erro
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Erro ao atualizar permissões do usuário ${usuarioId}:`, error);
    return false;
  }
}

// Função para registrar um log de acesso
export async function registrarLogAcesso(
  usuarioId: number | null, 
  acao: string, 
  ip?: string, 
  userAgent?: string, 
  detalhes?: Record<string, any>
): Promise<boolean> {
  try {
    if (!pagamentosPool) {
      throw new Error('Pool de conexão não inicializado');
    }

    const query = `
      INSERT INTO usuarioslogacessos (
        usuario_id, acao, ip, user_agent, detalhes
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await pagamentosPool.query(query, [
      usuarioId,
      acao,
      ip || null,
      userAgent || null,
      detalhes ? JSON.stringify(detalhes) : null
    ]);

    return true;
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error);
    return false;
  }
}

// Adicionar a função compatível com a antiga implementação
export async function buscarUsuarioPorId(id: number): Promise<any> {
  try {
    // Usar a nova implementação que recebe string
    const response = await buscarUsuario(id.toString());
    return response;
  } catch (error) {
    console.error(`Erro ao buscar usuário com ID ${id}:`, error);
    return null;
  }
} 