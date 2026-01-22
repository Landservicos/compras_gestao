import os
import time
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import CustomUser
from purchases.models import Processo, CRDII, Arquivo

class Command(BaseCommand):
    help = 'Sincroniza arquivos e pastas do diretorio de midia com o banco de dados.'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando o servico de sincronizacao de arquivos...")

        try:
            system_user = CustomUser.objects.get(username='sistema')
        except CustomUser.DoesNotExist:
            self.stderr.write(self.style.ERROR(
                "Usuario 'sistema' nao encontrado. Por favor, crie este usuario no Django Admin para continuar."
            ))
            
            self.stdout.write("Criando usuario 'sistema' padrao...")
            system_user = CustomUser.objects.create_user(
                username='sistema',
                email='sistema@localhost',
                password='a_senha_muito_forte_e_aleatoria_que_nao_sera_usada_para_login',
                is_active=False # Este usuario nao deve poder fazer login
            )
            self.stdout.write(self.style.SUCCESS("Usuario 'sistema' criado."))


        media_root = settings.MEDIA_ROOT

        while True:
            self.stdout.write(f"[{time.ctime()}] Executando varredura...")
            
            # Conjuntos para rastrear itens encontrados no sistema de arquivos
            crdiis_no_disco = set()
            processos_no_disco = set() 
            arquivos_no_disco = set()

            for crdii_name in os.listdir(media_root):
                crdii_path = os.path.join(media_root, crdii_name)
                if os.path.isdir(crdii_path):
                    crdii_obj, created = CRDII.objects.get_or_create(
                        nome__iexact=crdii_name,
                        defaults={'nome': crdii_name.upper()}
                    )
                    if created:
                        self.stdout.write(self.style.SUCCESS(f"CRDII criado: {crdii_obj.nome}"))
                    crdiis_no_disco.add(crdii_obj.nome)

                    for processo_name in os.listdir(crdii_path):
                        processo_path = os.path.join(crdii_path, processo_name)
                        if os.path.isdir(processo_path):
                            processo_obj, created = Processo.objects.get_or_create(
                                nome__iexact=processo_name, # type: ignore
                                crdii=crdii_obj,
                                defaults={
                                    'nome': processo_name.upper(),
                                    'criado_por': system_user,
                                    'status': Processo.Status.NAO_CONCLUIDO
                                }
                            )
                            if created:
                                self.stdout.write(self.style.SUCCESS(f"  Processo criado: {processo_obj.nome}")) # type: ignore
                            processos_no_disco.add((crdii_obj.nome, processo_obj.nome))

                            for file_name in os.listdir(processo_path):
                                file_path = os.path.join(processo_path, file_name)
                                if os.path.isfile(file_path):
                                    relative_path = os.path.relpath(file_path, media_root)
                                    arquivos_no_disco.add(relative_path)

                                    # Verifica se o arquivo j├í existe no banco de dados (case-insensitive)
                                    if not Arquivo.objects.filter(arquivo__iexact=relative_path).exists():
                                        Arquivo.objects.create(
                                            processo=processo_obj,
                                            nome_original=file_name,
                                            nome_atual=file_name,
                                            arquivo=relative_path,
                                            criado_por=system_user
                                        )
                                        self.stdout.write(self.style.SUCCESS(f"    Arquivo sincronizado: {file_name}"))

            # 1. Limpa CRDIIs
            crdiis_no_db = set(CRDII.objects.values_list('nome', flat=True))
            crdiis_para_remover = crdiis_no_db - crdiis_no_disco
            if crdiis_para_remover:
                removidos, _ = CRDII.objects.filter(nome__in=crdiis_para_remover).delete()
                self.stdout.write(self.style.WARNING(f"Removidos {removidos} CRDIIs orfaos do banco de dados."))

            # 2. Limpa Processos 
            processos_no_db = set(Processo.objects.select_related('crdii').values_list('crdii__nome', 'nome'))
            processos_para_remover = processos_no_db - processos_no_disco
            if processos_para_remover:
                count = 0
                for crdii_nome, processo_nome in processos_para_remover:
                    deletados, _ = Processo.objects.filter(crdii__nome=crdii_nome, nome=processo_nome).delete()
                    count += deletados
                if count > 0:
                    self.stdout.write(self.style.WARNING(f"Removidos {count} Processos orfaos do banco de dados."))

            # 3. Limpa Arquivos orfaos
            arquivos_no_db = set(Arquivo.objects.values_list('arquivo', flat=True))
            arquivos_para_remover = arquivos_no_db - arquivos_no_disco
            if arquivos_para_remover:
                arquivos_removidos, _ = Arquivo.objects.filter(arquivo__in=arquivos_para_remover).delete()
                self.stdout.write(self.style.WARNING(f"Removidos {arquivos_removidos} registros de arquivos orfao do banco de dados."))

            self.stdout.write(f"[{time.ctime()}] Varredura concluida. Proxima execucao em 15 minutos.")
            time.sleep(900) # 15 minutos
