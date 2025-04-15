import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwtToken } from '../../../../utils/auth';
import { buscarPermissoesUsuario, atualizarPermissoesUsuario } from '../../../../services/usuariosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // Verificar se o usuário tem permissão de administrador
  if (tokenData.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'ID de usuário inválido' });
  }

  // GET para buscar permissões
  if (req.method === 'GET') {
    try {
      const permissoes = await buscarPermissoesUsuario(Number(id));
      
      if (!permissoes) {
        return res.status(404).json({ message: 'Permissões não encontradas' });
      }
      
      res.status(200).json(permissoes);
    } catch (error) {
      console.error(`Erro ao buscar permissões do usuário ${id}:`, error);
      res.status(500).json({ message: `Erro ao buscar permissões do usuário ${id}` });
    }
  } 
  // PUT para atualizar permissões
  else if (req.method === 'PUT') {
    try {
      const { permissoes } = req.body;
      
      if (!permissoes || !Array.isArray(permissoes)) {
        return res.status(400).json({ message: 'Formato de permissões inválido' });
      }
      
      await atualizarPermissoesUsuario(Number(id), permissoes);
      
      res.status(200).json({ message: 'Permissões atualizadas com sucesso' });
    } catch (error) {
      console.error(`Erro ao atualizar permissões do usuário ${id}:`, error);
      res.status(500).json({ message: `Erro ao atualizar permissões do usuário ${id}` });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
} 