import { NextApiRequest, NextApiResponse } from 'next';
import { obterProvedores } from '../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const provedores = await obterProvedores();
    res.status(200).json(provedores);
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    res.status(500).json({ message: 'Erro ao buscar provedores' });
  }
} 