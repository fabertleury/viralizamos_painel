import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwtToken } from '../../../../utils/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const token = authHeader.substring(7);
    const tokenData = await verifyJwtToken(token);

    if (!tokenData) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Obter ID do usuário da URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    // Verificar se o usuário tem permissão para ver estas métricas
    // Apenas administradores ou o próprio usuário podem ver as métricas
    if (tokenData.role !== 'admin' && tokenData.id !== id) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Importar função para buscar métricas
    const { buscarMetricasUsuario } = await import('../../../../services/usuariosService');
    
    // Buscar métricas
    const metricas = await buscarMetricasUsuario(parseInt(id, 10));
    
    if (!metricas) {
      return res.status(404).json({ message: 'Métricas não encontradas' });
    }

    // Retornar dados
    return res.status(200).json(metricas);
  } catch (error) {
    console.error('Erro ao buscar métricas do usuário:', error);
    return res.status(500).json({ message: 'Erro ao processar requisição' });
  }
}

export default handler; 