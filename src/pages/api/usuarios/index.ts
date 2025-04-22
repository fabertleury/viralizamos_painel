import { NextApiRequest, NextApiResponse } from 'next';
import * as usuariosService from '../../../services/usuariosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Log inicial para depuração
  console.log('API /usuarios - Iniciando processamento da requisição');
  
  try {
    // Extrair parâmetros da requisição
    const { 
      tipo, 
      status, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    console.log(`API /usuarios - Parâmetros: tipo=${tipo}, status=${status}, termoBusca=${termoBusca}, pagina=${pagina}, limite=${limite}`);

    // Usar o serviço de usuários para buscar os dados
    const filtros = {
      tipo: tipo as string,
      status: status as string,
      termoBusca: termoBusca as string
    };
    
    // Buscar usuários usando o serviço
    const resultado = await usuariosService.buscarUsuarios(filtros, parseInt(pagina as string), parseInt(limite as string));
    
    console.log(`API /usuarios - Encontrados ${resultado.usuarios?.length || 0} usuários`);
    
    // Retornar os dados completos
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('API /usuarios - Erro ao buscar dados:', error);
    
    if (error instanceof Error) {
      console.error(`API /usuarios - Mensagem: ${error.message}`);
    }
    
    return res.status(500).json({
      message: 'Erro ao buscar usuários',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}