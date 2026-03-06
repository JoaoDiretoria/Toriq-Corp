# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Build args para Vite
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_ESOCIAL_BACKEND_URL
ARG VITE_ESOCIAL_CONFIG_API_KEY

# Instalar dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fonte e buildar
COPY . .
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}
ENV VITE_ESOCIAL_BACKEND_URL=${VITE_ESOCIAL_BACKEND_URL}
ENV VITE_ESOCIAL_CONFIG_API_KEY=${VITE_ESOCIAL_CONFIG_API_KEY}
RUN npm run build

# Runtime stage (Nginx)
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Limpar conteúdo padrão do Nginx
RUN rm -rf ./*

# Copiar build gerado pelo Vite
COPY --from=builder /app/dist .

# Configuração customizada de SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
