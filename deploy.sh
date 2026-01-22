#!/bin/bash
# simples script de deploy que puxa do git (assume que repo já está no servidor)
set -e
echo "Parando containers antigos (se houver)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml down || true
echo "Pull latest (se for git pull)"
git pull || true
echo "Construindo imagens"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
echo "Subindo serviços"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Aguardando os serviços estabilizarem..."
sleep 10 # Adiciona uma pausa de 10 segundos para garantir que o backend esteja pronto

echo "Aplicando migrations"
./migrate_and_collectstatic.sh
echo "Deploy completo"
