import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()


BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev_secret_key_for_testing_purposes_only"
    else:
        # Em produção, a ausência da chave é um erro fatal.
        raise ValueError("A variável de ambiente SECRET_KEY deve ser definida em produção.")

ALLOWED_HOSTS_FROM_ENV = [
    host.strip() for host in os.environ.get("ALLOWED_HOSTS", "").split(",") if host.strip()
]

if DEBUG:
    # Em desenvolvimento, permite localhost e
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"] + ALLOWED_HOSTS_FROM_ENV
else:
    # Em produção, exige que a variável tenha sido definida.
    if not ALLOWED_HOSTS_FROM_ENV:
        raise ValueError("A variável de ambiente ALLOWED_HOSTS deve ser definida em produção.")
    ALLOWED_HOSTS = ALLOWED_HOSTS_FROM_ENV

# Remove duplicatas para limpeza.
ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))

# --- CORREÇÃO PARA O ERRO 403 (CSRF) ---
CSRF_TRUSTED_ORIGINS_ENV = os.environ.get("CSRF_TRUSTED_ORIGINS")
if CSRF_TRUSTED_ORIGINS_ENV:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS_ENV.split(",")]
else:
    CSRF_TRUSTED_ORIGINS = []

# Adiciona localhost para desenvolvimento, se necessário
if DEBUG and not CSRF_TRUSTED_ORIGINS:
     CSRF_TRUSTED_ORIGINS = ['http://localhost:5174', 'http://127.0.0.1:5174']

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True



SHARED_APPS = [
    'django_tenants',
    'tenants',
    'users', 
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.admin',
    'django.contrib.messages',
    'django.contrib.staticfiles', 
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
]

TENANT_APPS = (
    'purchases',
    'audit',
)


# Combina os aplicativos compartilhados e de tenants
INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "tenants.Empresa"
TENANT_DOMAIN_MODEL = "tenants.Dominio"

DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

MIDDLEWARE = [
    # 'django_tenants.middleware.main.TenantMainMiddleware', # Removido para usar a versão customizada abaixo
    'core.middleware.TenantIdentificationMiddleware',
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "audit.middleware.AuditMiddleware",
]
ROOT_URLCONF = "core.urls"

# Configuração para identificar o tenant via cabeçalho HTTP
TENANT_IDENTIFIER_CLASS = 'django_tenants.middleware.identificators.HeaderIdentificator'
TENANT_IDENTIFIER_HEADER = 'X-Tenant-ID'


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            os.path.join(BASE_DIR, "..", "frontend", "dist"),
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "core.wsgi.application"
if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": os.environ.get("POSTGRES_DB"),
            "USER": os.environ.get("POSTGRES_USER"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD"),
            "HOST": os.environ.get("POSTGRES_HOST", "db"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Define o modelo de usuário customizado como o padrão para o projeto
AUTH_USER_MODEL = "users.CustomUser"

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- Configurações do Django REST Framework e JWT ---

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/minute",
        "user": "1000/day",
        "login": "5/minute", # Throttle especifico para login
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Gestão de Compras API',
    'DESCRIPTION': 'API para sistema de gestão de compras e processos.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # 'OTHER_SETTINGS': ...
}

SIMPLE_JWT = {
    # Configurações de tempo de vida dos tokens JWT
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    # Tempo de vida do token de atualização (refresh token)
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# --- Configurações de CORS (Cross-Origin Resource Sharing) ---
CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    # Em desenvolvimento, não podemos usar CORS_ALLOW_ALL_ORIGINS = True com Credentials
    CORS_ALLOW_ALL_ORIGINS = False
    # Liste aqui as origens do seu frontend em desenvolvimento (Vite geralmente é 5173)
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
else:
    # Em produção, apenas origens listadas na variável de ambiente são permitidas.
    CORS_ALLOW_ALL_ORIGINS = False
    cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS")
    if not cors_origins:
        raise ValueError("A variável de ambiente CORS_ALLOWED_ORIGINS deve ser definida em produção (ex: 'https://meufrontend.com').")
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(",")]

LOGIN_REDIRECT_URL = "/"

# Adiciona o diretório de build do frontend para que o Django encontre os arquivos estáticos do React.
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "..", "frontend", "dist", "static"),
]