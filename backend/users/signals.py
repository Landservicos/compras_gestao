from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, UserPermission

@receiver(post_save, sender=CustomUser)
def create_user_permission(sender, instance, created, **kwargs):
    """
    Cria um objeto UserPermission automaticamente para cada novo CustomUser.
    """
    if created:
        UserPermission.objects.create(user=instance)
