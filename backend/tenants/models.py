from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

class Empresa(TenantMixin):
    
    nome = models.CharField(max_length=100, unique=True)
    criado_em = models.DateField(auto_now_add=True)

    # auto_create_schema é True por padrão, o que cria o schema do tenant automaticamente.
    auto_create_schema = True

    def __str__(self):
        return self.nome

class Dominio(DomainMixin):
    
    pass
