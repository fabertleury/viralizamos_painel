FROM node:18-alpine AS builder

WORKDIR /app

# Instalar ferramentas básicas e dependências necessárias
RUN apk add --no-cache curl libc6-compat python3 make g++

# Configurar ambiente
ENV NODE_ENV=production
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar arquivos de dependências
COPY package.json package-lock.json ./
COPY .npmrc ./

# Limpar cache do npm e instalar dependências
RUN npm cache clean --force && \
    npm install --production=false --frozen-lockfile=false

# Copiar o resto do código
COPY . .

# Verificar estrutura de diretórios
RUN echo "Verificando estrutura de diretórios:" && \
    ls -la && \
    echo "Conteúdo da pasta src:" && \
    ls -la src/

# Construir a aplicação
RUN npm run build

# Segunda etapa para menor tamanho final
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NEXT_TELEMETRY_DISABLED=1

# Copiar apenas os arquivos necessários
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.example ./.env

# Criar script de inicialização
RUN echo '#!/bin/sh' > start.sh \
    && echo 'echo "=== STARTING VIRALIZAMOS PAINEL ADMIN ==="' >> start.sh \
    && echo 'echo "📋 Verificando ambiente:"' >> start.sh \
    && echo 'echo "- Diretório atual: $(pwd)"' >> start.sh \
    && echo 'echo "- Arquivos: $(ls -la)"' >> start.sh \
    && echo 'echo "- Conteúdo da pasta .next:"' >> start.sh \
    && echo 'ls -la .next/' >> start.sh \
    && echo 'echo "🚀 Iniciando servidor..."' >> start.sh \
    && echo 'exec npm start' >> start.sh \
    && chmod +x ./start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

# Iniciar a aplicação
CMD ["./start.sh"] 