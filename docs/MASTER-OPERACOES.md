# Plano de recuperação, reconciliação e publicação — 04/11/2026

**Estado: preparado, não autorizado para execução remota.** Alvo único: Supabase NACACADEMIA, `ifczsjazqxfqimquozjy`, branch main/PRODUCTION/Free. Não criar outro projeto. Os ensaios desta missão usam apenas PostgreSQL local com esquema e dados fictícios.

## 1. Concluir o inventário antes de pedir aprovação de escrita

O SQL `supabase/audit/supplement-readonly.sql` consulta grants de schemas/colunas, default ACL e dependências. A execução remota ficou pendente porque o navegador foi desativado. A cópia local está em `local-supplement.json`. As dez categorias principais já foram exportadas e comparadas em `MASTER-BANCO.md`.

Antes de qualquer mudança, repetir também o inventário principal, a presença de dados (EXISTS), a versão e o estado do histórico de migrations. Não reutilizar a observação de tabelas vazias como garantia atual. Não executar testes de escrita no SQL Editor administrativo para alegar aprovação de RLS.

## 2. Backup lógico: proposta que exige aprovação própria

Próxima operação remota proposta, **depois do inventário completo**: exportar logicamente o projeto existente sem alterar suas tabelas, usando conexão direta ou pooler em modo sessão, TLS verificado e PostgreSQL 17. Destino sugerido: diretório local criptografado fora de Git e OneDrive, escolhido pelo proprietário. Não existe destino de backup aprovado nesta missão.

Escopo da cópia:

| Componente | Artefato e validação |
|---|---|
| Banco | Arquivo custom do `pg_dump`, esquema e dados, incluindo schemas da aplicação, Auth e metadados de Storage; inventário de extensões e permissões |
| Roles | Exportação sem senhas e mapeamento dos papéis gerenciados; não recriar indiscriminadamente roles de uma instância Supabase |
| Migrations | Estado real da tabela de histórico, caso passe a existir; fontes Git e hashes separados |
| Auth | Usuários, identidades e demais tabelas incluídas no dump; configurações de provedores, URLs, templates e limites registradas separadamente |
| Storage | Inventário de buckets/políticas e cópia dos arquivos via Storage API, caso existam; dump SQL contém apenas metadados |
| Configuração | Inventário não secreto de Auth/SMTP/rede/versão; segredos ficam em cofre privado, nunca em relatório ou Git |

Modelo de comandos para o operador, **não executado**:

```powershell
# PGSERVICEFILE e PGPASSFILE apontam para arquivos privados fora do repositório.
# O serviço nac-backup deve fixar o host do projeto autorizado e sslmode=verify-full.
# A senha não aparece na linha de comando nem no transcript.
$env:PGOPTIONS = '-c default_transaction_read_only=on'
pg_dump --dbname='service=nac-backup' --format=custom --file="$backupDir/database.dump"
pg_dumpall --dbname='service=nac-backup' --roles-only --no-role-passwords --file="$backupDir/roles.sql"
pg_restore --list "$backupDir/database.dump"
Get-FileHash -Algorithm SHA256 -LiteralPath "$backupDir/database.dump"
```

`$backupDir` deve ser resolvido e aprovado antes; não usar a pasta NAC. Registrar término bem-sucedido de cada exportação, tamanho, SHA-256, instante UTC, versão dos binários e project ref num manifesto privado. Verificar ausência de avisos de objetos omitidos. Um dump que retorna erro não é um backup utilizável. `supabase db dump` padrão sozinho não cobre tudo. Senhas de roles, SMTP, configuração externa e arquivos do Storage exigem tratamento próprio.

O dump conterá hashes de senhas e potencialmente dados pessoais. Guardar em volume criptografado com acesso exclusivo do proprietário e uma segunda cópia privada, sem compartilhamento público. Retenção sugerida para aprovação: ponto anterior à mudança e primeira cópia posterior homologada por 30 dias, seguida de política de retenção do responsável. Não apagar cópias automaticamente.

## 3. Ensaio de recuperação — aprovação de destino pendente

Opção sem outro Supabase remoto: pilha Supabase/PostgreSQL 17 isolada em Docker local, em volume criptografado, sem SMTP externo e sem acesso ao projeto remoto. É diferente dos ensaios já feitos: aqueles reconstruíram **metadados** e usaram fixtures, não restauraram backup remoto.

Após aprovação desse destino: inspecionar o TOC do dump; preparar as mesmas versões de extensões e schemas gerenciados; restaurar em banco vazio isolado, respeitando a ordem pre-data → dados → post-data e o mapeamento de proprietários. Não executar `pg_restore --clean` contra NAC nem usar parâmetros de destino por inferência. Triggers de criação de perfil em Auth e perfis restaurados precisam de ordem controlada para evitar duplicação. Registrar toda adaptação de objetos gerenciados; não ignorar erros.

Critérios de recuperação: zero erro de restore; contagens e checksums compatíveis; FKs/checks validados; políticas e grants equivalentes; funções/triggers presentes; arquivos de Storage verificáveis se aplicável; configuração Auth reconstruível. Não efetuar logins nem enviar e-mails de pessoas reais. Testes funcionais usam fixtures numa base separada. Medir RTO/RPO reais; nenhum valor foi comprovado. Um `pg_restore --list` ou o ensaio de migrations não substitui essa validação.

## 4. Reconciliação incremental proposta

Artefato exato: `supabase/audit/reconciliation-candidate.sql`, gerado por `scripts/prepare-reconciliation.mjs`. Hash no manifesto `master-artifacts.json`. O candidato contém:

1. Transação única, lock timeout de 5 s, statement timeout de 120 s e advisory lock.
2. Pré-condições de igualdade para os dez catálogos remotos capturados, normalizando apenas CRLF/LF.
3. Verificação de sessões abertas duplicadas; abortar e apresentar qualquer conflito sem apagar registros.
4. Trechos das migrations 3 a 15 na ordem original. Não recria as dez tabelas nem executa as duas migrations iniciais.
5. Comparação do estado final esperado antes do COMMIT.

As mudanças acrescentam coluna/constraint do operador, dois índices, quatro triggers, quinze funções ausentes, duas políticas, e atualizam seis funções e onze políticas divergentes. Também corrigem EXECUTE do helper interno de auditoria. Total final: dez tabelas RLS, 31 políticas, 30 índices, 20 triggers públicos mais o trigger Auth e 38 funções em public/nac_private.

**Ainda não liberar execução:** faltam a comparação complementar, novo inventário imediatamente anterior, backup recuperável, janela de manutenção e aprovação específica do SQL/hash. Os guards não verificam o project ref automaticamente e não cobrem configurações externas; o operador deve confirmar o alvo. Os hashes identificam a proposta, não autorizam sua execução.

Impacto: índices/checks podem ler dados e adquirir locks; funções e políticas mudam autorização. Latência real depende do volume, não foi estimada a partir do banco vazio. Pausar mudanças administrativas concorrentes na janela aprovada. O advisory lock coordena somente operadores que respeitem o mesmo lock. Não repetir em loop se o timeout ocorrer; a transação deve ser desfeita e a causa analisada.

Validação local: instalação limpa das 15 migrations e ensaio partindo das definições remotas, ambos com catálogo final idêntico nas dez categorias e 134 testes pgTAP aprovados. Não foi gravado nada no Supabase remoto.

Reversão: antes de COMMIT, qualquer falha aborta a transação; não há execução parcial persistida. Depois de COMMIT, fechar o acesso da aplicação e apresentar correção de avanço ou recuperação aprovada a partir do backup. Não reaplicar políticas vulneráveis nem remover a coluna de auditoria automaticamente. A recuperação pode exigir indisponibilidade e avaliação de escritas posteriores; não prometer reversão sem perda enquanto o ensaio do backup não existir.

## 5. Histórico de migrations

O remoto não possui `supabase_migrations.schema_migrations`. Não usar `db push` neste estado. O candidato não cria histórico e não marca versões antigas como aplicadas.

Depois da equivalência completa, backup e aplicação autorizada: gerar um baseline pós-reconciliação identificado por hash, registrar a execução real e anexar a matriz de equivalência. Qualquer adoção do histórico pelo CLI é uma segunda operação explícita, apresentada com SQL/comando e versões exatas. Não marcar 15 arquivos como executados se somente o incremental foi aplicado. Até essa decisão, upgrades remotos usam apenas scripts incrementais revisados, sem automação de `db push`.

## 6. Auth e primeiro administrador

O código aceita `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_SUPABASE_ANON_KEY` não é a variável consumida. A origem Supabase não inclui `/rest/v1`. O flag `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH` permanece false até aprovação da homologação.

Após definir uma origem HTTPS concreta, propor no projeto NAC: Site URL dessa origem e redirects exatos `/auth/confirm?destino=aluno` e `/auth/confirm?destino=redefinir-senha`. Conferir templates e `RedirectTo`, confirmação de e-mail ligada, login anônimo desligado, expiração/limites e provedor SMTP/remetente de domínio autorizado. Não habilitar curingas amplos. A entrega de SMTP real ainda não foi testada. Não contratar serviço por iniciativa própria.

Rotacionar a chave secreta anteriormente compartilhada exige autorização; não a utilizar nos testes ou na Vercel. Inventariar consumidores antes da revogação, substituir por cofre e confirmar que a chave antiga deixa de funcionar. A aplicação usa somente chave pública e a sessão do usuário.

Primeiro administrador: conta real confirmada, identificação do titular e aprovação separada. Usar somente `nac_private.bootstrap_first_admin` conforme `NAC-MISSAO-09.md`, por operador PostgreSQL confiável; função privada não está acessível aos papéis da API. Não inferir e-mail ou UUID e não executar nesta etapa. Professores são habilitados pelo administrador; cadastro público continua student.

## 7. Vercel — configuração preparada, sem projeto criado

Foi aplicada a orientação da skill Vercel Deployments & CI/CD: confirmar time/projeto/commit/ambiente e evitar publicação implícita. A conexão Vercel deixou de estar disponível durante a execução e não há `.vercel/project.json`; a existência de projeto remoto NAC **não foi verificada**. Listar projetos por leitura antes de criar qualquer recurso.

| Configuração proposta | Valor |
|---|---|
| Repositório | tidihunter99-coder/NACTRAINING; confirmar commit aprovado |
| Framework / raiz | Next.js / raiz do repositório |
| Instalação / build | `npm ci` / `npm run build` |
| Output | padrão do Next.js; não definir `.next-master-test` remotamente |
| Node | versão suportada pela Vercel a confirmar na configuração; testes locais usaram Node 24 |
| Supabase URL | origem HTTPS do projeto NAC existente |
| Chave | somente publishable; nenhum secret/service_role |
| Site URL | origem HTTPS exata do ambiente aprovado |
| Auth remoto | false até schema/Auth/backup homologados; true exige aprovação |
| Preview | proteção de acesso, URLs explícitas e fixtures só após autorização; usa o mesmo banco NAC |
| Production | aprovação separada, commit/hash e plano de rollback |

**Impedimento comercial:** a documentação atual da Vercel limita Hobby a uso pessoal não comercial. O uso operacional por uma academia não deve ser presumido elegível. Não foi contratado Pro nem criado projeto; resolver elegibilidade/plano com o proprietário antes de publicação.

Conectar Git pode disparar deployments automaticamente. Não conectar/importar o repositório sem autorização de Preview correspondente. Não criar workflow que publique automaticamente agora. Rollback de deployment não desfaz schema ou dados. Preservar a versão anterior aprovada e, em incidente, fechar Auth/retirar tráfego de modo aprovado antes de trocar a versão.

## Fontes verificadas

- [Supabase — backups e limites](https://supabase.com/docs/guides/platform/backups)
- [Supabase — backup e restauração via CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase — redirects](https://supabase.com/docs/guides/auth/redirect-urls)
- [Vercel — plano Hobby](https://vercel.com/docs/plans/hobby)
- [Vercel — deployments](https://vercel.com/docs/deployments)
