FROM python:3.11-slim-bookworm

# Força a reconstrução para contornar problemas de cache
ENV PYTHONUNBUFFERED 1

WORKDIR /code

COPY requirements.txt /code/

RUN pip install --no-cache-dir -r requirements.txt

# Instala o Rclone
RUN apt-get update && apt-get install -y --no-install-recommends rclone \
    && rm -rf /var/lib/apt/lists/*

COPY . /code/