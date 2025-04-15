FROM node:18-alpine AS builder

WORKDIR /app

# Instalar ferramentas básicas
RUN apk add --no-cache curl libc6-compat

# Configurar ambiente
ENV NODE_ENV=production

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências com CI para garantir instalação consistente
RUN npm ci

# Copiar o resto do código
COPY . .

# Construir a aplicação
RUN npm run build

# Segunda etapa para menor tamanho final
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar apenas os arquivos necessários
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Criar script de inicialização
RUN echo '#!/bin/sh' > start.sh \
    && echo 'echo "=== STARTING VIRALIZAMOS PAINEL ADMIN ==="' >> start.sh \
    && echo 'echo "📋 Verificando ambiente:"' >> start.sh \
    && echo 'echo "- Diretório atual: $(pwd)"' >> start.sh \
    && echo 'echo "- Arquivos: $(ls -la)"' >> start.sh \
    && echo 'echo "🚀 Iniciando servidor..."' >> start.sh \
    && echo 'exec npm start' >> start.sh \
    && chmod +x ./start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000

# Iniciar a aplicação
CMD ["./start.sh"] 