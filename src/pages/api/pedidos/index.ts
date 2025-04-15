import { NextApiRequest, NextApiResponse } from 'next';
import { buscarPedidos, testarConexaoDB } from '../../../services/pedidosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verifica se está em fase de build e retorna dados vazios se estiver
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('API /pedidos - Pulando execução durante build');
    return res.status(200).json({ pedidos: [], total: 0 });
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

    const { 
      status, 
      provedor, 
      dataInicio, 
      dataFim, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    console.log(`API /pedidos - Parâmetros: status=${status}, provedor=${provedor}, pagina=${pagina}, limite=${limite}`);

    const filtros: any = {};
    
    if (status && status !== 'todos') {
      filtros.status = status;
    }
    
    if (provedor && provedor !== 'todos') {
      filtros.provedor = provedor;
    }
    
    if (dataInicio) {
      filtros.dataInicio = dataInicio;
    }
    
    if (dataFim) {
      filtros.dataFim = dataFim;
    }
    
    if (termoBusca) {
      filtros.termoBusca = termoBusca;
    }
    
    const resultado = await buscarPedidos(
      filtros, 
      parseInt(pagina as string), 
      parseInt(limite as string)
    );
    
    console.log(`API /pedidos - Resultado obtido com sucesso: ${resultado.total} pedidos encontrados`);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    res.status(500).json({ 
      message: 'Erro ao buscar pedidos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 