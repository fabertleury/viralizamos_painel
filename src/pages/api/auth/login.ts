import { NextApiRequest, NextApiResponse } from 'next';

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

    // Call the main API to authenticate the user
    const apiUrl = process.env.NEXT_PUBLIC_VIRALIZAMOS_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/admin/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        message: errorData.error || 'Falha na autenticação' 
      });
    }

    const data = await response.json();

    // Transform the response to match our expected format
    return res.status(200).json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || 'Usuário',
        email: data.user.email,
        role: data.user.user_metadata?.role || 'admin',
      },
    });
  } catch (error) {
    console.error('Error in login API:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 