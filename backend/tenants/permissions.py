from rest_framework.permissions import BasePermission

class CanCreateDeleteTenants(BasePermission):
    """
    Permissão personalizada para verificar se um usuário pode criar ou deletar empresas (tenants).
    
    A criação/deleção de tenants são ações 'globais' que ocorrem fora do contexto 
    de um tenant específico (no schema 'public'). Portanto, esta permissão se baseia
    em uma flag direta no modelo do usuário, em vez de uma permissão dentro de um tenant.
    """
    message = "Você não tem permissão para criar ou excluir empresas."

    def has_permission(self, request, view):
        user = request.user

        # O usuário deve estar autenticado.
        if not user or not user.is_authenticated:
            return False

        # Superusuários sempre têm permissão.
        if user.is_superuser:
            return True
        
        # Para outros usuários, verificamos a flag específica 'can_create_tenant'.
        # Isso permite um controle administrativo fino sobre quem pode gerenciar empresas,
        # sem precisar que o usuário seja 'is_staff'.
        return getattr(user, 'can_create_tenant', False)