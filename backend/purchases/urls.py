from django.urls import path, include
from rest_framework import routers
from .views import (
    DashboardStatsView,
    ComprasPorMesView,
    ProcessoViewSet,
    ArquivoViewSet,
    LogUsoViewSet,
    CRDIIViewSet,
)

router = routers.DefaultRouter()
router.register(r"processos", ProcessoViewSet)
router.register(r"crdiis", CRDIIViewSet) # Correção: Removido o basename desnecessário
router.register(r"arquivos", ArquivoViewSet)
router.register(r"logs", LogUsoViewSet)
# A rota da API de usuários foi movida para fora do prefixo 'admin' para evitar conflitos.

urlpatterns = [
    path("", include(router.urls)),
    # --- URL PARA O DASHBOARD ---
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path(
        "dashboard/compras-por-mes/",
        ComprasPorMesView.as_view(),
        name="compras-por-mes",
    ),
]
