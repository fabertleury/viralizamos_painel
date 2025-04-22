import { NextApiRequest, NextApiResponse } from 'next';
import { ordersApi, handleApiError } from '@/services/api';
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

    // Buscar dados detalhados do usuário através do panel-users API
    try {
      // Primeiro, tente buscar usando o serviço de orders
      // Este request é especial - precisamos buscar um usuário específico por ID
      // Vamos manipular os parâmetros para filtrar pelo ID específico
      const searchParams = new URLSearchParams();
      searchParams.append('user_id', id);
      
      // Chamar a API
      const response = await ordersApi.get(`/api/admin/panel-users/user/${id}`);
      return res.status(200).json(response.data);
    } catch (ordersError) {
      console.error('Erro ao buscar detalhes da API de orders:', ordersError);
      
      // Fallback: Importar função do serviço de usuários
      const { buscarUsuarioPorIdDetalhado } = await import('../../../../services/usuariosService');
      
      // Buscar dados do usuário dos serviços locais
      const usuario = await buscarUsuarioPorIdDetalhado(id);
      
      if (!usuario) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Estruturar dados no formato compatível com o panel-users
      const { buscarMetricasUsuario } = await import('../../../../services/usuariosService');
      const metricas = await buscarMetricasUsuario(id);
      
      // Converter para o formato compatível com panel-users
      const detalhesUsuario = {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        phone: usuario.telefone,
        role: usuario.tipo,
        created_at: usuario.data_cadastro,
        updated_at: usuario.ultimo_acesso,
        metrics: {
          orders_count: metricas?.quantidade_compras || 0,
          total_spent: metricas?.total_gasto || 0,
          last_purchase: metricas?.ultima_compra ? {
            id: 'unknown',
            date: metricas.ultima_compra.toISOString(),
            status: 'unknown',
            amount: 0
          } : null,
          top_services: metricas?.servico_mais_comprado ? [{
            service_name: metricas.servico_mais_comprado.nome,
            count: metricas.servico_mais_comprado.quantidade
          }] : [],
          purchase_frequency: null,
          avg_order_value: metricas?.media_mensal || 0
        }
      };
      
      return res.status(200).json(detalhesUsuario);
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro ao processar requisição',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default handler; 