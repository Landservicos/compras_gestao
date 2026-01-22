#!/bin/bash
set -e
echo "Applying migrations..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python manage.py migrate
echo "Collecting static files..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
echo "Creating superuser (interactive)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python manage.py createsuperuser || true
