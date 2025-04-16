FROM node:18-alpine AS base

# Instalar dependências básicas
RUN apk add --no-cache libc6-compat python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Configurações para aumentar a estabilidade do build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Etapa de instalação de dependências
FROM base AS deps
WORKDIR /app

# Copiar apenas arquivos de configuração de dependências
COPY package.json package-lock.json .npmrc ./

# Limpar cache e instalar dependências
RUN npm cache clean --force && \
    npm ci --production=false --no-audit

# Etapa de construção
FROM base AS builder
WORKDIR /app

# Copiar dependências da etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Usar arquivo de ambiente específico de produção
COPY .env.production .env

# Desativar eslint e typescript checking para o build
ENV NEXT_DISABLE_ESLINT=1

# Build
RUN npm run build

# Etapa de produção
FROM base AS runner
WORKDIR /app

# Variáveis de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3000

# Copiar apenas os arquivos necessários para produção
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.production ./.env

# Expor porta
EXPOSE 3000

# Verificação de saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando para iniciar
CMD ["npm", "start"] 