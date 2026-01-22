# Sistema de Gestão de Compras e Processos (SGC)

Este é um sistema completo para gestão de processos de compras, gerenciamento de empresas (tenants), usuários e documentos (CRDII). A aplicação foi construída utilizando uma arquitetura moderna separando Backend (API) e Frontend, containerizada com Docker para facilitar o desenvolvimento e o deploy.

## 🚀 Tecnologias Utilizadas

### Backend

- **Python 3**
- **Django & Django REST Framework (DRF)**: Para construção da API.
- **PostgreSQL**: Banco de dados relacional.
- **Gunicorn/Daphne**: Servidor de aplicação WSGI/ASGI.
- **Audit**: Sistema de auditoria de ações (app `audit`).

### Frontend

- **React (Vite)**: Framework JavaScript de alta performance.
- **TypeScript**: Para tipagem estática e segurança de código.
- **CSS Modules/Variables**: Estilização padronizada com variáveis globais.
- **Axios**: Cliente HTTP para comunicação com a API.

### Infraestrutura & DevOps

- **Docker & Docker Compose**: Orquestração de containers.
- **Nginx**: Servidor Web e Proxy Reverso (SSL, arquivos estáticos).
- **Certbot**: Gestão de certificados SSL (Let's Encrypt).
- **Scripts Shell**: Automação de backup, deploy e configuração de SSL.

---

## 📂 Estrutura do Projeto

```text
compras_gestao/
├── backend/            # Código fonte da API Django
│   ├── audit/          # App de auditoria
│   ├── core/           # Configurações principais (settings, urls)
│   ├── purchases/      # Gestão de processos de compra
│   ├── tenants/        # Gestão de empresas
│   ├── users/          # Gestão de usuários e autenticação
│   └── ...
├── frontend/           # Código fonte da interface React
│   ├── src/
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── pages/      # Páginas da aplicação (Dashboard, Processos, etc.)
│   │   ├── services/   # Configuração da API
│   │   └── styles/     # Arquivos CSS globais e de páginas
│   └── ...
├── nginx/              # Configurações do servidor web
├── certbot/            # Configurações de SSL
└── docker-compose.yml  # Orquestração dos serviços
```

---

## ⚙️ Pré-requisitos

Para rodar este projeto, você precisa ter instalado:

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

---

## 🛠️ Instalação e Execução (Docker)

Esta é a maneira recomendada de rodar o projeto.

1.  **Clone o repositório:**

    ```bash
    git clone <url-do-repositorio>
    cd compras_gestao
    ```

2.  **Configure as Variáveis de Ambiente:**
    Copie o arquivo de exemplo e ajuste conforme necessário.

    ```bash
    cp .env.example .env
    ```

    _Edite o arquivo `.env` com suas configurações de banco de dados, chaves secretas e hosts permitidos._

3.  **Suba os containers:**

    ```bash
    docker-compose up -d --build
    ```

4.  **Execute as Migrações e Colete Estáticos:**
    O projeto inclui um script utilitário para isso:

    ```bash
    ./migrate_and_collectstatic.sh
    ```

    _Ou manualmente:_

    ```bash
    docker-compose exec backend python manage.py migrate
    docker-compose exec backend python manage.py collectstatic --noinput
    ```

5.  **Crie um Superusuário (Admin):**
    ```bash
    docker-compose exec backend python manage.py createsuperuser
    ```

### 🌍 Acesso à Aplicação

Dependendo da configuração do seu `docker-compose` e ambiente:

- **Frontend (Aplicação Principal):** `http://localhost:5174` (Dev) ou `http://seu-dominio:8081` (Prod/Nginx)
- **Backend (API):** `http://localhost:8001`

* **Admin do Django:** `http://localhost:8001/admin`

### 📖 Documentação da API (Swagger/Redoc)

O projeto possui documentação automática interativa gerada pelo `drf-spectacular`. Após subir o backend, você pode acessar:

- **Swagger UI:** `http://localhost:8001/api/schema/swagger-ui/` (Interface visual para testar todos os endpoints).
- **Redoc:** `http://localhost:8001/api/schema/redoc/` (Documentação alternativa, mais focada em leitura).
- **JSON Schema:** `http://localhost:8001/api/schema/` (Arquivo raw para importar no Postman ou Insomnia).

---

## 🎨 UI/UX e Padrões de Design

O sistema segue um padrão visual rigoroso para garantir consistência:

- **Largura Padrão:** Todas as páginas administrativas (Dashboard, Listas, Formulários) possuem uma largura máxima de `1600px` centralizada.
- **Cores:** Definidas globalmente em `frontend/src/styles/variables.css`.
- **Status:** Cores padronizadas para status de processos (Parcial: Azul Céu, Concluído: Verde, Cancelado: Vermelho, etc.).

---

## 🔧 Scripts Úteis

O projeto raiz contém scripts para facilitar a manutenção:

- `./deploy.sh`: Script para automatizar o processo de deploy (pull, build, migrate, restart).
- `./backup_db.sh`: Realiza backup do banco de dados PostgreSQL.
- `./init_ssl.sh`: Inicializa e configura certificados SSL com Certbot.
- `./migrate_and_collectstatic.sh`: Roda migrações pendentes e coleta arquivos estáticos do Django.

---

## 🛡️ Desenvolvimento Local (Sem Docker - Opcional)

Caso prefira rodar fora do Docker:

**Backend:**

1.  Crie um ambiente virtual: `python -m venv venv`
2.  Ative: `source venv/bin/activate` (Linux/Mac) ou `venv\Scripts\activate` (Windows)
3.  Instale deps: `pip install -r backend/requirements.txt`
4.  Rode: `python backend/manage.py runserver 8001`

**Frontend:**

1.  Entre na pasta: `cd frontend`
2.  Instale deps: `npm install`
3.  Rode: `npm run dev` (Rodará na porta 5174)

---

## 📚 Documentação Detalhada

Para informações mais aprofundadas sobre a arquitetura e operação do sistema, consulte a pasta `docs/`:

- [🏛️ Arquitetura do Sistema](docs/ARCHITECTURE.md): Detalhes sobre Django Tenants, Frontend e Segurança.
- [🚀 Guia de Deploy](docs/DEPLOYMENT.md): Portas, Scripts de Automação e SSL.
- [📖 Manual do Usuário](docs/USER_MANUAL.md): Guia básico de uso do sistema.

---

---

## 📝 Licença

Este projeto está sob a licença [Privada].
