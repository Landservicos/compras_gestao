FROM node:18-alpine AS build

WORKDIR /app

# Copia primeiro package e lock (cache eficiente)
COPY package.json package-lock.json ./

RUN npm ci

# Agora copia todo o resto, incluindo tsconfig.json, vite.config.*, src, etc.
COPY . .

RUN npm run build


# --- NGINX ---
FROM nginx:stable

# Copia os arquivos estáticos construídos na etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copia o arquivo de configuração customizado do Nginx para a imagem
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
