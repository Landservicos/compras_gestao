from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0002_arquivo_document_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="arquivo",
            name="document_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("processo", "Processo"),
                    ("nota_fiscal", "Notas"),
                    ("boletos", "Forma de pagamento"),
                ],
                default="processo",
                max_length=50,
                null=True,
            ),
        ),
    ]