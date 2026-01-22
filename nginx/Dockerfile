# Estágio 1: Build do Frontend
FROM node:18-alpine AS frontend-builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY ./frontend/package*.json ./
RUN npm install

# Copia todo o código do frontend e executa o build
COPY ./frontend/ ./
RUN npm run build

# Estágio 2: Configuração do Nginx
FROM nginx:stable

# Copia os arquivos estáticos do frontend (gerados no estágio anterior) para o diretório do Nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copia a configuração do Nginx específica para produção
COPY ./nginx/site.prod.conf /etc/nginx/conf.d/default.conf