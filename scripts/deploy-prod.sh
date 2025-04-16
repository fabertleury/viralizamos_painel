#!/bin/bash

# Script para deploy em produção do painel Viralizamos
# Uso: ./scripts/deploy-prod.sh

set -e

echo "===== DEPLOY PAINEL VIRALIZAMOS (PRODUÇÃO) ====="
echo "Iniciando processo de deploy para produção..."

# Verificar se estamos no branch main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "AVISO: Você não está no branch main (branch atual: $CURRENT_BRANCH)"
  read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
  if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
    echo "Deploy cancelado."
    exit 0
  fi
fi

# Verificar existência do arquivo .env.production
if [ ! -f ".env.production" ]; then
  echo "ERRO: Arquivo .env.production não encontrado!"
  echo "Por favor, crie o arquivo .env.production com as variáveis de ambiente para produção."
  exit 1
fi

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

# Configurar variáveis de ambiente para produção
echo "Configurando variáveis de ambiente para produção..."
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_DISABLE_ESLINT=1
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production

# Copiar .env.production para .env para o build
echo "Copiando .env.production para .env..."
cp .env.production .env

# Executar build
echo "Executando build para produção..."
npm run build:safe

# Verificar resultado do build
if [ $? -ne 0 ]; then
  echo "ERRO: Build falhou!"
  exit 1
fi

echo "Build concluído com sucesso!"

# Construir imagem Docker
echo "Construindo imagem Docker para produção..."
docker build -t viralizamos-painel:prod -f Dockerfile .
docker tag viralizamos-painel:prod viralizamos/painel:latest
docker tag viralizamos-painel:prod viralizamos/painel:$(date +%Y%m%d%H%M)

# Fazer login no Docker Hub (se necessário)
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
  echo "Fazendo login no Docker Hub..."
  echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

# Enviar imagem para o registro
echo "Enviando imagem para o registro..."
docker push viralizamos/painel:latest
docker push viralizamos/painel:$(date +%Y%m%d%H%M)

# Conectar ao servidor de produção e atualizar
echo "Conectando ao servidor de produção..."
if [ -z "$PROD_SSH_KEY" ]; then
  echo "ERRO: Variável PROD_SSH_KEY não definida!"
  echo "Por favor, defina a variável com o caminho para a chave SSH do servidor de produção."
  exit 1
fi

# Comando para executar no servidor de produção
REMOTE_COMMAND="cd /opt/viralizamos && docker-compose pull painel && docker-compose up -d painel && docker system prune -f"

# Executar comando no servidor de produção
ssh -i "$PROD_SSH_KEY" "$PROD_USER@$PROD_HOST" "$REMOTE_COMMAND"

echo "===== DEPLOY EM PRODUÇÃO CONCLUÍDO COM SUCESSO! ====="
echo "O painel Viralizamos está disponível em: https://painel.viralizamos.com" 