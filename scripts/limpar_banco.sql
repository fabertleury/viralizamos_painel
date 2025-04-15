-- Script para limpar o banco de dados do painel Viralizamos
-- Remover todas as tabelas desnecessárias e manter apenas as essenciais

-- Desativar verificação de chaves estrangeiras durante a limpeza
SET session_replication_role = 'replica';

-- Remover tabelas existentes identificadas no banco de dados
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "order_logs" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "payment_requests" CASCADE;
DROP TABLE IF EXISTS "providers" CASCADE;
DROP TABLE IF EXISTS "services" CASCADE;
DROP TABLE IF EXISTS "socials" CASCADE;
DROP TABLE IF EXISTS "subcategories" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;

-- Remover tabelas do nosso esquema para garantir recriação limpa
DROP TABLE IF EXISTS "usuariospermissoes" CASCADE;
DROP TABLE IF EXISTS "permissoes" CASCADE;
DROP TABLE IF EXISTS "configuracoessistema" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;

-- Remoção de outras tabelas que podem existir
DROP TABLE IF EXISTS usuarioslogacessos CASCADE;
DROP TABLE IF EXISTS relatorios CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS metricas_usuarios CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS integracao_provedores CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS cadastros CASCADE;
DROP TABLE IF EXISTS analises CASCADE;
DROP TABLE IF EXISTS relatorios_programados CASCADE;
DROP TABLE IF EXISTS campanhas CASCADE;
DROP TABLE IF EXISTS emails_enviados CASCADE;
DROP TABLE IF EXISTS mensagens CASCADE;
DROP TABLE IF EXISTS upload_arquivos CASCADE;

-- Reativar verificação de chaves estrangeiras
SET session_replication_role = 'origin';

-- Criar tabelas do nosso esquema simplificado
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

CREATE TABLE permissoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  descricao VARCHAR(255),
  codigo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuariospermissoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permissao_id INTEGER NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, permissao_id)
);

CREATE TABLE configuracoessistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  grupo VARCHAR(50),
  descricao TEXT
);

-- Inserir usuário administrador
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