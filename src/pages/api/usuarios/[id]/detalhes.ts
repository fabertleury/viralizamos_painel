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
      console.error('Token não fornecido ou formato inválido:', authHeader);
      return res.status(401).json({ 
        message: 'Não autorizado', 
        error: 'Token de autorização não fornecido ou em formato inválido (deve ser Bearer Token)'
      });
    }

    const token = authHeader.substring(7);
    console.log('Token recebido (detalhes):', token.substring(0, 10) + '...');
    
    // Verificar token JWT
    try {
      const tokenData = await verifyJwtToken(token);
      if (!tokenData) {
        console.error('Token JWT inválido');
        return res.status(401).json({ message: 'Token inválido' });
      }
    } catch (tokenError) {
      console.error('Erro ao verificar token JWT:', tokenError);
      return res.status(401).json({ 
        message: 'Token inválido',
        error: tokenError instanceof Error ? tokenError.message : 'Erro na verificação do token'
      });
    }

    // Obter ID do usuário da URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    // Configurar headers para API de orders
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ApiKey': process.env.ORDERS_API_KEY || process.env.API_KEY || '' // Adicionar API Key para maior segurança
    };

    // Buscar dados detalhados do usuário através do panel-users API
    try {
      console.log(`Buscando detalhes do usuário ${id} da API de orders`);
      
      // Chamada para a API específica de usuário por ID
      const endpoint = `/api/admin/panel-users/user/${id}`;
      console.log('Chamando endpoint:', endpoint);
      
      const response = await ordersApi.get(endpoint, { headers });
      
      console.log('Detalhes do usuário obtidos com sucesso');
      return res.status(200).json(response.data);
    } catch (ordersError) {
      console.error('Erro ao buscar detalhes da API de orders:', ordersError);
      
      // Se for erro de autenticação, retornar status 401
      if (ordersError.response?.status === 401) {
        return res.status(401).json({
          message: 'Não autorizado no sistema de orders',
          error: 'Token inválido ou sem permissão suficiente'
        });
      }
      
      // Fallback: Importar função do serviço de usuários
      console.log('Usando fallback com serviços locais para o usuário:', id);
      const { buscarUsuarioPorIdDetalhado } = await import('../../../../services/usuariosService');
      
      // Buscar dados do usuário dos serviços locais
      const usuario = await buscarUsuarioPorIdDetalhado(id);
      
      if (!usuario) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Estruturar dados no formato compatível com o panel-users
      const { buscarMetricasUsuario } = await import('../../../../services/usuariosService');
      const metricas = await buscarMetricasUsuario(id);
      
      console.log('Dados locais obtidos, convertendo para formato compatível');
      
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