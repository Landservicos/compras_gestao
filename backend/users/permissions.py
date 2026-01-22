from rest_framework.permissions import BasePermission
from .models import UserPermission

# Hierarquia numérica (Deve bater com o frontend)
ROLE_HIERARCHY = {
    "dev": 100,
    "diretoria": 90,
    "gestor": 90,
    "administrador": 70,
    "financeiro": 60,
    "compras": 50,
    "obra": 10,
}

class IsAdminUser(BasePermission):
    """
    Define quem pode ACESSAR a rota de usuários (Listar/Ver).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Verifica a permissão de página no nosso sistema customizado
        # Importante: Passamos o request.tenant para saber de qual empresa estamos falando
        perms = UserPermission.get_user_permissions_dict(request.user, request.tenant)
        
        # A permissão para ver a página de usuários agora é controlada pela sub-chave 'usuarios'
        # dentro do campo JSON 'gerenciar'.
        can_access_page = perms.get("gerenciar", {}).get("usuarios", False)
        
        return (
            request.user.is_superuser 
            or request.user.role == "dev"
            or can_access_page
        )


class CanManageUser(BasePermission):
    """
    Define quem pode CRIAR, EDITAR ou EXCLUIR usuários.
    """
    def has_permission(self, request, view):
        # 1. Verifica permissão básica de edição (Do Modal!)
        if request.user.role == "dev":
            return True
            
        perms = UserPermission.get_user_permissions_dict(request.user, request.tenant)
        if not perms.get("can_edit_user", False):
            return False

        # 2. Se for criar um novo usuário, verifica se o cargo é permitido pela hierarquia
        if view.action == "create":
            requesting_user_level = ROLE_HIERARCHY.get(request.user.role, 0)
            target_role = request.data.get("role")

            if target_role:
                target_level = ROLE_HIERARCHY.get(target_role, 0)
                # Não pode criar alguém com cargo MAIOR que o seu
                if target_level > requesting_user_level:
                    return False

        return True

    def has_object_permission(self, request, view, obj):
        requesting_user = request.user

        # REGRA 1: Dev manda em tudo
        if requesting_user.role == "dev":
            return True

        # REGRA 2: Ninguém (exceto dev) mexe no usuário 'dev'
        if obj.role == "dev":
            return False

        # REGRA 3: Verifica hierarquia
        requesting_user_level = ROLE_HIERARCHY.get(requesting_user.role, 0)
        target_user_level = ROLE_HIERARCHY.get(obj.role, 0)

        # Se o alvo tiver cargo MAIOR que o meu, não posso mexer
        if target_user_level > requesting_user_level:
            return False

        # REGRA 4: Verifica a permissão específica da ação (Editar vs Excluir)
        perms = UserPermission.get_user_permissions_dict(requesting_user, request.tenant)
        if view.action == 'destroy':
            return perms.get("can_delete_user", False)
        
        # Para outras ações como 'update', 'partial_update'
        return perms.get("can_edit_user", False)