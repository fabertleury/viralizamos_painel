import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwtToken } from '../../../../utils/auth';
import * as usuariosService from '../../../../services/usuariosService';

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

  // Apenas permitir requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  console.log(`[${new Date().toISOString()}] Iniciando busca de detalhes do usuário ${id}`);
  
  try {
    console.log(`[${new Date().toISOString()}] Buscando detalhes do usuário ID: ${id}`);

    // Buscar dados do usuário usando o serviço
    const usuario = await usuariosService.buscarUsuario(id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Buscar métricas do usuário
    const metricas = await usuariosService.buscarMetricasUsuario(id);
    
    // Buscar histórico de pedidos recentes
    const historicoPedidos = await usuariosService.buscarHistoricoCompras(id, 1, 5);
    
    // Combinar todos os dados
    const usuarioDetalhado = {
      ...usuario,
      metricas: metricas || {},
      pedidos_recentes: historicoPedidos?.orders || []
    };
    
    return res.status(200).json(usuarioDetalhado);
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar detalhes do usuário',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 