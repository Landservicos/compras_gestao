from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, UserPermission

# Signal removido pois UserPermission agora requer um tenant e não deve ser criado automaticamente sem contexto.
