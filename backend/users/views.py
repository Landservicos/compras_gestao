from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import PermissionDenied, ObjectDoesNotExist
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings

from .models import CustomUser, UserPermission
from .permissions import CanManageUser, IsAdminUser, ROLE_HIERARCHY
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    LoggedInUserSerializer,
    MyTokenObtainPairSerializer,
)
from .throttles import LoginRateThrottle

class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            
            if access_token:
                response.set_cookie(
                    'access_token',
                    access_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                )
            if refresh_token:
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                )
        return response

class CookieTokenRefreshView(TokenRefreshView):
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        
        if refresh_token and 'refresh' not in request.data:
            # Se for JSON dict, é mutável. Se for QueryDict, precisamos forçar.
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
                request.data['refresh'] = refresh_token
                request.data._mutable = False
            else:
                request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh') # Pode vir se ROTATE_REFRESH_TOKENS=True

            if access_token:
                response.set_cookie(
                    'access_token',
                    access_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                )
            
            if refresh_token:
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                )
        return response

class LogoutView(APIView):
    permission_classes = [] 

    def post(self, request):
        response = Response({"message": "Logged out successfully"})
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        return response

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        # Passa o request no contexto para o serializer saber o tenant
        serializer = LoggedInUserSerializer(user, context={'request': request})
        return Response(serializer.data)

class UserManagementViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        """
        Define permissões dinamicamente com base na ação.
        - Ações de leitura ('list', 'retrieve') exigem apenas acesso à página.
        - Ações de escrita ('create', 'update', etc.) exigem permissões de gerenciamento.
        """
        if self.action in ['list', 'retrieve']:
            self.permission_classes = [IsAdminUser]
        else:
            self.permission_classes = [IsAdminUser, CanManageUser]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        tenant = self.request.tenant

        # Otimização: Pré-busca os tenants e os domínios desses tenants
        # para evitar um problema de N+1 aninhado no serializer.
        base_queryset = CustomUser.objects.prefetch_related(
            'tenants__domains'
        )

        # 1. Superusuário ou Dev vê tudo do tenant atual
        if user.is_superuser or user.role == "dev":
            # Se for superuser no public, vê tudo globalmente
            if tenant.schema_name == 'public':
                return base_queryset.all().order_by("username")
            # Caso contrário, vê tudo do tenant atual
            return base_queryset.filter(tenants=tenant).order_by("username").distinct()

        # 2. Lógica de Hierarquia: vê apenas níveis iguais ou inferiores
        user_level = ROLE_HIERARCHY.get(user.role, 0)
        
        allowed_roles = [
            role for role, level in ROLE_HIERARCHY.items() 
            if level <= user_level
        ]

        # Adicionado .distinct() para evitar duplicatas ao filtrar por M2M
        return base_queryset.filter(
            tenants=tenant,
            role__in=allowed_roles
        ).order_by("username").distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=["get", "put"], url_path="permissions")
    def permissions(self, request, pk=None):
        user = self.get_object()
        tenant = request.tenant

        if request.method == "GET":
            # 1. Pega as permissões baseadas no tenant
            permissions_data = UserPermission.get_user_permissions_dict(user, tenant)
            # 2. Adiciona permissões globais do próprio usuário
            permissions_data['can_create_tenant'] = user.can_create_tenant
            permissions_data['allowed_tenants'] = list(user.tenants.all().values_list('id', flat=True))
            return Response(permissions_data)

        elif request.method == "PUT":
            data_to_update = request.data.get("permissions", request.data)
            
            # 1. Checa e atualiza a permissão global 'can_create_tenant' no usuário
            if 'can_create_tenant' in data_to_update:
                can_create = data_to_update.pop('can_create_tenant')
                if isinstance(can_create, bool):
                    user.can_create_tenant = can_create
                    user.save(update_fields=['can_create_tenant'])

            # 2. Lida com a associação de tenants (empresas)
            if 'allowed_tenants' in data_to_update:
                tenant_ids = data_to_update.pop('allowed_tenants')
                if isinstance(tenant_ids, list):
                    # O método .set() espera IDs, o que o frontend deve enviar
                    user.tenants.set(tenant_ids)

            # 3. Atualiza o resto das permissões (que são específicas por tenant)
            UserPermission.update_user_permissions(user, tenant, data_to_update)
            
            return Response(
                {"status": "permissions updated"}, status=status.HTTP_200_OK
            )

    def perform_create(self, serializer):
        user = serializer.save()
        # Associa o novo usuário ao tenant do admin que o criou
        user.tenants.add(self.request.tenant)

    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
