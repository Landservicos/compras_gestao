from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils.text import slugify
from django.utils import timezone
from .models import Processo, CRDII, StatusHistory

@receiver(pre_save, sender=CRDII)
def pre_save_crdii(sender, instance, **kwargs):
    """
    Força o nome para maiúsculas e gera o slug se necessário.
    """
    if instance.nome:
        instance.nome = instance.nome.upper()
    
    if not instance.slug and instance.nome:
        instance.slug = slugify(instance.nome.lower())

@receiver(pre_save, sender=Processo)
def pre_save_processo(sender, instance, **kwargs):
    """
    Gerencia regras de negócio antes de salvar o Processo:
    1. Força nome para maiúsculas.
    2. Gera Slug.
    3. Atualiza timestamps baseados no Status.
    """
    # 1. Força Uppercase
    if instance.nome:
        instance.nome = instance.nome.upper()

    # 2. Gera Slug
    if not instance.slug:
        crdii_part = f"{instance.crdii.nome} " if instance.crdii else ""
        # Garante que o nome esteja lá para slugify
        base_name = instance.nome or "novo-processo"
        base_slug = slugify(f"{crdii_part}{base_name}")
        instance.slug = base_slug

    # 3. Gerenciamento de Datas por Status
    is_new = instance._state.adding
    status_changed = False
    
    if not is_new:
        try:
            old_instance = Processo.objects.get(pk=instance.pk)
            if instance.status != old_instance.status:
                status_changed = True
        except Processo.DoesNotExist:
            # Caso raro onde o objeto está marcado como não novo mas não existe no banco
            pass
    
    # Atualiza a data correspondente se for um novo processo ou se o status mudou
    if is_new or status_changed:
        now = timezone.now()
        if instance.status == Processo.Status.NAO_CONCLUIDO:
            if not instance.data_em_andamento: # Evita sobrescrever se já existir (historicamente)
                 instance.data_em_andamento = now
        elif instance.status == Processo.Status.PARCIAL:
             if not instance.data_parcial:
                instance.data_parcial = now
        elif instance.status == Processo.Status.CONCLUIDO:
             if not instance.data_concluido:
                instance.data_concluido = now
        elif instance.status == Processo.Status.ARQUIVADO:
             if not instance.data_arquivado:
                instance.data_arquivado = now
        elif instance.status == Processo.Status.CANCELADO:
             if not instance.data_cancelado:
                instance.data_cancelado = now

    # Garante que, na criação, a data de "em andamento" seja setada se não houver outra
    if is_new and not instance.data_em_andamento:
        instance.data_em_andamento = instance.data_criacao or timezone.now()
