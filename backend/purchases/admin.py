from django.contrib import admin
from .models import Processo, Arquivo, LogUso, CRDII, StatusHistory

@admin.register(CRDII)
class CRDIIAdmin(admin.ModelAdmin):
    list_display = ('nome', 'slug')
    search_fields = ('nome',)
    prepopulated_fields = {'slug': ('nome',)}

@admin.register(Processo)
class ProcessoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'crdii', 'status', 'criado_por', 'data_criacao')
    list_filter = ('status', 'crdii', 'criado_por')
    search_fields = ('nome', 'crdii__nome')
    readonly_fields = ('criado_por', 'data_criacao', 'slug')

@admin.register(Arquivo)
class ArquivoAdmin(admin.ModelAdmin):
    list_display = ('nome_atual', 'processo', 'criado_por', 'data_upload')
    search_fields = ('nome_atual', 'processo__nome')
    readonly_fields = ('criado_por', 'data_upload')

@admin.register(LogUso)
class LogUsoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'acao', 'data_hora')
    list_filter = ('usuario', 'acao')
    readonly_fields = ('usuario', 'acao', 'detalhe', 'data_hora')

@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('processo', 'usuario', 'status_anterior', 'status_novo', 'data_mudanca')
    list_filter = ('usuario', 'status_novo')
    search_fields = ('processo__nome',)
    readonly_fields = ('processo', 'usuario', 'status_anterior', 'status_novo', 'data_mudanca')
