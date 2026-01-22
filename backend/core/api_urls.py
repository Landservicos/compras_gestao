from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import CookieTokenObtainPairView, CookieTokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

router = DefaultRouter()
# As rotas de usuários agora estão agrupadas em 'users.urls'

urlpatterns = [
    # Swagger / OpenAPI Docs
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

     # Agrupa todas as rotas de autenticação e gerenciamento de usuários
    path("auth/", include("users.urls")), # ex: /api/auth/users/, /api/auth/permissions/, /api/auth/logout/
    # Rotas de negócio (ex: /api/processos/, /api/arquivos/)
    path("", include("purchases.urls")),
    # Rotas de gerenciamento de tenants (ex: /api/empresas/)
    path("", include("tenants.urls")),
    # Rotas de obtenção de token JWT (Legacy support or direct usage)
    path('token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
]