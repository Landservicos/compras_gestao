from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.pagination import PageNumberPagination

from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q, F, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import datetime, timedelta
import traceback

from .models import CRDII, Arquivo, LogUso, Processo, StatusHistory
from users.models import UserPermission
from .permissions import CanViewStatusHistory, HasPermission

from .serializers import (
    ProcessoSerializer,
    ArquivoSerializer,
    LogUsoSerializer,
    CRDIISerializer,
    StatusHistorySerializer,
)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CRDIIViewSet(viewsets.ModelViewSet):
    queryset = CRDII.objects.all()
    serializer_class = CRDIISerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        _user = self.request.user
        tenant = self.request.tenant

        if _user.is_superuser or _user.role in ["dev"]:
            return CRDII.objects.all().order_by("nome")

        permissions_dict = UserPermission.get_user_permissions_dict(_user, tenant)
        allowed_ids = permissions_dict.get('allowed_crdii', [])
        
        if not allowed_ids:
             return CRDII.objects.none()

        return CRDII.objects.filter(id__in=allowed_ids).order_by("nome")

    def perform_create(self, serializer):
        crdii = serializer.save()
        user = self.request.user
        tenant = self.request.tenant
        
        user_perm, created = UserPermission.objects.get_or_create(user=user, tenant=tenant)
        
        if user_perm.allowed_crdii is None:
            user_perm.allowed_crdii = []
            
        if crdii.id not in user_perm.allowed_crdii:
            user_perm.allowed_crdii.append(crdii.id)
            user_perm.save()


class ProcessoViewSet(viewsets.ModelViewSet):
    queryset = Processo.objects.all()
    serializer_class = ProcessoSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'crdii', 'criado_por']
    search_fields = ['nome', 'crdii__nome', 'id']
    ordering_fields = ['data_criacao', 'data_concluido', 'nome']
    ordering = ['-data_criacao']
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission('can_create_processo')]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission('can_edit_processo')]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission('can_delete_processo')]
        else:
            return [IsAuthenticated()]

    def get_queryset(self):
        _user = self.request.user
        tenant = self.request.tenant

        if _user.is_superuser or _user.role in ["dev"]:
            return Processo.objects.prefetch_related("arquivos").all().order_by("-data_criacao")

        permissions_dict = UserPermission.get_user_permissions_dict(_user, tenant)
        allowed_ids = permissions_dict.get('allowed_crdii', [])

        queryset = Processo.objects.prefetch_related("arquivos").filter(
            Q(crdii__id__in=allowed_ids) | Q(crdii__isnull=True)
        )

        # Filtro por tipo (COMPRAS ou DIVERSOS)
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset.order_by("-data_criacao")

    def update(self, request, *args, **kwargs):
        _user = request.user
        processo = self.get_object()
        old_status = processo.status
        new_status = request.data.get("status")

        if new_status and _user.role == "obra":
            current_status = processo.status
            if current_status in [Processo.Status.CANCELADO, Processo.Status.ARQUIVADO]:
                raise PermissionDenied("Processos cancelados ou arquivados não podem ser alterados pela Obra.")

            status_order = {
                Processo.Status.NAO_CONCLUIDO: 1,
                Processo.Status.PARCIAL: 2,
                Processo.Status.CONCLUIDO: 3,
            }
            current_order = status_order.get(current_status)
            new_order = status_order.get(new_status)          

            if current_order and new_order and new_order < current_order:
                raise PermissionDenied("Usuários do tipo 'Obra' não podem retroceder o status.")

        response = super().update(request, *args, **kwargs)

        if response.status_code == 200 and new_status and new_status != old_status:
            StatusHistory.objects.create(
                processo=processo,
                usuario=request.user,
                status_anterior=old_status,
                status_novo=new_status,
            )
        return response

    def perform_create(self, serializer):
        processo = serializer.save(criado_por=self.request.user)
        StatusHistory.objects.create(
            processo=processo,
            usuario=self.request.user,
            status_anterior=None,
            status_novo=processo.status,
        )
        
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def upload(self, request, pk=None):
        try:
            processo = self.get_object()
            f = request.FILES.get("file")
            nome = request.data.get("nome") or (f.name if f else "")
            document_type = request.data.get("document_type")
            allowed_document_types = ["processo", "nota_fiscal", "boletos"]

            if document_type not in allowed_document_types:
                return Response({"detail": "Tipo de documento inválido."}, status=status.HTTP_400_BAD_REQUEST)
            
            _user = request.user
            if not (_user.is_superuser or _user.role == 'dev'):
                permissions_dict = UserPermission.get_user_permissions_dict(_user, request.tenant)
                
                # Mapeamento do tipo de documento para a permissão específica
                permission_map = {
                    "processo": "can_upload_processo",
                    "nota_fiscal": "can_upload_nota_fiscal",
                    "boletos": "can_upload_boletos"
                }
                required_perm = permission_map.get(document_type)
                
                # Verifica se tem a permissão específica OU a geral (caso queira manter retrocompatibilidade)
                has_specific = permissions_dict.get(required_perm, False)
                has_general = permissions_dict.get('can_upload_file', False)
                
                if not has_specific and not has_general:
                    raise PermissionDenied(f"Você não tem permissão para fazer upload de {document_type.replace('_', ' ')}.")

            if not f:
                return Response({"detail": "Nenhum arquivo enviado."}, status=status.HTTP_400_BAD_REQUEST)
            
            arquivo = Arquivo.objects.create(
                processo=processo,
                nome_original=f.name,
                nome_atual=nome,
                document_type=document_type,
                arquivo=f,
                criado_por=request.user,
            )
            LogUso.objects.create(
                usuario=request.user,
                acao="upload",
                detalhe=f"Upload arquivo {arquivo.nome_atual} no processo {processo.id}",
            )
            return Response(ArquivoSerializer(arquivo, context={"request": request}).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": f"Erro interno no upload: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, CanViewStatusHistory])
    def history(self, request, pk=None):
        processo = self.get_object()
        history_qs = processo.status_history.all().order_by('-data_mudanca')
        serializer = StatusHistorySerializer(history_qs, many=True, context={'request': request})
        return Response(serializer.data)


class ArquivoViewSet(viewsets.ModelViewSet):
    queryset = Arquivo.objects.all()
    serializer_class = ArquivoSerializer
    
    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), HasPermission('can_delete_file')]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def rename(self, request, pk=None):
        arquivo = self.get_object()
        novo_nome = request.data.get("nome")
        if not novo_nome:
            return Response({"detail": "Nome vazio"}, status=status.HTTP_400_BAD_REQUEST)
        arquivo.nome_atual = novo_nome
        arquivo.save()
        LogUso.objects.create(
            usuario=request.user, acao="rename", detalhe=f"Renomeou arquivo {arquivo.id} para {novo_nome}"
        )
        return Response(ArquivoSerializer(arquivo, context={"request": request}).data)


class LogUsoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogUso.objects.all().order_by("-data_hora")
    serializer_class = LogUsoSerializer


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Inicializa variáveis com valores padrão seguros
        stats = {
            'total_processos': 0, 'concluidos': 0, 'em_andamento': 0,
            'parcial': 0, 'arquivados': 0, 'cancelados': 0
        }
        tempo_medio_dias = 0
        top_crdiis = []
        stagnant_count = 0
        top_users = []
        recent_activity = []
        chart_data = []

        try:
            # 1. Preparação do QuerySet Base
            year = request.query_params.get('year')
            month = request.query_params.get('month')
            crdii_id = request.query_params.get('crdii')
            tipo = request.query_params.get('tipo')
            
            _user = request.user
            tenant = request.tenant
            
            qs = Processo.objects.all()

            if not (_user.is_superuser or _user.role in ["dev"]):
                permissions_dict = UserPermission.get_user_permissions_dict(_user, tenant)
                allowed_ids = permissions_dict.get('allowed_crdii', [])
                qs = qs.filter(Q(crdii__id__in=allowed_ids) | Q(crdii__isnull=True))

            if tipo:
                qs = qs.filter(tipo=tipo)

            if year:
                qs = qs.filter(data_criacao__year=year)
            if month:
                qs = qs.filter(data_criacao__month=month)
            if crdii_id:
                 qs = qs.filter(crdii__id=crdii_id)

            # 2. Estatísticas Gerais (Counts)
            try:
                stats = qs.aggregate(
                    total_processos=Count('id'),
                    concluidos=Count('id', filter=Q(status='concluido')),
                    em_andamento=Count('id', filter=Q(status='nao_concluido')),
                    parcial=Count('id', filter=Q(status='parcial')),
                    arquivados=Count('id', filter=Q(status='arquivado')),
                    cancelados=Count('id', filter=Q(status='cancelado'))
                )
            except Exception:
                print("Erro ao calcular stats gerais")
                traceback.print_exc()

            # 3. Tempo Médio
            try:
                avg_time_qs = qs.filter(
                    status=Processo.Status.CONCLUIDO, 
                    data_concluido__isnull=False
                )
                avg_time = avg_time_qs.annotate(
                    duration=F('data_concluido') - F('data_criacao')
                ).aggregate(media=Avg('duration'))['media']
                tempo_medio_dias = avg_time.days if avg_time else 0
            except Exception:
                print("Erro ao calcular tempo médio")
                traceback.print_exc()

            # 4. Top 5 CRDIIs
            try:
                top_crdiis_qs = qs.values('crdii__nome').annotate(
                    total=Count('id')
                ).order_by('-total')[:5]
                top_crdiis = [
                    {'name': item['crdii__nome'] or 'Sem CRDII', 'total': item['total']} 
                    for item in top_crdiis_qs
                ]
            except Exception:
                print("Erro ao calcular top CRDIIs")
                traceback.print_exc()

            # 5. Processos Estagnados
            try:
                thirty_days_ago = timezone.now() - timedelta(days=30)
                stagnant_qs = qs.filter(
                    Q(status=Processo.Status.NAO_CONCLUIDO, data_em_andamento__lt=thirty_days_ago) |
                    Q(status=Processo.Status.PARCIAL, data_parcial__lt=thirty_days_ago)
                )
                stagnant_count = stagnant_qs.count()
            except Exception:
                print("Erro ao calcular estagnados")
                traceback.print_exc()

            # 6. Top Usuários
            try:
                top_users_qs = qs.values('criado_por__username').annotate(
                    total=Count('id')
                ).order_by('-total')[:5]
                top_users = [
                    {'username': item['criado_por__username'] or 'Desconhecido', 'total': item['total']}
                    for item in top_users_qs
                ]
            except Exception:
                print("Erro ao calcular top usuários")
                traceback.print_exc()

            # 7. Atividade Recente
            try:
                recent_qs = StatusHistory.objects.filter(processo__in=qs).select_related('usuario', 'processo').order_by('-data_mudanca')[:20]
                recent_activity = [
                    {
                        'id': h.id,
                        'usuario': h.usuario.username if h.usuario else 'Sistema',
                        'processo': f"{h.processo.nome}",
                        'status_novo': h.get_status_novo_display(),
                        'data': h.data_mudanca
                    }
                    for h in recent_qs
                ]
            except Exception:
                print("Erro ao calcular atividade recente")
                traceback.print_exc()
            
            # 8. Gráfico de Evolução
            try:
                if year:
                    evolution_data = (
                        qs.annotate(month=TruncMonth('data_criacao'))
                        .values('month')
                        .annotate(
                            criados=Count('id'),
                            concluidos=Count('id', filter=Q(status='concluido'))
                        )
                        .order_by('month')
                    )
                    chart_data = [
                        {
                            "name": item['month'].strftime("%b") if item['month'] else "N/A", 
                            "criados": item['criados'], 
                            "concluidos": item['concluidos']
                        }
                        for item in evolution_data
                    ]
                else:
                    last_12_months = timezone.now() - timedelta(days=365)
                    evolution_qs = qs.filter(data_criacao__gte=last_12_months)
                    evolution_data = (
                        evolution_qs.annotate(month=TruncMonth('data_criacao'))
                        .values('month')
                        .annotate(
                            criados=Count('id'),
                            concluidos=Count('id', filter=Q(status='concluido'))
                        )
                        .order_by('month')
                    )
                    chart_data = [
                        {
                            "name": item['month'].strftime("%b/%Y") if item['month'] else "N/A", 
                            "criados": item['criados'], 
                            "concluidos": item['concluidos']
                        }
                        for item in evolution_data
                    ]
            except Exception:
                print("Erro ao calcular gráfico")
                traceback.print_exc()

            return Response({
                'stats': stats,
                'extra_stats': {
                    'tempo_medio_dias': tempo_medio_dias,
                    'top_crdiis': top_crdiis,
                    'stagnant_count': stagnant_count,
                    'top_users': top_users,
                    'recent_activity': recent_activity,
                },
                'chart_data': chart_data
            })

        except Exception as e:
            traceback.print_exc()
            # Retorna 200 com dados vazios e erro logado para não quebrar o front completamente, 
            # ou 400 se preferir. 
            # Vou retornar 400 com mensagem para diagnóstico.
            return Response({'detail': f'Erro crítico no Dashboard: {str(e)}'}, status=400)

class ComprasPorMesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        last_year = datetime.now() - timedelta(days=365)
        compras_data = (
            Processo.objects
            .filter(status='concluido', data_criacao__gte=last_year)
            .annotate(month=TruncMonth('data_criacao'))
            .values('month')
            .annotate(total=Count('id'))
            .order_by('month')
        )
        chart_data = [
            {"name": item['month'].strftime("%b/%Y"), "total": item['total']}
            for item in compras_data
        ]
        return Response(chart_data)
