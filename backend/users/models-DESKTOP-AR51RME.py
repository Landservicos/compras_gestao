from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ("administrador", "Administrador"),
        ("gestor", "Gestor"),
        ("diretoria", "Diretoria"),
        ("compras", "Compras"),
        ("obra", "Obras"),
        ("financeiro", "Financeiro"),
        ("dev", "Desenvolvedor"),
    )
    role = models.CharField(
       max_length=15, choices=ROLE_CHOICES, default="dev", verbose_name="Papel"
    )
    
    # Relação Many-to-Many com o modelo Empresa (Tenant)
    # Isso permite que um usuário pertença a uma ou mais empresas.
    tenants = models.ManyToManyField(
        "tenants.Empresa", blank=True, related_name="users", verbose_name="Empresas"
    )
    can_create_tenant = models.BooleanField(
        default=False, verbose_name="Pode Criar Empresas"
    )

    def save(self, *args, **kwargs):
        # Garante que devs sejam sempre superusuários
        if self.role == "dev":
            self.is_staff = True
            self.is_superuser = True
        else:
            # Importante: Não retirar staff/superuser automaticamente se não for dev,
            # pois pode haver admins manuais. Mas para a lógica de negócio, mantemos assim:
            self.is_staff = False
            self.is_superuser = False
        super().save(*args, **kwargs)

    class Meta:
        permissions = [
            # Permissões de Página
            ("page_dashboard", "Pode visualizar a página Dashboard"),
            ("page_compras", "Pode visualizar a página de Processos"),
            ("page_admin", "Pode visualizar a página de Administração (Usuários)"),
            # Permissões de Recurso
            ("can_create_processo", "Pode criar novos processos"),
            ("can_edit_processo", "Pode editar processos existentes"),
            ("can_delete_processo", "Pode excluir processos"),
            ("can_change_status", "Pode alterar o status de um processo"),
            ("can_upload_file", "Pode fazer upload de arquivos"),
            ("can_delete_file", "Pode excluir arquivos"),
            ("can_edit_user", "Pode editar outros usuários"),
        ]


class UserPermission(models.Model):
    # Alterado de OneToOne para ForeignKey para permitir múltiplas configurações por usuário (uma por empresa)
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="permissions"
    )
    
    # NOVO: Vínculo com o Tenant (Empresa) específico
    tenant = models.ForeignKey(
        "tenants.Empresa", 
        on_delete=models.CASCADE, 
        related_name="user_permissions",
        verbose_name="Empresa"
    )

    # Permissões de Página
    page_dashboard = models.BooleanField(default=True)
    page_compras = models.BooleanField(default=True)
    gerenciar = models.JSONField(default=dict, null=True, blank=True)
    relatorios = models.JSONField(default=dict, null=True, blank=True)
    
    # Permissões de Ação
    can_create_processo = models.BooleanField(default=False)
    can_edit_processo = models.BooleanField(default=False)
    can_delete_processo = models.BooleanField(default=False)
    can_change_status = models.BooleanField(default=False)
    can_upload_file = models.BooleanField(default=False)
    can_delete_file = models.BooleanField(default=False)
    can_edit_user = models.BooleanField(default=False)
    can_delete_user = models.BooleanField(default=False) # Nova permissão
    view_status_history = models.BooleanField(default=False)

    # Permissões de Limite
    status_limits = models.JSONField(default=dict, null=True, blank=True)
    allowed_crdii = models.JSONField(default=list, null=True, blank=True)

    class Meta:
        # Garante que só exista UM registro de permissão para cada par Usuário + Empresa
        unique_together = ("user", "tenant")
        verbose_name = "Permissão de Usuário"
        verbose_name_plural = "Permissões de Usuários"

    def __str__(self):
        return f"Permissões de {self.user.username} em {self.tenant.nome}"

    @staticmethod
    def get_default_permissions():
        """
        Retorna um dicionário com as permissões padrão para um novo usuário.
        """
        return {
            "page_dashboard": True,
            "page_compras": True,
            "gerenciar": {"usuarios": False, "empresas": False, "crdiis": False},
            "relatorios": {
                "geral": False,
                "financeiro": False,
            },
            "can_create_processo": False,
            "can_edit_processo": False,
            "can_delete_processo": False,
            "can_change_status": False,
            "can_upload_file": False,
            "can_delete_file": False,
            "can_edit_user": False,
            "can_delete_user": False,
            "view_status_history": False,
            "status_limits": {},
            "allowed_crdii": [],
        }

    @staticmethod
    def get_user_permissions_dict(user, tenant):
        """
        Retorna um dicionário com as permissões de um usuário no contexto de um tenant.
        Se o usuário for superusuário, concede todas as permissões.
        """
        if user.is_superuser:
            all_permissions = UserPermission.get_default_permissions()
            all_permissions["can_delete_user"] = True  # Superuser pode deletar
            for key in all_permissions:
                if key not in ["status_limits", "allowed_crdii", "relatorios", "gerenciar"]:
                    all_permissions[key] = True
                elif key == "status_limits":
                    all_permissions[key] = {
                        "nao_concluido": True,
                        "parcial": True,
                        "concluido": True,
                        "arquivado": True,
                        "cancelado": True,
                    }
                elif key == "gerenciar":
                    all_permissions[key] = {
                        "usuarios": True,
                        "empresas": True,
                        "crdiis": True,
                    }
                elif key == "relatorios":
                    all_permissions[key] = {
                        "geral": True,
                        "financeiro": True,
                    }
                elif key == "allowed_crdii":
                    all_permissions[key] = []
            return all_permissions

        try:
            permissions = UserPermission.objects.get(user=user, tenant=tenant)
            
            # Começa com os padrões para garantir a estrutura completa
            perms_data = UserPermission.get_default_permissions()

            # Atualiza com os valores salvos no banco
            saved_data = {
                "page_dashboard": permissions.page_dashboard,
                "page_compras": permissions.page_compras,
                "can_create_processo": permissions.can_create_processo,
                "can_edit_processo": permissions.can_edit_processo,
                "can_delete_processo": permissions.can_delete_processo,
                "can_change_status": permissions.can_change_status,
                "can_upload_file": permissions.can_upload_file,
                "can_delete_file": permissions.can_delete_file,
                "can_edit_user": permissions.can_edit_user,
                "can_delete_user": permissions.can_delete_user,
                "view_status_history": permissions.view_status_history,
                "allowed_crdii": permissions.allowed_crdii,
            }
            
            # Lida com JSONFields de forma segura, mesclando com os padrões
            if hasattr(permissions, 'gerenciar') and isinstance(permissions.gerenciar, dict):
                perms_data['gerenciar'].update(permissions.gerenciar)
                saved_data['gerenciar'] = perms_data['gerenciar']

            if hasattr(permissions, 'relatorios') and isinstance(permissions.relatorios, dict):
                perms_data['relatorios'].update(permissions.relatorios)
                saved_data['relatorios'] = perms_data['relatorios']
            
            if hasattr(permissions, 'status_limits') and isinstance(permissions.status_limits, dict):
                perms_data['status_limits'].update(permissions.status_limits)
                saved_data['status_limits'] = perms_data['status_limits']

            # Atualiza o dicionário principal com todos os valores salvos
            perms_data.update(saved_data)

            return perms_data

        except (UserPermission.DoesNotExist, AttributeError):
            # O AttributeError vai pegar o caso onde colunas novas ainda não existem no DB
            return UserPermission.get_default_permissions()

    @staticmethod
    def update_user_permissions(user, tenant, permissions_data):
        """
        Atualiza ou cria as permissões de um usuário para um tenant específico.
        """
        defaults = {}
        # Prepara os dados para atualização, ignorando chaves que não são campos do modelo
        model_fields = [f.name for f in UserPermission._meta.get_fields()]
        
        for key, value in permissions_data.items():
            if key in model_fields and key not in ['user', 'tenant', 'id']:
                defaults[key] = value

        # update_or_create lida com a existência ou não do registro
        obj, created = UserPermission.objects.update_or_create(
            user=user,
            tenant=tenant,
            defaults=defaults
        )
        return obj