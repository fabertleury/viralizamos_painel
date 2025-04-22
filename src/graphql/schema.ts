import { gql } from 'apollo-server-micro';

export const typeDefs = gql`
  # Tipos básicos
  type Usuario {
    id: ID!
    nome: String!
    email: String!
    ativo: Boolean!
    dataUltimoLogin: String
    dataCriacao: String!
  }

  type Produto {
    id: ID!
    nome: String!
    descricao: String
    preco: Int!
    ativo: Boolean!
  }

  type Provedor {
    id: ID!
    nome: String!
    tipo: String!
    status: String!
    saldo: Int
  }

  # Tipos para pedidos
  type Pedido {
    id: ID!
    dataCriacao: String!
    provedorId: ID!
    provedorNome: String!
    produtoId: ID!
    produtoNome: String!
    quantidade: Int!
    valor: Int!
    status: String!
    clienteId: ID!
    clienteNome: String!
    clienteEmail: String!
    transacaoId: ID
    providerOrderId: String
    resposta: String
    erro: String
    ultimaVerificacao: String
  }

  type EstatisticasPedidos {
    total: Int!
    completos: Int!
    processando: Int!
    pendentes: Int!
    falhas: Int!
    valorTotal: Int!
    crescimento: Int!
  }

  type PedidoPorDia {
    data: String!
    total: Int!
    completos: Int!
    falhas: Int!
  }

  type StatusPedidosGrafico {
    labels: [String!]!
    dados: [Int!]!
  }

  # Tipos para transações
  type Transacao {
    id: ID!
    dataCriacao: String!
    valor: Int!
    status: String!
    metodoPagamento: String!
    clienteId: ID!
    clienteNome: String!
    clienteEmail: String!
    produtoId: ID!
    produtoNome: String!
    orderId: ID
  }

  type EstatisticasTransacoes {
    total: Int!
    aprovadas: Int!
    pendentes: Int!
    recusadas: Int!
    valorTotal: Int!
    crescimento: Int!
  }

  type TransacaoPorDia {
    data: String!
    total: Int!
    valorAprovado: Int!
  }

  # Estatísticas de usuários
  type EstatisticasUsuarios {
    total: Int!
    ativos: Int!
    novos: Int!
    crescimento: Int!
  }

  # Dados do dashboard
  type DadosDashboard {
    stats: EstatisticasGerais!
    graficoTransacoes: [DadosGrafico!]!
    graficoPedidos: [DadosGrafico!]!
    graficoUsuarios: [DadosGrafico!]!
    atividadesRecentes: [AtividadeRecente!]!
  }
  
  type EstatisticasGerais {
    totalTransacoes: Int!
    totalPedidos: Int!
    totalUsuarios: Int!
    crescimentoTransacoes: Float!
    crescimentoPedidos: Float!
    crescimentoUsuarios: Float!
  }
  
  type DadosGrafico {
    data: String!
    valor: Int!
  }

  # Para atividades recentes
  type AtividadeRecente {
    tipo: String!
    id: ID!
    data: String!
    usuario: String!
    item: String!
    status: String!
    valor: Int!
  }

  # Input para filtros
  input FiltroTransacoes {
    status: String
    metodo: String
    dataInicio: String
    dataFim: String
    termoBusca: String
  }

  input FiltroPedidos {
    status: String
    provedor: String
    dataInicio: String
    dataFim: String
    termoBusca: String
  }

  input FiltroUsuarios {
    ativo: Boolean
    dataInicio: String
    dataFim: String
    termoBusca: String
  }

  input Paginacao {
    pagina: Int!
    limite: Int!
  }

  # Queries (consultas)
  type Query {
    # Dashboard
    dadosDashboard: DadosDashboard!
    
    # Pedidos
    pedidos(filtro: FiltroPedidos, paginacao: Paginacao!): ResultadoPedidos!
    pedido(id: ID!): Pedido
    provedores: [Provedor!]!
    
    # Transações
    transacoes(filtro: FiltroTransacoes, paginacao: Paginacao!): ResultadoTransacoes!
    transacao(id: ID!): Transacao
    
    # Usuários
    usuarios(filtro: FiltroUsuarios, paginacao: Paginacao!): ResultadoUsuarios!
    usuario(id: ID!): Usuario
  }

  # Resultado paginado
  type ResultadoPedidos {
    pedidos: [Pedido!]!
    total: Int!
  }

  type ResultadoTransacoes {
    transacoes: [Transacao!]!
    total: Int!
  }

  type ResultadoUsuarios {
    usuarios: [Usuario!]!
    total: Int!
  }

  # Mutations (alterações)
  type Mutation {
    reenviarPedido(id: ID!): ResultadoReenvio!
  }

  type ResultadoReenvio {
    sucesso: Boolean!
    mensagem: String
  }
`; 