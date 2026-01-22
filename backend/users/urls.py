from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CookieTokenObtainPairView, UserManagementViewSet, CurrentUserView, LogoutView

router = DefaultRouter()
router.register(r"users", UserManagementViewSet, basename="users")

urlpatterns = [
    # A rota principal de login
    path("login/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("", include(router.urls)),
]