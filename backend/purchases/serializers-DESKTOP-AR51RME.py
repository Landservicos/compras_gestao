from rest_framework import serializers

from .models import Processo, Arquivo, LogUso, CRDII
from .models import StatusHistory


class CRDIISerializer(serializers.ModelSerializer):
    class Meta:
        model = CRDII
        fields = ["id", "nome", "slug"]


class ArquivoSerializer(serializers.ModelSerializer):
    criado_por = serializers.CharField(source="criado_por.username", read_only=True)
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = Arquivo
        fields = [
            "id",
            "processo",
            "nome_original",
            "nome_atual",
            "arquivo",
            "arquivo_url",
            "data_upload",
            "criado_por",
        ]

    def get_arquivo_url(self, obj):
        request = self.context.get("request")
        if obj.arquivo and request:
            return request.build_absolute_uri(obj.arquivo.url)
        return None

    def create(self, validated_data):
        user = self.context["request"].user
        arquivo = Arquivo.objects.create(**validated_data, criado_por=user)
        return arquivo


class ProcessoSerializer(serializers.ModelSerializer):
    arquivos = ArquivoSerializer(many=True, read_only=True)
    criado_por = serializers.StringRelatedField(
        read_only=True, default=serializers.CurrentUserDefault()
    )
    crdii_nome = serializers.SerializerMethodField()
    arquivos_count = serializers.SerializerMethodField()
    data_status = serializers.SerializerMethodField()

    class Meta:
        model = Processo
        fields = [
            "id",
            "crdii",
            "crdii_nome",
            "nome",
            "slug",
            "criado_por",
            "data_criacao",
            "status",
            "arquivos",
            "arquivos_count",
            "data_em_andamento",
            "data_parcial",
            "data_concluido",
            "data_arquivado",
            "data_cancelado",
            "data_status",
        ]

    def get_crdii_nome(self, obj):
        return obj.crdii.nome if obj.crdii else None

    def get_arquivos_count(self, obj):
        return obj.arquivos.count()

    def get_data_status(self, obj):
        if obj.status == Processo.Status.CONCLUIDO:
            return obj.data_concluido
        if obj.status == Processo.Status.PARCIAL:
            return obj.data_parcial
        if obj.status == Processo.Status.NAO_CONCLUIDO:
            return obj.data_em_andamento
        if obj.status == Processo.Status.ARQUIVADO:
            return obj.data_arquivado
        if obj.status == Processo.Status.CANCELADO:
            return obj.data_cancelado
        return obj.data_criacao

    def validate(self, data):
        """
        Verifica se já existe um processo com o mesmo nome no mesmo CRDII.
        """
        nome = data.get("nome")
        crdii = data.get("crdii")

        if crdii and Processo.objects.filter(nome=nome, crdii=crdii).exists():
            raise serializers.ValidationError(
                f"Já existe um processo com o nome '{nome}' no CRDII '{crdii.nome}'."
            )

        return data


class LogUsoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogUso
        fields = ["id", "usuario", "acao", "detalhe", "data_hora"]


class StatusHistorySerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True, allow_null=True)
    status_anterior_display = serializers.CharField(source='get_status_anterior_display', read_only=True)
    status_novo_display = serializers.CharField(source='get_status_novo_display', read_only=True)

    class Meta:
        model = StatusHistory
        fields = [
            'id',
            'usuario_nome',
            'status_anterior',
            'status_novo',
            'status_anterior_display',
            'status_novo_display',
            'data_mudanca',
        ]
