import { gql } from '@apollo/client';

// Query para buscar dados do dashboard
export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    dadosDashboard {
      estatisticas {
        transacoes {
          total
          aprovadas
          pendentes
          recusadas
          valorTotal
          crescimento
        }
        pedidos {
          total
          completos
          processando
          pendentes
          falhas
          valorTotal
          crescimento
        }
        usuarios {
          total
          ativos
          novos
          crescimento
        }
      }
      graficos {
        transacoesPorDia {
          data
          total
          valorAprovado
        }
        pedidosPorDia {
          data
          total
          completos
          falhas
        }
        statusPedidos {
          labels
          dados
        }
      }
      atividadesRecentes {
        id
        tipo
        data
        usuario
        item
        status
        valor
      }
    }
  }
`;

// Query para buscar transações com paginação e filtros
export const GET_TRANSACOES = gql`
  query GetTransacoes(
    $pagina: Int!
    $limite: Int!
    $busca: String
    $status: String
    $metodoPagamento: String
    $dataInicio: String
    $dataFim: String
  ) {
    transacoes(
      filtro: {
        termoBusca: $busca
        status: $status
        metodo: $metodoPagamento
        dataInicio: $dataInicio
        dataFim: $dataFim
      }
      paginacao: {
        pagina: $pagina
        limite: $limite
      }
    ) {
      transacoes {
        id
        dataCriacao
        valor
        status
        metodoPagamento
        clienteId
        clienteNome
        clienteEmail
        produtoId
        produtoNome
        orderId
      }
      total
    }
  }
`;

// Query para buscar detalhes de uma transação específica
export const GET_TRANSACAO_DETALHES = gql`
  query GetTransacaoDetalhes($id: ID!) {
    transacao(id: $id) {
      id
      dataCriacao
      valor
      status
      metodoPagamento
      observacoes
      comprovante
      cliente {
        id
        nome
        email
        telefone
        cpfCnpj
        enderecos {
          id
          logradouro
          numero
          complemento
          bairro
          cidade
          estado
          cep
          principal
        }
      }
      historico {
        id
        data
        status
        observacao
        usuario {
          id
          nome
        }
      }
    }
  }
`;

// Query para buscar clientes com paginação e busca
export const GET_CLIENTES = gql`
  query GetClientes(
    $pagina: Int!
    $limite: Int!
    $busca: String
  ) {
    clientes(
      pagina: $pagina
      limite: $limite
      busca: $busca
    ) {
      items {
        id
        nome
        email
        telefone
        cpfCnpj
        dataCadastro
      }
      totalItems
      totalPaginas
      paginaAtual
    }
  }
`;

// Query para buscar detalhes de um cliente específico
export const GET_CLIENTE_DETALHES = gql`
  query GetClienteDetalhes($id: ID!) {
    cliente(id: $id) {
      id
      nome
      email
      telefone
      cpfCnpj
      dataCadastro
      enderecos {
        id
        logradouro
        numero
        complemento
        bairro
        cidade
        estado
        cep
        principal
      }
      transacoes {
        id
        dataCriacao
        valor
        status
        metodoPagamento
      }
    }
  }
`;

// Query para buscar pedidos com filtros e paginação
export const GET_PEDIDOS = gql`
  query GetPedidos($filtro: FiltroPedidos, $paginacao: Paginacao!) {
    pedidos(filtro: $filtro, paginacao: $paginacao) {
      pedidos {
        id
        dataCriacao
        provedorId
        provedorNome
        produtoId
        produtoNome
        quantidade
        valor
        status
        clienteId
        clienteNome
        clienteEmail
        transacaoId
        providerOrderId
        resposta
        erro
        ultimaVerificacao
      }
      total
    }
  }
`;

// Query para buscar detalhes de um pedido específico
export const GET_PEDIDO = gql`
  query GetPedido($id: ID!) {
    pedido(id: $id) {
      id
      dataCriacao
      provedorId
      provedorNome
      produtoId
      produtoNome
      quantidade
      valor
      status
      clienteId
      clienteNome
      clienteEmail
      transacaoId
      providerOrderId
      resposta
      erro
      ultimaVerificacao
    }
  }
`;

// Query para buscar a lista de provedores
export const GET_PROVEDORES = gql`
  query GetProvedores {
    provedores {
      id
      nome
      tipo
      status
      saldo
    }
  }
`;

// Mutation para reenviar um pedido
export const REENVIAR_PEDIDO = gql`
  mutation ReenviarPedido($id: ID!) {
    reenviarPedido(id: $id) {
      sucesso
      mensagem
    }
  }
`;

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats($periodo: String!) {
    dashboard(periodo: $periodo) {
      transacoesPorStatus {
        status
        quantidade
        valor
      }
      transacoesPorMetodo {
        metodo
        quantidade
        valor
      }
      historicoVendas {
        data
        quantidade
        valor
      }
      totais {
        transacoes
        clientes
        valorAprovado
        valorPendente
      }
    }
  }
`; 