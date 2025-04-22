import { NextApiRequest, NextApiResponse } from 'next';
import { obterProvedores, testarConexaoDB } from '../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verifica se está em fase de build e retorna dados vazios se estiver
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('API /provedores - Pulando execução durante build');
    return res.status(200).json([]);
  }

  try {
    // Verificar se as variáveis de ambiente necessárias estão configuradas
    const ordersApiUrl = process.env.ORDERS_API_URL;
    const ordersApiKey = process.env.ORDERS_API_KEY;
    
    if (!ordersApiUrl || !ordersApiKey) {
      console.error('ORDERS_API_URL ou ORDERS_API_KEY não estão configurados');
      return res.status(500).json({
        error: 'Configuração incompleta',
        message: 'As variáveis de ambiente para a API de orders não estão configuradas corretamente'
      });
    }

    console.log('API /provedores - Iniciando consulta');
    const provedores = await obterProvedores();
    console.log(`API /provedores - Obtidos ${provedores.length} provedores`);
    
    if (provedores.length === 0) {
      console.warn('Nenhum provedor encontrado');
    }
    
    return res.status(200).json(provedores);
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    
    return res.status(500).json({
      error: 'Falha ao buscar provedores',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}