from rest_framework import serializers
from .models import Empresa, Dominio
import re

class TenantSerializer(serializers.ModelSerializer):
    # O nome do campo no serializer agora é 'nome', o mesmo do modelo.
    # O DRF lida com isso automaticamente.
    
    # Campo extra para receber a URL (não salvo diretamente na Empresa)
    domain_url = serializers.CharField(write_only=True, required=True)
    
    domain = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = ['id', 'nome', 'schema_name', 'domain_url', 'domain', 'criado_em']
        read_only_fields = ['id', 'criado_em', 'domain']

    def get_domain(self, obj):
        """
        Retorna o domínio primário da empresa de forma otimizada.
        Este método depende que a ViewSet que o chama tenha usado 'prefetch_related'
        com o to_attr='primary_domain_list' no queryset.
        """
        if hasattr(obj, 'primary_domain_list') and obj.primary_domain_list:
            return obj.primary_domain_list[0].domain
        
        # Não há fallback para uma nova query para garantir a performance.
        # Se o domínio não foi pré-buscado, ele não será exibido na lista.
        return None

    def validate_schema_name(self, value):
        # Regra: Schema deve ser minúsculo, sem espaços e apenas letras/números/underline
        value = value.lower().replace(' ', '_')
        if not re.match(r'^[a-z0-9_]+$', value):
            raise serializers.ValidationError("O schema deve ter apenas letras minúsculas, números e underlines.")
        
        if Empresa.objects.filter(schema_name=value).exists():
            raise serializers.ValidationError("Este nome de schema já está em uso.")
        return value

    def create(self, validated_data):
        # Removemos o domain_url pois ele não pertence ao modelo Empresa
        domain_url = validated_data.pop('domain_url')
        
        # O DRF já converteu 'name' para 'nome' no validated_data por causa do source='nome'
        
        # 1. Cria a Empresa
        empresa = Empresa.objects.create(**validated_data)
        
        # 2. Cria o Domínio
        Dominio.objects.create(
            domain=domain_url,
            tenant=empresa,
            is_primary=True
        )
        
        return empresa