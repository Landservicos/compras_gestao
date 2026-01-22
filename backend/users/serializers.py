from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import Group
from django.contrib.auth.hashers import make_password
from .models import CustomUser, UserPermission
from tenants.models import Empresa
from tenants.serializers import TenantSerializer

# ---------------------------------------------------------------------
#                >>> LÓGICA DE LOGIN INTELIGENTE <<<
# ---------------------------------------------------------------------
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Tornamos opcional, pois no primeiro passo (apenas user+senha) ele não é enviado
    tenant_schema_name = serializers.CharField(write_only=True, required=False)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        return token

    def validate(self, attrs):
        # 1. Autentica Usuário e Senha (padrão JWT)
        # Se a senha estiver errada, o 'super().validate' já lança erro 401 aqui.
        data = super().validate(attrs)

        # 2. Verifica se o frontend enviou uma empresa específica
        tenant_schema_name = attrs.get('tenant_schema_name')
        
        # 3. Carrega as empresas vinculadas a este usuário
        user_tenants = self.user.tenants.all()
        tenant_count = user_tenants.count()
        selected_tenant = None

        if tenant_schema_name:
            # --- PASSO 2: Login com Empresa Selecionada ---
            try:
                # Tenta buscar na lista de permitidas do usuário
                selected_tenant = user_tenants.get(schema_name=tenant_schema_name)
            except Empresa.DoesNotExist:
                # Se for superusuário (Dev), permite acessar qualquer uma ou o Public
                if self.user.is_superuser:
                    try:
                        selected_tenant = Empresa.objects.get(schema_name=tenant_schema_name)
                    except Empresa.DoesNotExist:
                         raise serializers.ValidationError({"detail": "Empresa não encontrada."})
                else:
                    raise serializers.ValidationError({"detail": "Você não tem permissão nesta empresa."})
        
        else:
            # --- PASSO 1: Login Inicial (Só User + Senha) ---
            
            if tenant_count == 0:
                # Se for Dev sem empresa, tentamos conectar no 'public' para ele não ficar trancado fora
                if self.user.is_superuser:
                    try:
                        selected_tenant = Empresa.objects.get(schema_name='public')
                    except Empresa.DoesNotExist:
                        pass # Segue sem tenant (modo global restrito)
                else:
                    raise serializers.ValidationError({"detail": "Seu usuário não está vinculado a nenhuma empresa."})

            elif tenant_count == 1:
                # CENÁRIO PERFEITO: Só tem uma empresa, entra direto!
                selected_tenant = user_tenants.first()
            
            else:
                # CENÁRIO MÚLTIPLAS: Retorna a lista para o frontend abrir o modal
                # Note que NÃO retornamos 'access' nem 'refresh' aqui, pois o login não terminou.
                return {
                    'action': 'select_tenant', 
                    'tenants': [
                        {'schema_name': t.schema_name, 'nome': t.nome} 
                        for t in user_tenants
                    ]
                }

        # 4. Se definimos um tenant (login concluído), adicionamos info extra
        if selected_tenant:
            data['tenant'] = {
                'schema_name': selected_tenant.schema_name,
                'nome': selected_tenant.nome,
            }
        
        return data

# ... (Mantenha o restante dos serializers LoggedInUserSerializer, UserSerializer, etc. iguais) ...
# Copie o resto do arquivo original aqui abaixo se não houver mudanças neles.
class LoggedInUserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ["id", "username", "email", "role", "is_superuser", "permissions"]

    def get_permissions(self, obj):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None)

        # Começa com as permissões padrão ou específicas do tenant
        if not tenant:
            permissions = UserPermission.get_default_permissions()
        else:
            permissions = UserPermission.get_user_permissions_dict(obj, tenant)

        # Adiciona as permissões globais do próprio usuário
        permissions['can_create_tenant'] = obj.can_create_tenant
        
        # Garante que a permissão de deletar também seja passada corretamente
        # (se o superuser for o único que pode, a lógica em get_user_permissions_dict já cobre isso)
        if 'can_delete_user' not in permissions:
             permissions['can_delete_user'] = False # Garante que a chave exista

        return permissions
        
class UserSerializer(serializers.ModelSerializer):
    tenants = TenantSerializer(many=True, read_only=True)
    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")

    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "role", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser", "groups", "tenants", 
            "can_create_tenant",
        ]
        read_only_fields = ["is_staff", "is_superuser", "groups", "tenants"]

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "username", "email", "password", "role", "is_active",
            "first_name", "last_name"
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_password(self, value: str) -> str:
        return make_password(value)

    def create(self, validated_data):
        user = CustomUser.objects.create(**validated_data)
        return user