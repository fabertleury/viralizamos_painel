#!/bin/bash

# Script para build e deploy do painel Viralizamos
# Uso: ./scripts/deploy.sh [prod|staging]

set -e

echo "===== DEPLOY PAINEL VIRALIZAMOS ====="
echo "Iniciando processo de build e deploy..."

# Verificar ambiente
ENV=${1:-"prod"}
echo "Ambiente: $ENV"

# Configurar variáveis baseadas no ambiente
if [ "$ENV" = "prod" ]; then
  SITE_URL="https://painel.viralizamos.com"
else
  SITE_URL="http://localhost:3000"
fi

# Garantir permissões
chmod +x scripts/deploy.sh

# Limpar cache do npm
echo "Limpando cache do npm..."
npm cache clean --force

# Instalar dependências
echo "Instalando dependências..."
npm ci --legacy-peer-deps

# Verificar arquivos críticos
echo "Verificando arquivos críticos..."
if [ ! -f "src/pages/usuarios.tsx" ]; then
  echo "ERRO: Arquivo src/pages/usuarios.tsx não encontrado!"
  exit 1
fi

echo "Configurando variáveis de ambiente para build..."
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_DISABLE_ESLINT=1
export NEXT_PUBLIC_PAINEL_URL=$SITE_URL

# Executar build
echo "Executando build seguro..."
npm run build:safe

# Verificar resultado do build
if [ $? -ne 0 ]; then
  echo "ERRO: Build falhou!"
  exit 1
fi

echo "Build concluído com sucesso!"

# Construir imagem Docker
echo "Construindo imagem Docker..."
docker build -t viralizamos-painel:latest .

# Iniciar container
echo "Iniciando container..."
docker-compose up -d

echo "===== DEPLOY CONCLUÍDO COM SUCESSO! ====="
echo "O painel Viralizamos está disponível em: $SITE_URL" 