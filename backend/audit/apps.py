from django.apps import AppConfig

class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'

    def ready(self):
        # Importa os signals para que eles sejam registrados quando o app carregar.
        # Desabilitado temporariamente para evitar erros de transação se a tabela não existir.
        # import audit.signals
        pass
