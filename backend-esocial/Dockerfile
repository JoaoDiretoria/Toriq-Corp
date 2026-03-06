# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependências do backend
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar código fonte do backend e buildar
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copiar apenas arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Criar diretórios necessários
RUN mkdir -p logs /certs && chown -R backend:nodejs logs /certs

USER backend

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
