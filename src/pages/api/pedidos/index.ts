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
    // Verifica tanto ORDERS_DATABASE_URL quanto DATABASE_URL_ORDERS
    const dbUrl = process.env.ORDERS_DATABASE_URL || process.env.DATABASE_URL_ORDERS;
    if (!dbUrl) {
      console.error('URL do banco de dados de orders não está configurada');
      
      // Responder com erro
      return res.status(500).json({
        pedidos: [],
        total: 0,
        error: 'URL do banco de dados não configurada. Verifique as variáveis de ambiente.'
      });
    }

    // Testar conexão com o banco de dados
    const conexaoOK = await testarConexaoDB();
    if (!conexaoOK) {
      console.error('Não foi possível estabelecer conexão com o banco de dados');
      
      // Responder com erro
      return res.status(500).json({
        pedidos: [],
        total: 0,
        error: 'Falha na conexão com o banco de dados. Verifique as credenciais e a conexão de rede.'
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
    
    // Responder com erro
    return res.status(500).json({
      pedidos: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}