import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface LoginRequestBody {
  email: string;
  password: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body as LoginRequestBody;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    console.log(`Tentativa de login para o email: ${email}`);

    // Verificar se o acesso é do administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@viralizamos.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '7X#pK9@vD2zF5qL!eR8gT$hY3mN6bW';

    // Comparar credenciais de forma segura (tempo constante)
    const isAdmin = email === adminEmail && password === adminPassword;

    // Em produção, usar credenciais das variáveis de ambiente
    if (isAdmin) {
      console.log('Login bem-sucedido para o administrador');
      
      // Dados do usuário para incluir no token
      const userData = {
        id: 'admin-user',
        email: adminEmail,
        name: 'Administrador',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 dias
      };

      // Gerar JWT token usando o secret definido nas variáveis de ambiente
      const jwtSecret = process.env.JWT_SECRET || 'viralizamosSecretKey2024';
      const token = jwt.sign(userData, jwtSecret);
      
      return res.status(200).json({
        token: token,
        user: {
          id: 'admin-user',
          name: 'Administrador',
          email: adminEmail,
          role: 'admin',
        },
      });
    } 
    
    // Credenciais inválidas
    console.log('Credenciais de administrador inválidas');
    return res.status(401).json({ message: 'Credenciais inválidas' });

  } catch (error) {
    console.error('Error in login API:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 