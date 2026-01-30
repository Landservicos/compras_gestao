from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone
from django.db import connection


def get_upload_path(instance, filename):
    # 1. Identifica a empresa atual (Tenant)
    # O schema_name é único (ex: 'empresa1', 'construtora_sul')
    try:
        tenant_name = connection.tenant.schema_name
    except AttributeError:
        # Fallback caso esteja rodando fora do contexto de tenant (ex: shell público)
        tenant_name = "public"

    # 2. Monta os nomes das subpastas
    crdii_nome = instance.processo.crdii.nome if instance.processo.crdii else "sem-crdii"
    processo_nome = instance.processo.nome
    tipo_processo = instance.processo.tipo
    
    # 3. Retorna o caminho completo: empresa/TIPO/crdii/processo/arquivo
    return f"{tenant_name}/{tipo_processo}/{crdii_nome}/{processo_nome}/{filename}"


class CRDII(models.Model):
    id = models.BigAutoField(primary_key=True)
    nome = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name = "CRDII"
        verbose_name_plural = "CRDIIs"

    def __str__(self):
        return self.nome


class Processo(models.Model):
    class Status(models.TextChoices):
        NAO_CONCLUIDO = "nao_concluido", "Em Andamento"
        CONCLUIDO = "concluido", "Concluído"
        PARCIAL = "parcial", "Parcial"
        ARQUIVADO = "arquivado", "Arquivado"
        CANCELADO = "cancelado", "Cancelado"

    id = models.BigAutoField(primary_key=True)

    crdii = models.ForeignKey(
        CRDII,
        on_delete=models.PROTECT,
        related_name="processos",
        null=True,
        blank=True,
    )

    nome = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
    )

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="processos_criados",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    data_criacao = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.NAO_CONCLUIDO
    )

    tipo = models.CharField(
        max_length=20,
        choices=[("COMPRAS", "Compras"), ("DIVERSOS", "Diversos")],
        default="COMPRAS",
    )
    
    # Novos campos de data para rastreamento de status
    data_em_andamento = models.DateTimeField(null=True, blank=True)
    data_parcial = models.DateTimeField(null=True, blank=True)
    data_concluido = models.DateTimeField(null=True, blank=True)
    data_arquivado = models.DateTimeField(null=True, blank=True)
    data_cancelado = models.DateTimeField(null=True, blank=True)


    class Meta:
        # <<< IMPEDE PROCESSOS COM MESMO NOME NO MESMO CRDII >>>
        unique_together = ('crdii', 'nome')

    def __str__(self):
        return f"{self.nome} ({self.id})"


class Arquivo(models.Model):
    id = models.BigAutoField(primary_key=True)
    processo = models.ForeignKey(
        Processo, on_delete=models.CASCADE, related_name="arquivos"
    )
    nome_original = models.CharField(max_length=255)
    nome_atual = models.CharField(max_length=255)
    document_type = models.CharField(
        max_length=50,
        choices=(
            ("processo", "Processo"),
            ("nota_fiscal", "Notas"),
            ("boletos", "Forma de pagamento"),
        ),
        default="processo",
        blank=True,
        null=True,
    )
    arquivo = models.FileField(upload_to=get_upload_path)
    data_upload = models.DateTimeField(auto_now_add=True)

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="arquivos_criados",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.nome_atual


class LogUso(models.Model):
    id = models.BigAutoField(primary_key=True)

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    acao = models.CharField(max_length=128)
    detalhe = models.TextField(blank=True)
    data_hora = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario} - {self.acao}"


# --- Modelos de Permissão e Histórico ---
# Estes modelos vivem no app 'purchases' (tenant) porque eles conectam
# um usuário (compartilhado) a um processo (específico do tenant).


class StatusHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    processo = models.ForeignKey(Processo, related_name='status_history', on_delete=models.CASCADE)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status_anterior = models.CharField(max_length=32, null=True, blank=True, choices=[("nao_concluido", "Em Andamento"), ("concluido", "Concluído"), ("parcial", "Parcial"), ("arquivado", "Arquivado"), ("cancelado", "Cancelado")])
    status_novo = models.CharField(max_length=32, choices=[("nao_concluido", "Em Andamento"), ("concluido", "Concluído"), ("parcial", "Parcial"), ("arquivado", "Arquivado"), ("cancelado", "Cancelado")])
    data_mudanca = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_mudanca']
        verbose_name = "Histórico de Status"
        verbose_name_plural = "Históricos de Status"

    def __str__(self):
        return f'Processo {self.processo.id}: {self.status_anterior} -> {self.status_novo}'
