# Guia de Implantação (Deployment)

Este documento detalha o processo de colocar e manter o SGC em produção.

## 🌍 Infraestrutura e Portas

Para evitar conflitos em VPS compartilhados, este projeto utiliza portas não-padrão:

| Serviço | Porta Interna (Docker) | Porta Externa (Host) | Descrição |
| :--- | :--- | :--- | :--- |
| **Nginx (Frontend)** | 80 | **8081** | Ponto de entrada principal da aplicação. |
| **Django (Backend)** | 8000 | **8001** | API REST (acessada pelo Nginx). |
| **PostgreSQL** | 5432 | **5434** | Banco de dados (acesso externo restrito). |

> **Nota:** O Frontend em desenvolvimento (`npm run dev`) roda na porta `5174`.

## 🚀 Script de Deploy Automatizado

Na raiz do projeto existe o script `./deploy.sh` que realiza as seguintes ações:

1.  **Git Pull:** Atualiza o código com a branch atual.
2.  **Docker Build:** Reconstrói as imagens se houver mudanças no `Dockerfile`.
3.  **Docker Up:** Reinicia os containers em modo `detached`.
4.  **Migrate:** Executa migrações pendentes no banco de dados.
5.  **Collectstatic:** Coleta arquivos estáticos do Django.
6.  **Prune:** Limpa imagens Docker antigas para economizar espaço.

**Uso:**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔒 SSL e HTTPS (Certbot)

O projeto já possui configuração para **Let's Encrypt** via container `certbot`.

1.  **Primeira Execução:**
    Edite o arquivo `init_ssl.sh` com seu domínio e e-mail.
    Execute:
    ```bash
    ./init_ssl.sh
    ```

2.  **Renovação:**
    O Certbot verifica a renovação automaticamente a cada 12 horas.

## 📦 Backup do Banco de Dados

O script `./backup_db.sh` gera um dump completo do PostgreSQL.

**Uso Manual:**
```bash
./backup_db.sh
```
*Recomendação: Adicione este script ao `crontab` do servidor para execução diária.*

## 🔧 Variáveis de Ambiente (.env)

Em produção, certifique-se de definir:

*   `DEBUG=False`
*   `ALLOWED_HOSTS=seu-dominio.com`
*   `CORS_ALLOWED_ORIGINS=https://seu-dominio.com:8081`
*   `CSRF_TRUSTED_ORIGINS=https://seu-dominio.com:8081`
