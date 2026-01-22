import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog
from .middleware import get_current_user, get_current_ip

# Defina aqui os models que você quer auditar
# Evite auditar o próprio AuditLog para não criar loop infinito
from users.models import CustomUser
from purchases.models import Processo, Arquivo

AUDITED_MODELS = [CustomUser, Processo, Arquivo]

def get_changes(instance, created):
    if created:
        return {"action": "created"}
    # Lógica simplificada para update. 
    # Para diff detalhado, seria necessário capturar pre_save também.
    return {"action": "updated", "data": str(instance)}

@receiver(post_save)
def audit_log_save(sender, instance, created, **kwargs):
    if sender not in AUDITED_MODELS:
        return

    user = get_current_user()
    if not user or not user.is_authenticated:
        return

    action = 'CREATE' if created else 'UPDATE'
    
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            ip_address=get_current_ip(),
            content_object=instance,
            changes=json.loads(json.dumps(get_changes(instance, created), cls=DjangoJSONEncoder)),
            description=f"{action} {sender.__name__} {instance}"
        )
    except Exception as e:
        print(f"Error creating audit log: {e}")

@receiver(post_delete)
def audit_log_delete(sender, instance, **kwargs):
    if sender not in AUDITED_MODELS:
        return

    user = get_current_user()
    if not user or not user.is_authenticated:
        return

    try:
        AuditLog.objects.create(
            user=user,
            action='DELETE',
            ip_address=get_current_ip(),
            content_object=instance,
            description=f"DELETE {sender.__name__} {instance}"
        )
    except Exception as e:
        print(f"Error creating audit log: {e}")
