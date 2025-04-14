import { Pool } from 'pg';
import { createHash } from 'crypto';

// Conexão com o banco de dados principal do painel
const painelPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Interface para usuários
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  data_cadastro: Date;
  ultimo_acesso?: Date;
  avatar_url?: string;
}

// Função para buscar usuários com filtros
export async function buscarUsuarios(
  filtros: {
    tipo?: string;
    ativo?: boolean;
    termoBusca?: string;
  } = {},
  pagina = 1,
  limite = 10
): Promise<{ usuarios: Usuario[]; total: number }> {
  try {
    const offset = (pagina - 1) * limite;
    
    let query = `
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
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramCount = 1;

    // Aplicar filtros se existirem
    if (filtros.tipo && filtros.tipo !== 'todos') {
      query += ` AND tipo = $${paramCount++}`;
      queryParams.push(filtros.tipo);
    }
    
    if (filtros.ativo !== undefined) {
      query += ` AND ativo = $${paramCount++}`;
      queryParams.push(filtros.ativo);
    }
    
    if (filtros.termoBusca) {
      query += ` AND (
        nome ILIKE $${paramCount} OR 
        email ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filtros.termoBusca}%`);
      paramCount++;
    }
    
    // Query para contagem total
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await painelPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Adicionar ordenação e paginação
    query += ` ORDER BY nome ASC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    queryParams.push(limite);
    queryParams.push(offset);
    
    const result = await painelPool.query(query, queryParams);
    
    return {
      usuarios: result.rows,
      total
    };
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw new Error('Erro ao buscar usuários do banco de dados');
  }
}

// Função para buscar um usuário específico
export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
  try {
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
        id = $1
    `;
    
    const result = await painelPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error(`Erro ao buscar usuário ${id}:`, error);
    throw new Error(`Erro ao buscar usuário ${id}`);
  }
}

// Função para buscar um usuário pelo email
export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  try {
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
    
    const result = await painelPool.query(query, [email]);
    
    if (result.rows.length === 0) {
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
    const query = `
      UPDATE usuarios
      SET 
        ativo = $1,
        atualizado_em = NOW()
      WHERE 
        id = $2
      RETURNING id
    `;
    
    const result = await painelPool.query(query, [ativo, id]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao atualizar status do usuário ${id}:`, error);
    throw new Error(`Erro ao atualizar status do usuário ${id}`);
  }
}

// Função para criar um novo usuário
export async function criarUsuario(usuario: {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
}): Promise<Usuario> {
  try {
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
        atualizado_em
      ) VALUES (
        $1, $2, $3, $4, true, NOW(), NOW()
      )
      RETURNING 
        id, 
        nome,
        email,
        tipo,
        ativo,
        data_cadastro
    `;
    
    const result = await painelPool.query(query, [
      usuario.nome,
      usuario.email,
      senhaCriptografada,
      usuario.tipo
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
}

// Função para atualizar um usuário
export async function atualizarUsuario(id: string, dados: {
  nome?: string;
  email?: string;
  senha?: string;
  tipo?: string;
  avatar_url?: string;
}): Promise<boolean> {
  try {
    // Montando dinamicamente a query de atualização
    let setClause = '';
    const values: any[] = [];
    let paramCount = 1;
    
    if (dados.nome) {
      setClause += `nome = $${paramCount++}, `;
      values.push(dados.nome);
    }
    
    if (dados.email) {
      setClause += `email = $${paramCount++}, `;
      values.push(dados.email);
    }
    
    if (dados.senha) {
      setClause += `senha_hash = $${paramCount++}, `;
      values.push(hashSenha(dados.senha));
    }
    
    if (dados.tipo) {
      setClause += `tipo = $${paramCount++}, `;
      values.push(dados.tipo);
    }
    
    if (dados.avatar_url) {
      setClause += `avatar_url = $${paramCount++}, `;
      values.push(dados.avatar_url);
    }
    
    // Adicionar atualizado_em
    setClause += `atualizado_em = NOW()`;
    
    // Se não houver dados para atualizar
    if (values.length === 0) {
      return false;
    }
    
    const query = `
      UPDATE usuarios
      SET ${setClause}
      WHERE id = $${paramCount}
      RETURNING id
    `;
    
    values.push(id);
    
    const result = await painelPool.query(query, values);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao atualizar usuário ${id}:`, error);
    throw new Error(`Erro ao atualizar usuário ${id}`);
  }
}

// Função para excluir um usuário
export async function excluirUsuario(id: string): Promise<boolean> {
  try {
    const query = `
      DELETE FROM usuarios
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await painelPool.query(query, [id]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao excluir usuário ${id}:`, error);
    throw new Error(`Erro ao excluir usuário ${id}`);
  }
}

// Função para registrar o último acesso de um usuário
export async function registrarUltimoAcesso(id: string): Promise<boolean> {
  try {
    const query = `
      UPDATE usuarios
      SET ultimo_acesso = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await painelPool.query(query, [id]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Erro ao registrar último acesso do usuário ${id}:`, error);
    throw new Error(`Erro ao registrar último acesso do usuário ${id}`);
  }
}

// Função para autenticar um usuário
export async function autenticarUsuario(email: string, senha: string): Promise<Usuario | null> {
  try {
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
    
    const result = await painelPool.query(query, [email]);
    
    if (result.rows.length === 0) {
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

// Função para obter estatísticas de usuários
export async function obterEstatisticasUsuarios(): Promise<any> {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN tipo = 'admin' THEN 1 ELSE 0 END) as total_admins,
        SUM(CASE WHEN tipo = 'cliente' THEN 1 ELSE 0 END) as total_clientes,
        SUM(CASE WHEN ativo = true THEN 1 ELSE 0 END) as total_ativos,
        SUM(CASE WHEN ultimo_acesso >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as ativos_ultimos_30_dias,
        COUNT(CASE WHEN data_cadastro >= NOW() - INTERVAL '30 days' THEN 1 END) as novos_ultimos_30_dias
      FROM 
        usuarios
    `;
    
    const result = await painelPool.query(query);
    
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    throw new Error('Erro ao obter estatísticas de usuários');
  }
}

// Função auxiliar para criptografar senha
function hashSenha(senha: string): string {
  return createHash('sha256').update(senha).digest('hex');
} 