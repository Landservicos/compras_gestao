from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API principal
    path("api/", include("core.api_urls")),

    # API Documentation (Swagger/Redoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # A rota "catch-all" deve estar aqui, no URLconf raiz,
    # para capturar todas as rotas que não são da API.
    re_path(
        r"^(?!api/|admin/|admin$|static/|media/).*$",
        TemplateView.as_view(template_name="index.html"),
    ),
]

# Adiciona as rotas para servir arquivos estáticos e de mídia em modo de desenvolvimento.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # A linha abaixo é crucial para servir os arquivos estáticos do React.
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
