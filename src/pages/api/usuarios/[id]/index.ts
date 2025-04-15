import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwtToken } from '../../../../utils/auth';
import { buscarUsuarioPorId } from '../../../../services/usuariosService';

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

  // Buscar usuário por ID
  if (req.method === 'GET') {
    try {
      const usuario = await buscarUsuarioPorId(Number(id));
      
      if (!usuario) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Remover a senha antes de enviar a resposta
      const usuarioData = usuario as any;
      if (usuarioData.senha) {
        delete usuarioData.senha;
      }
      
      res.status(200).json(usuario);
    } catch (error) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      res.status(500).json({ message: `Erro ao buscar usuário ${id}` });
    }
  } 
  // Atualizar usuário
  else if (req.method === 'PUT') {
    try {
      const { nome, email, tipo, status, telefone, foto_perfil } = req.body;
      
      // Validar dados
      if (!nome || !email) {
        return res.status(400).json({ message: 'Nome e email são obrigatórios' });
      }
      
      // Importar dinâmicamente para evitar problemas de compilação
      const { atualizarUsuario } = await import('../../../../services/usuariosService');
      
      // Usando a primeira implementação de atualizarUsuario que recebe id como string
      const usuarioAtualizado = await atualizarUsuario(id.toString(), {
        nome,
        email,
        tipo,
        avatar_url: foto_perfil
      });
      
      if (!usuarioAtualizado) {
        return res.status(404).json({ message: 'Usuário não encontrado ou nenhum campo foi atualizado' });
      }
      
      res.status(200).json(usuarioAtualizado);
    } catch (error) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      res.status(500).json({ message: `Erro ao atualizar usuário ${id}` });
    }
  } 
  // Excluir usuário
  else if (req.method === 'DELETE') {
    try {
      // Não permitir que o usuário exclua a si mesmo
      if (tokenData.id === id) {
        return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
      }
      
      // Importar dinâmicamente para evitar problemas de compilação
      const { excluirUsuario } = await import('../../../../services/usuariosService');
      
      const sucesso = await excluirUsuario(id.toString());
      
      if (!sucesso) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      res.status(200).json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (error) {
      console.error(`Erro ao excluir usuário ${id}:`, error);
      res.status(500).json({ message: `Erro ao excluir usuário ${id}` });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
} 