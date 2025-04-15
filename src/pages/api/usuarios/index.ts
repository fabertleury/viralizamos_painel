import { NextApiRequest, NextApiResponse } from 'next';
import { buscarUsuariosDetalhados, testarConexaoDB } from '../../../services/usuariosService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verifica se está em fase de build e retorna dados simulados
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('API /usuarios - Pulando execução durante build');
    return res.status(200).json({ 
      usuarios: gerarUsuariosMockados(10),
      total: 10,
      mock: true
    });
  }

  try {
    // Verificar se a URL do banco de dados está configurada
    if (!process.env.PAGAMENTOS_DATABASE_URL) {
      console.error('PAGAMENTOS_DATABASE_URL não está configurada');
      
      // Responder com dados mockados
      return res.status(200).json({ 
        usuarios: gerarUsuariosMockados(10),
        total: 10,
        mock: true,
        error: 'URL do banco de dados não configurada'
      });
    }

    // Testar conexão com o banco de dados
    const conexaoOK = await testarConexaoDB();
    if (!conexaoOK) {
      console.error('Não foi possível estabelecer conexão com o banco de dados');
      
      // Responder com dados mockados
      return res.status(200).json({ 
        usuarios: gerarUsuariosMockados(10),
        total: 10,
        mock: true,
        error: 'Falha na conexão com o banco de dados'
      });
    }

    const { 
      tipo, 
      status, 
      termoBusca, 
      pagina = '1', 
      limite = '10' 
    } = req.query;

    console.log(`API /usuarios - Parâmetros: tipo=${tipo}, status=${status}, pagina=${pagina}, limite=${limite}`);

    const filtros: any = {};
    
    if (tipo && tipo !== 'todos') {
      filtros.tipo = tipo;
    }
    
    if (status && status !== 'todos') {
      filtros.status = status;
    }
    
    if (termoBusca) {
      filtros.termoBusca = termoBusca;
    }
    
    const resultado = await buscarUsuariosDetalhados(
      filtros,
      parseInt(pagina as string),
      parseInt(limite as string)
    );
    
    console.log(`API /usuarios - Resultado obtido com sucesso: ${resultado.total} usuários encontrados`);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    
    // Responder com dados mockados em caso de erro
    return res.status(200).json({
      usuarios: gerarUsuariosMockados(10),
      total: 10,
      mock: true,
      error_message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função para gerar usuários mockados para exibição quando o banco de dados estiver indisponível
function gerarUsuariosMockados(quantidade: number) {
  const tipos = ['admin', 'cliente'];
  const nomes = ['João Silva', 'Maria Oliveira', 'Carlos Santos', 'Ana Lima', 'Pedro Rocha', 'Fernanda Costa'];
  
  return Array.from({ length: quantidade }).map((_, i) => {
    const nome = nomes[i % nomes.length];
    const email = `${nome.toLowerCase().replace(' ', '.')}@exemplo.com`;
    const tipo = tipos[i % 2];
    const dataBase = new Date();
    dataBase.setDate(dataBase.getDate() - Math.floor(Math.random() * 365));
    const ultimoAcesso = new Date();
    ultimoAcesso.setDate(ultimoAcesso.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: `mock-${Date.now()}-${i}`,
      nome,
      email,
      telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      tipo,
      ativo: Math.random() > 0.2,
      data_criacao: dataBase.toISOString(),
      ultimo_acesso: ultimoAcesso.toISOString(),
      total_gasto: Math.floor(Math.random() * 10000) / 100,
      total_pedidos: Math.floor(Math.random() * 20),
      ultimo_pedido: {
        data: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        valor: Math.floor(Math.random() * 1000) / 100,
        status: ['pendente', 'processando', 'completo', 'falha'][Math.floor(Math.random() * 4)],
        produto: ['Likes Instagram', 'Seguidores Instagram', 'Views TikTok', 'Inscritos YouTube'][Math.floor(Math.random() * 4)]
      },
      servicos_usados: ['Likes Instagram', 'Seguidores Instagram'],
      is_mock: true
    };
  });
} 