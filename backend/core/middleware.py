from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_model, get_public_schema_name
from django.db import connection

class TenantIdentificationMiddleware(TenantMainMiddleware):
    """
    Middleware customizado para selecionar o tenant.
    Prioridade:
    1. Header 'X-Tenant-ID' (Frontend)
    2. Subdomínio/Hostname (Navegador/Admin)
    3. Fallback para Public (Segurança)
    """

    def process_request(self, request):
        # 1. Captura o request para uso posterior no get_tenant
        self.request = request
        return super().process_request(request)

    def get_public_schema_tenant(self):
        try:
            return get_tenant_model().objects.get(schema_name=get_public_schema_name())
        except get_tenant_model().DoesNotExist:
            return None

    def get_tenant(self, domain_model, hostname):
        # 1. Tenta obter o tenant pelo Header (usado pelo frontend)
        tenant_schema_from_header = self.request.headers.get('X-Tenant-ID')
        if tenant_schema_from_header:
            try:
                tenant = get_tenant_model().objects.get(schema_name=tenant_schema_from_header)
                return tenant
            except get_tenant_model().DoesNotExist:
                # O header especificou um tenant que não existe.
                # A lógica prossegue para tentar pelo hostname.
                pass

        # 2. Se a lógica do header falhou, tenta pelo Hostname (comportamento padrão)
        try:
            return super().get_tenant(domain_model, hostname)
        except domain_model.DoesNotExist:
            # Continua se o tenant não for encontrado pelo hostname
            pass
        
        # 3. Fallback final para o schema público
        return self.get_public_schema_tenant()