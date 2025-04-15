import { verify, sign, JwtPayload } from 'jsonwebtoken';

interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
}

/**
 * Verifica se o token JWT é válido e retorna os dados do payload
 * @param token Token JWT a ser verificado
 * @returns Payload do token ou null se o token for inválido
 */
export async function verifyJwtToken(token: string): Promise<TokenPayload | null> {
  try {
    // Verificar se a variável de ambiente JWT_SECRET está definida
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET não está definido nas variáveis de ambiente');
      throw new Error('JWT_SECRET não definido');
    }
    
    // Verificar o token e retornar o payload
    const payload = verify(token, jwtSecret) as TokenPayload;
    return payload;
  } catch (error) {
    console.error('Erro ao verificar token JWT:', error);
    return null;
  }
}

/**
 * Gera um novo token JWT para o usuário
 * @param payload Dados do usuário a serem incluídos no token
 * @returns Token JWT gerado
 */
export function generateJwtToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn = '7d'): string {
  const jwtSecret = process.env.JWT_SECRET || '';
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não definido');
  }
  
  return sign(payload, jwtSecret, { expiresIn: expiresIn });
}

/**
 * Verifica se o usuário é um administrador
 * @param token Token JWT do usuário
 * @returns true se o usuário for um administrador, false caso contrário
 */
export async function isAdmin(token: string): Promise<boolean> {
  const payload = await verifyJwtToken(token);
  
  if (!payload) {
    return false;
  }
  
  return payload.role === 'admin';
}

/**
 * Verifica se o usuário é dono de um recurso ou é um administrador
 * @param token Token JWT do usuário
 * @param resourceUserId ID do usuário proprietário do recurso
 * @returns true se o usuário for o proprietário ou um administrador, false caso contrário
 */
export async function isOwnerOrAdmin(token: string, resourceUserId: string): Promise<boolean> {
  const payload = await verifyJwtToken(token);
  
  if (!payload) {
    return false;
  }
  
  return payload.id === resourceUserId || payload.role === 'admin';
} 