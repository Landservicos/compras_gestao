#!/bin/sh
set -e

# Define o template e o arquivo de saída
TEMPLATE_FILE="/etc/nginx/templates/default.conf.template"
OUTPUT_FILE="/etc/nginx/conf.d/default.conf"

# Substitui as variáveis de ambiente no template e salva no arquivo de saída
envsubst '${BACKEND_HOST}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"

# Executa o comando original do Nginx
exec "$@"