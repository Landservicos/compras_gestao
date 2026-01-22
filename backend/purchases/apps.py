from django.apps import AppConfig


class PurchasesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "purchases"

    def ready(self):
        # Importa os signals para que eles sejam registrados quando o app carregar.
        import purchases.signals
