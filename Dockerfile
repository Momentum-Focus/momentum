# ============================================
# STAGE 1: Development - Para desenvolvimento local
# ============================================
FROM node:20-alpine AS development

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies)
RUN npm ci

# Copiar código fonte
COPY . .

# Expor porta do Vite (conforme vite.config.ts: porta 8080)
EXPOSE 8080

# Comando para desenvolvimento com hot-reload
# O flag --host é obrigatório para o Vite funcionar no Docker
CMD ["npm", "run", "dev", "--", "--host"]

# ============================================
# STAGE 2: Builder - Compila a aplicação
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Argumentos de build (variáveis de ambiente do Vite)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build da aplicação (gera a pasta dist)
RUN npm run build

# ============================================
# STAGE 3: Production - Servidor Nginx
# ============================================
FROM nginx:alpine AS production

WORKDIR /usr/share/nginx/html

# Remover arquivos padrão do Nginx
RUN rm -rf ./*

# Copiar arquivos buildados do estágio builder
COPY --from=builder /app/dist .

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80 (Nginx)
EXPOSE 80

# Nginx inicia automaticamente (comando padrão do nginx:alpine)
CMD ["nginx", "-g", "daemon off;"]

