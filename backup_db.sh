#!/bin/bash
# Faz dump do banco Postgres para backups dir
set -e
OUTDIR=./backups
mkdir -p $OUTDIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec $(docker-compose ps -q db) pg_dump -U ${POSTGRES_USER:-compras} ${POSTGRES_DB:-compras} > $OUTDIR/db_$TIMESTAMP.sql
echo "Backup salvo em $OUTDIR/db_$TIMESTAMP.sql"
