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
    // Verificar se a URL do banco de dados está configurada
    if (!process.env.ORDERS_DATABASE_URL) {
      console.error('ORDERS_DATABASE_URL não está configurada');
      
      // Retornar dados mockados
      return res.status(200).json(gerarProvedoresMockados());
    }

    // Testar conexão com o banco de dados
    const conexaoOK = await testarConexaoDB();
    if (!conexaoOK) {
      console.error('Não foi possível estabelecer conexão com o banco de dados');
      
      // Retornar dados mockados
      return res.status(200).json(gerarProvedoresMockados());
    }

    console.log('API /provedores - Iniciando consulta');
    const provedores = await obterProvedores();
    console.log(`API /provedores - Obtidos ${provedores.length} provedores`);
    
    res.status(200).json(provedores);
  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    
    // Retornar dados mockados em caso de erro
    return res.status(200).json(gerarProvedoresMockados());
  }
}

// Função para gerar provedores mockados quando o banco de dados está indisponível
function gerarProvedoresMockados() {
  return [
    {
      id: 'mock-prov-1',
      nome: 'Provedor Likes Instagram',
      api_url: 'https://api.exemplo.com/likes',
      status: 'active',
      data_criacao: new Date().toISOString(),
      is_mock: true
    },
    {
      id: 'mock-prov-2',
      nome: 'Provedor Seguidores',
      api_url: 'https://api.exemplo.com/followers',
      status: 'active',
      data_criacao: new Date().toISOString(),
      is_mock: true
    },
    {
      id: 'mock-prov-3',
      nome: 'Provedor Views TikTok',
      api_url: 'https://api.exemplo.com/tiktok',
      status: 'active',
      data_criacao: new Date().toISOString(),
      is_mock: true
    },
    {
      id: 'mock-prov-4',
      nome: 'Provedor YouTube',
      api_url: 'https://api.exemplo.com/youtube',
      status: 'active',
      data_criacao: new Date().toISOString(),
      is_mock: true
    }
  ];
} 