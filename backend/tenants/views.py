from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import APIException
from django.db import transaction
from django.db.models import Prefetch
from django_tenants.utils import schema_context

from .models import Empresa, Dominio
from .serializers import TenantSerializer
from .permissions import CanCreateDeleteTenants

class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    
    def get_queryset(self):
        """
        Sobrescreve o queryset padrão para retornar apenas as empresas
        associadas ao usuário logado, e otimiza a busca de domínios.
        """
        try:
            user = self.request.user

            if not user or not user.is_authenticated:
                return Empresa.objects.none()

            # Otimização: Pré-busca os domínios primários para evitar N+1 queries.
            # A relação reversa de Empresa para Dominio é 'domains'.
            domain_prefetch = Prefetch(
                'domains',
                queryset=Dominio.objects.filter(is_primary=True),
                to_attr='primary_domain_list' # Armazena o resultado em um novo atributo
            )

            # Superusuários (como 'dev') podem ver todas as empresas.
            if user.is_superuser:
                return Empresa.objects.prefetch_related(domain_prefetch).all().order_by('-criado_em')
            
            # Usuários normais só podem ver as empresas a que pertencem.
            return user.tenants.prefetch_related(domain_prefetch).order_by('-criado_em')

        except Exception as e:
            # Captura qualquer exceção e a levanta como um erro DRF formatado.
            raise APIException(f"Erro ao processar a lista de empresas: {type(e).__name__} - {e}")

    def get_permissions(self):
        """
        Sobrescreve para usar permissões diferentes baseadas na ação.
        """
        if self.action in ['create', 'destroy']:
            self.permission_classes = [CanCreateDeleteTenants]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Força a operação de criação a acontecer no schema público
        with schema_context('public'):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            try:
                empresa = serializer.save()

                # Adiciona o usuário que criou a empresa à própria empresa.
                empresa.users.add(request.user)

                headers = self.get_success_headers(serializer.data)
                return Response(
                    serializer.data, 
                    status=status.HTTP_201_CREATED, 
                    headers=headers
                )
            except Exception as e:
                return Response(
                    {"detail": f"Erro ao criar empresa: {str(e)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    def destroy(self, request, *args, **kwargs):
        with schema_context('public'):
            instance = self.get_object()
            self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)