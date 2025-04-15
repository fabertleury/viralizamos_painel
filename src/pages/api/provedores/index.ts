import { NextApiRequest, NextApiResponse } from 'next';
import { obterProvedores, testarConexaoDB } from '../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Verificar se a URL do banco de dados está configurada
    if (!process.env.ORDERS_DATABASE_URL) {
      console.error('ORDERS_DATABASE_URL não está configurada');
      return res.status(500).json({ 
        message: 'Erro de configuração do servidor', 
        error: 'URL do banco de dados não configurada' 
      });
    }

    // Testar conexão com o banco de dados
    const conexaoOK = await testarConexaoDB();
    if (!conexaoOK) {
      console.error('Não foi possível estabelecer conexão com o banco de dados');
      return res.status(500).json({ 
        message: 'Erro de conexão com o banco de dados', 
        error: 'Falha na conexão com o banco de dados' 
      });
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
    res.status(500).json({ 
      message: 'Erro ao buscar provedores',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 