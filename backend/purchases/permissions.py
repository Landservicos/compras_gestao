from rest_framework.permissions import BasePermission
from users.models import UserPermission

class HasPermission(BasePermission):
    """
    Verifica se o usuário tem a permissão (booleana) ativa na tabela UserPermission
    do tenant atual.
    """
    def __init__(self, codename):
        self.codename = codename # Ex: 'can_create_processo'
 
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'dev':
            return True

        # Busca as permissões do usuário para este tenant
        perms_dict = UserPermission.get_user_permissions_dict(request.user, request.tenant)
        
        # Retorna o valor da permissão específica
        return perms_dict.get(self.codename, False)
 
 
class CanViewStatusHistory(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser or request.user.role == 'dev':
            return True

        perms_dict = UserPermission.get_user_permissions_dict(request.user, request.tenant)
        return perms_dict.get('view_status_history', False)