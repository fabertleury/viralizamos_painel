-- Limpar banco de dados - Remover todas as tabelas existentes
DROP TABLE IF EXISTS usuarioslogacessos;
DROP TABLE IF EXISTS usuariospermissoes;
DROP TABLE IF EXISTS permissoes;
DROP TABLE IF EXISTS relatorios;
DROP TABLE IF EXISTS configuracoessistema;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS categorias;

-- Tabela de usuários
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'cliente', -- admin, cliente
  status BOOLEAN NOT NULL DEFAULT true, -- ativo/inativo
  telefone VARCHAR(20),
  data_cadastro TIMESTAMP NOT NULL DEFAULT NOW(),
  ultimo_acesso TIMESTAMP,
  foto_perfil VARCHAR(255),
  total_gasto DECIMAL(10, 2) DEFAULT 0,
  ultima_compra TIMESTAMP,
  quantidade_compras INTEGER DEFAULT 0,
  metadata JSONB
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

-- Tabela de logs de acesso
CREATE TABLE usuarioslogacessos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_acesso TIMESTAMP NOT NULL DEFAULT NOW(),
  ip VARCHAR(50),
  user_agent TEXT,
  acao VARCHAR(50) NOT NULL, -- login, logout, falha_login
  detalhes JSONB
);

-- Tabela de categorias (para serviços, produtos, etc.)
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(50) UNIQUE,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  icone VARCHAR(50),
  metadata JSONB
);

-- Tabela de relatórios personalizados
CREATE TABLE relatorios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL,
  parametros JSONB,
  criado_por INTEGER REFERENCES usuarios(id),
  data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
  ultima_execucao TIMESTAMP,
  programacao VARCHAR(100), -- formato cron para agendamento
  destinatarios JSONB, -- emails e outros métodos de entrega
  ativo BOOLEAN DEFAULT true
);

-- Tabela de configurações do sistema
CREATE TABLE configuracoessistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  grupo VARCHAR(50),
  descricao TEXT,
  editavel BOOLEAN DEFAULT true
);

-- Inserir usuário administrador padrão
-- Senha padrão: admin123 (hashear em produção)
INSERT INTO usuarios (nome, email, senha, tipo, status)
VALUES ('Administrador', 'admin@viralizamos.com', '$2a$10$JlY9OOWVVD6c3J7.SOE0Z.o9RSqj6Gjh9GRO6u93nFIbRQqVE1U4i', 'admin', true);

-- Inserir permissões básicas
INSERT INTO permissoes (nome, descricao, codigo) VALUES
('Visualizar Usuários', 'Permite visualizar a lista de usuários', 'ver_usuarios'),
('Editar Usuários', 'Permite criar e editar usuários', 'editar_usuarios'),
('Excluir Usuários', 'Permite excluir usuários', 'excluir_usuarios'),
('Visualizar Pedidos', 'Permite visualizar a lista de pedidos', 'ver_pedidos'),
('Editar Pedidos', 'Permite editar status de pedidos', 'editar_pedidos'),
('Visualizar Transações', 'Permite visualizar transações financeiras', 'ver_transacoes'),
('Visualizar Relatórios', 'Permite visualizar relatórios', 'ver_relatorios'),
('Administração Completa', 'Acesso total ao sistema', 'admin_total');

-- Atribuir todas as permissões ao admin
INSERT INTO usuariospermissoes (usuario_id, permissao_id)
SELECT 1, id FROM permissoes;

-- Inserir configurações iniciais do sistema
INSERT INTO configuracoessistema (chave, valor, tipo, grupo, descricao) VALUES
('site_titulo', 'Viralizamos - Painel Administrativo', 'string', 'geral', 'Título do site'),
('empresa_nome', 'Viralizamos', 'string', 'empresa', 'Nome da empresa'),
('empresa_email', 'contato@viralizamos.com', 'string', 'empresa', 'Email de contato'),
('modo_manutencao', 'false', 'boolean', 'sistema', 'Ativar modo de manutenção'),
('notificacoes_email', 'true', 'boolean', 'notificacoes', 'Enviar notificações por email'),
('api_pagamentos_url', 'https://pagamentos.viralizamos.com/api', 'string', 'integracao', 'URL da API de pagamentos'),
('taxa_servico', '10', 'number', 'financeiro', 'Taxa de serviço padrão (%)'),
('moeda_padrao', 'BRL', 'string', 'financeiro', 'Moeda padrão do sistema');

-- Inserir categorias iniciais
INSERT INTO categorias (nome, descricao, codigo, icone) VALUES
('Instagram', 'Serviços para Instagram', 'instagram', 'instagram'),
('Facebook', 'Serviços para Facebook', 'facebook', 'facebook'),
('TikTok', 'Serviços para TikTok', 'tiktok', 'tiktok'),
('YouTube', 'Serviços para YouTube', 'youtube', 'youtube'),
('LinkedIn', 'Serviços para LinkedIn', 'linkedin', 'linkedin'); 