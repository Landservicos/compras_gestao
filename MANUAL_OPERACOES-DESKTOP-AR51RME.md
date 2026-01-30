# 📘 Manual de Operações — Compras & Gestão

IP da VPS: 191.252.159.222  
Domínio: landgestao.vps-kinghost.net

---

## 🚀 1. AMBIENTE DE PRODUÇÃO (VPS)

⚠️ Use estes comandos **somente** quando conectado via **SSH na VPS**.  
Todos os comandos usam explicitamente `docker-compose.prod.yml`.

---

### 🔄 Rotina de Deploy

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate_schemas
docker compose -f docker-compose.prod.yml up -d --build nginx
```

---

### 🛠 Gerenciamento Diário

Status:
```bash
docker compose -f docker-compose.prod.yml ps
```

Logs:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
```

Restart geral:
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

### 🔐 SSL / Certbot

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
--webroot \
--webroot-path=/var/www/certbot \
--email land.servicos@landse.com.br \
--agree-tos \
--no-eff-email \
-d landgestao.vps-kinghost.net
```

---

## 🛠 2. AMBIENTE DE DESENVOLVIMENTO (LOCAL)

```bash
docker compose up -d --build
docker compose down
docker compose down --remove-orphans
```

---

### 🐍 Django — Comandos Úteis

```bash
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate_schemas
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py changepassword dev
```

---

## 🏢 3. BOOTSTRAP DO SISTEMA (TENANTS + ADMIN)

⚠️ **ATENÇÃO:**  
- O script de **DESENVOLVIMENTO** é destrutivo e automático  
- O script de **PRODUÇÃO** é seguro, controlado por variáveis de ambiente  

---

### ▶️ Entrar no shell

Produção:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

Desenvolvimento:
```bash
docker compose exec backend python manage.py shell
```

---

## 🧪 SCRIPT — DESENVOLVIMENTO (RESET / BOOTSTRAP)

✔️ Permitido em DEV  
❌ **NUNCA usar em produção**

```python
from django.contrib.auth import get_user_model
from tenants.models import Empresa, Dominio
import os

User = get_user_model()

DOMAIN_URL = "localhost"

public_tenant, _ = Empresa.objects.get_or_create(
    schema_name="public",
    defaults={"nome": "Public Tenant", "is_active": True}
)

Dominio.objects.get_or_create(
    domain=DOMAIN_URL,
    tenant=public_tenant,
    defaults={"is_primary": True}
)

USERNAME = "dev"
PASSWORD = "dev123"

user, _ = User.objects.get_or_create(
    username=USERNAME,
    defaults={"email": "dev@local.dev"}
)

user.role = "dev"
user.set_password(PASSWORD)
user.is_superuser = True
user.is_staff = True
user.save()

user.tenants.add(public_tenant)
user.save()

print("✅ DEV BOOTSTRAP FINALIZADO")
print(f"Admin: http://{DOMAIN_URL}/admin")
print(f"Login: {USERNAME}")
print(f"Senha: {PASSWORD}")
```

---

## 🔐 SCRIPT — PRODUÇÃO (SEGURO)

✔️ Permitido em PRODUÇÃO  
🔐 **Sem senha hardcoded**  
🛡️ Protegido por variáveis de ambiente

```python
from django.contrib.auth import get_user_model
from tenants.models import Empresa, Dominio
import os
import sys

User = get_user_model()

if os.getenv("DJANGO_ENV") != "production":
    print("❌ Script permitido apenas em PRODUÇÃO")
    sys.exit(1)

DOMAIN_URL = os.getenv("PUBLIC_DOMAIN")
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@empresa.com")

if not all([DOMAIN_URL, ADMIN_USER, ADMIN_PASS]):
    raise Exception("❌ Variáveis de ambiente obrigatórias não definidas")

public_tenant, _ = Empresa.objects.get_or_create(
    schema_name="public",
    defaults={"nome": "Public Tenant", "is_active": True}
)

Dominio.objects.get_or_create(
    domain=DOMAIN_URL,
    tenant=public_tenant,
    defaults={"is_primary": True}
)

user, created = User.objects.get_or_create(
    username=ADMIN_USER,
    defaults={"email": ADMIN_EMAIL}
)

if created:
    user.set_password(ADMIN_PASS)
    user.is_superuser = True
    user.is_staff = True
    user.role = "admin"
    user.save()
    user.tenants.add(public_tenant)
    print("✅ Admin criado com sucesso")
else:
    print("ℹ️ Admin já existente — nenhuma alteração feita")

print(f"🔗 Admin: https://{DOMAIN_URL}/admin")
```

### 📄 Exemplo de `.env` em PRODUÇÃO

```env
DJANGO_ENV=production
PUBLIC_DOMAIN=landgestao.vps-kinghost.net
ADMIN_USERNAME=admin_land
ADMIN_PASSWORD=senha_forte_aqui
ADMIN_EMAIL=admin@landservicos.com.br
```

---

## 🧹 4. SOLUÇÃO DE PROBLEMAS (SOS)

Reset total do Docker (**CUIDADO**):

```bash
docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
docker system prune -a -f
```

Volumes (APAGA BANCO):
```bash
# docker volume prune -f
```

---

## 🗄 Banco de Dados

```bash
docker compose exec db psql -U user_dev -d compras_dev
```

Dentro do psql:
```sql
\dn
\dt public.*
```
