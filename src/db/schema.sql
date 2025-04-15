-- Limpar banco de dados - Remover todas as tabelas existentes
DROP TABLE IF EXISTS usuariospermissoes;
DROP TABLE IF EXISTS permissoes;
DROP TABLE IF EXISTS configuracoessistema;
DROP TABLE IF EXISTS usuarios;

-- Tabela de usuários
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255),  -- Pode ser NULL para usuários que não fazem login
  role VARCHAR(20) NOT NULL DEFAULT 'cliente', -- admin, cliente, moderador
  ativo BOOLEAN NOT NULL DEFAULT true,
  telefone VARCHAR(20),
  data_cadastro TIMESTAMP NOT NULL DEFAULT NOW(),
  ultimo_acesso TIMESTAMP,
  foto_perfil VARCHAR(255),
  metadata JSONB -- Para armazenar informações extras como preferências, estatísticas etc.
);

-- Tabela de permissões
CREATE TABLE permissoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  codigo VARCHAR(50) NOT NULL UNIQUE
);

-- Tabela de associação entre usuários e permissões
CREATE TABLE usuariospermissoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permissao_id INTEGER NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, permissao_id)
);

-- Tabela de configurações do sistema
CREATE TABLE configuracoessistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  grupo VARCHAR(50),
  descricao TEXT
);

-- Inserir usuário administrador padrão
-- Senha: admin123
INSERT INTO usuarios (nome, email, senha, role, ativo)
VALUES ('Administrador', 'admin@viralizamos.com', '$2a$10$JlY9OOWVVD6c3J7.SOE0Z.o9RSqj6Gjh9GRO6u93nFIbRQqVE1U4i', 'admin', true);

-- Inserir permissões básicas
INSERT INTO permissoes (nome, descricao, codigo) VALUES
('Visualizar Usuários', 'Permite visualizar a lista de usuários', 'ver_usuarios'),
('Editar Usuários', 'Permite criar e editar usuários', 'editar_usuarios'),
('Excluir Usuários', 'Permite excluir usuários', 'excluir_usuarios'),
('Visualizar Pedidos', 'Permite visualizar a lista de pedidos', 'ver_pedidos'),
('Editar Pedidos', 'Permite editar status de pedidos', 'editar_pedidos'),
('Visualizar Transações', 'Permite visualizar transações financeiras', 'ver_transacoes'),
('Administração Completa', 'Acesso total ao sistema', 'admin_total');

-- Atribuir todas as permissões ao admin
INSERT INTO usuariospermissoes (usuario_id, permissao_id)
SELECT 1, id FROM permissoes;

-- Inserir configurações iniciais do sistema
INSERT INTO configuracoessistema (chave, valor, tipo, grupo, descricao) VALUES
('site_titulo', 'Viralizamos - Painel Administrativo', 'string', 'geral', 'Título do site'),
('empresa_nome', 'Viralizamos', 'string', 'empresa', 'Nome da empresa'),
('empresa_email', 'contato@viralizamos.com', 'string', 'empresa', 'Email de contato'),
('api_pagamentos_url', 'https://pagamentos.viralizamos.com/api', 'string', 'integracao', 'URL da API de pagamentos'),
('jwt_secret', '6bVERz8A5P4drqmYjN2ZxK$Fw9sXhC7uJtH3GeQpT!vLWkS#D@', 'string', 'seguranca', 'Chave secreta para JWT'); 