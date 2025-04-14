import { gql } from '@apollo/client';

// Mutação para atualizar o status de uma transação
export const ATUALIZAR_STATUS_TRANSACAO = gql`
  mutation AtualizarStatusTransacao($id: ID!, $status: String!, $observacoes: String) {
    atualizarStatusTransacao(id: $id, status: $status, observacoes: $observacoes) {
      id
      status
      dataCriacao
      valor
      metodoPagamento
      observacoes
      cliente {
        id
        nome
        email
      }
    }
  }
`;

// Mutação para estornar uma transação
export const ESTORNAR_TRANSACAO = gql`
  mutation EstornarTransacao($id: ID!, $motivo: String!) {
    estornarTransacao(id: $id, motivo: $motivo) {
      id
      status
      motivo
      dataCriacao
      valor
    }
  }
`;

// Mutação para adicionar comprovante a uma transação
export const ADICIONAR_COMPROVANTE = gql`
  mutation AdicionarComprovante($id: ID!, $arquivo: Upload!) {
    adicionarComprovante(id: $id, arquivo: $arquivo) {
      id
      status
      comprovante
    }
  }
`;

// Mutação para criar uma nova transação manual
export const CRIAR_TRANSACAO = gql`
  mutation CriarTransacao($input: TransacaoInput!) {
    criarTransacao(input: $input) {
      id
      dataCriacao
      valor
      status
      metodoPagamento
      cliente {
        id
        nome
        email
      }
    }
  }
`;

// Mutação para atualizar dados do cliente
export const ATUALIZAR_CLIENTE = gql`
  mutation AtualizarCliente($id: ID!, $input: ClienteInput!) {
    atualizarCliente(id: $id, input: $input) {
      id
      nome
      email
      telefone
      documento
    }
  }
`;

// Mutação para adicionar novo endereço ao cliente
export const ADICIONAR_ENDERECO = gql`
  mutation AdicionarEndereco($clienteId: ID!, $input: EnderecoInput!) {
    adicionarEndereco(clienteId: $clienteId, input: $input) {
      id
      tipo
      rua
      numero
      complemento
      bairro
      cidade
      estado
      cep
      padrao
    }
  }
`;

// Mutação para remover endereço do cliente
export const REMOVER_ENDERECO = gql`
  mutation RemoverEndereco($id: ID!) {
    removerEndereco(id: $id) {
      sucesso
      mensagem
    }
  }
`;

// Mutação para login de usuário
export const LOGIN = gql`
  mutation Login($email: String!, $senha: String!) {
    login(email: $email, senha: $senha) {
      token
      usuario {
        id
        nome
        email
        perfil
        avatar
      }
    }
  }
`;

// Mutação para redefinir senha
export const REDEFINIR_SENHA = gql`
  mutation RedefinirSenha($email: String!) {
    redefinirSenha(email: $email) {
      sucesso
      mensagem
    }
  }
`;

// Mutação para alterar senha
export const ALTERAR_SENHA = gql`
  mutation AlterarSenha($senhaAtual: String!, $novaSenha: String!) {
    alterarSenha(senhaAtual: $senhaAtual, novaSenha: $novaSenha) {
      sucesso
      mensagem
    }
  }
`; 