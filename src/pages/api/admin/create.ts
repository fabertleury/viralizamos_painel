import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método da requisição
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      allowedMethods: ['POST']
    });
  }

  try {
    // Verificar se o usuário está autenticado e é um administrador
    const authToken = req.headers.authorization;
    
    if (!authToken || !authToken.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const token = authToken.split(' ')[1];
    
    // Validar o token no serviço de pagamentos (que gerencia usuários)
    try {
      const validationResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL}/auth/validate-token`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Verificar se o usuário é um administrador
      if (validationResponse.data?.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Permissão negada. Apenas administradores podem realizar esta operação.' });
      }
    } catch (authError: any) {
      console.error('Erro ao validar token:', authError.message);
      return res.status(401).json({ error: 'Token de autenticação inválido' });
    }
    
    // Obter dados do novo administrador do corpo da requisição
    const { nome, email, senha } = req.body;
    
    // Validar dados
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Os campos nome, email e senha são obrigatórios' });
    }
    
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se o email já está em uso
    try {
      const checkEmailResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL}/admin/users/check-email`,
        {
          params: { email },
          headers: {
            'Authorization': `ApiKey ${process.env.PAYMENTS_API_KEY}`
          }
        }
      );
      
      if (checkEmailResponse.data?.exists) {
        return res.status(409).json({ error: 'Este email já está em uso' });
      }
    } catch (checkError: any) {
      console.error('Erro ao verificar email:', checkError.message);
      // Continue mesmo se não conseguir verificar o email
    }
    
    // Criar novo administrador
    const createResponse = await axios.post(
      `${process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL}/admin/users/create`,
      {
        name: nome,
        email,
        password: senha,
        role: 'admin',
        active: true
      },
      {
        headers: {
          'Authorization': `ApiKey ${process.env.PAYMENTS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Retornar sucesso
    return res.status(201).json({
      success: true,
      message: 'Administrador criado com sucesso',
      user: {
        id: createResponse.data?.user?.id,
        name: createResponse.data?.user?.name,
        email: createResponse.data?.user?.email,
        role: 'admin'
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar administrador:', error);
    
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || error.message;
      
      return res.status(statusCode).json({
        error: 'Erro ao criar administrador',
        message: errorMessage
      });
    }
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
} 