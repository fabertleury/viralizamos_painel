# Viralizamos - Painel Administrativo

Este é o painel administrativo centralizado para o sistema Viralizamos, que integra informações dos diferentes microserviços da plataforma.

## Descrição

O painel administrativo fornece uma interface única para gerenciar:

- **Dashboard**: Visão geral do sistema com estatísticas e gráficos
- **Transações**: Gerenciamento e visualização de todas as transações do Mercado Pago
- **Pedidos**: Acompanhamento e gestão de pedidos enviados aos fornecedores
- **Usuários**: Administração de contas de clientes e administradores

## Arquitetura

O sistema segue uma arquitetura de microserviços, onde:

- **viralizamos**: Site principal com a interface de usuário
- **viralizamos_orders**: Microserviço responsável pelo processamento de pedidos
- **viralizamos_pagamentos_novo**: Microserviço responsável pelo processamento de pagamentos
- **viralizamos_painel_novo**: Painel administrativo central (este projeto)

### Tecnologias

- **Frontend**: Next.js, Chakra UI, React
- **Backend**: Node.js, PostgreSQL
- **Infraestrutura**: Railway

## Requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL
- Redis (opcional, usado para cache)

## Instalação

1. Clone o repositório:
```bash
git clone [URL-do-repositório]
cd viralizamos_painel_novo
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (copie e edite o arquivo .env.example):
```bash
cp .env.example .env
# Edite o arquivo .env com as configurações corretas
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Configuração

O arquivo `.env` deve conter as seguintes configurações:

```
# Configurações do banco de dados do painel
DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Configurações do banco de dados de pagamentos
PAGAMENTOS_DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Configurações do banco de dados de orders
ORDERS_DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Configuração do Redis
REDIS_URL=redis://usuario:senha@host:porta

# URLs dos microserviços
NEXT_PUBLIC_PAGAMENTOS_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ORDERS_API_URL=http://localhost:3002/api

# URL do painel
NEXT_PUBLIC_PAINEL_URL=https://painel.viralizamos.com

# Configurações do NextAuth (para autenticação)
NEXTAUTH_URL=https://painel.viralizamos.com
NEXTAUTH_SECRET=sua-chave-secreta-para-producao
```

## Uso

Acesse a aplicação em desenvolvimento através do URL:
```
http://localhost:3000
```

Para produção, utilize:
```
https://painel.viralizamos.com
```

### Credenciais de teste

Para fins de desenvolvimento, você pode utilizar as seguintes credenciais:
- Email: admin@viralizamos.com
- Senha: admin123

## Desenvolvimento

### Comandos disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Compila o projeto para produção
- `npm start`: Inicia o servidor em modo de produção
- `npm run lint`: Executa a verificação de código com ESLint

## Implantação

Para realizar o deploy, utilize:

```bash
npm run build
npm start
```

Para ambientes de produção, recomenda-se o uso de serviços como Railway ou Vercel para implantação contínua.

## Contato

Para mais informações, entre em contato com a equipe de desenvolvimento do Viralizamos. 