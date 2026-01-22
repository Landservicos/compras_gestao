from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserPermission

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    # Adiciona o campo 'tenants' para ser gerenciável no admin
    filter_horizontal = ('tenants', 'groups', 'user_permissions',)
    # Adiciona 'role' ao list_display para que apareça na lista de usuários
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'role')
    # Adiciona 'role' aos fieldsets para que apareça no formulário de edição do usuário
    fieldsets = UserAdmin.fieldsets + (
        ('Papel e Empresas', {'fields': ('role', 'tenants')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)

@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__username',)
