# Missão 10 — auditoria do Supabase existente e plano de atualização

**Data:** 4 de novembro de 2026. **Estado:** diagnóstico e revisão visual local concluídos dentro das permissões disponíveis; homologação funcional remota **pendente**. O alvo remoto é exclusivamente o projeto Supabase NAC existente (`ifczsjazqxfqimquozjy`). Não houve migration, alteração de dados, `db reset` ou deploy remoto.

## Fechamento da Missão 10 nesta retomada

Esta seção registra o estado mais recente. O restante do documento preserva a cronologia da auditoria anterior; as 125 asserções citadas mais abaixo pertencem à execução anterior. A matriz detalhada de definições e o plano operacional posterior estão em [MASTER-BANCO.md](MASTER-BANCO.md) e [MASTER-OPERACOES.md](MASTER-OPERACOES.md).

### 1. Estado remoto efetivamente verificado

O inventário privilegiado **somente de leitura** do SQL Editor, capturado anteriormente em 04/11/2026, identificou PostgreSQL 17.11, dez tabelas NAC em `public` com RLS ativa, 29 políticas, 28 índices públicos, 16 triggers de usuário públicos, 23 funções públicas, `pgcrypto` 1.3 e ausência de histórico em `supabase_migrations.schema_migrations`. Naquele instante, `EXISTS` retornou falso para as dez tabelas NAC e `auth.users`; isso **não garante** que continuem vazias. Os catálogos exportados em `supabase/audit/remote-*.json` foram comparados com a instalação local de 15 migrations, sem selecionar linhas pessoais. O suplemento de grants de schema/coluna, default ACL e dependências em `supabase/audit/supplement-readonly.sql` continua sem execução remota: uma nova tentativa de abrir o painel nesta retomada exigiu login, e nenhuma consulta SQL foi enviada.

Nesta retomada, `scripts/mission10-remote-readonly.mjs` repetiu somente GETs com a chave **publishable** e TLS validado pela CA do Windows. `/auth/v1/settings` respondeu 200, `disable_signup=false`, `mailer_autoconfirm=false`. Os dez recursos REST responderam 401/42501 para `anon`, sem solicitar linhas (`limit=0`). Isso confirma a configuração pública observável e a negativa anônima; não testa RLS autenticada nem atualiza o inventário privilegiado de estrutura. Não foram usadas chaves secretas remotas.

### 2–3. Compatibilidade e migrations

| Categoria | Diferença no catálogo remoto capturado | Consequência |
| --- | --- | --- |
| Migrations | Histórico remoto inexistente; 15 migrations na instalação local limpa | `db push` não é seguro sobre tabelas já existentes |
| Estrutura | Uma coluna e uma constraint ausentes em `audit_events`; dois índices e quatro triggers públicos ausentes | Auditoria e guardas de integridade não equivalem ao local |
| Funções | 15 ausentes e seis divergentes | Operações de professor/admin e validações podem falhar ou ter semântica antiga |
| RLS | 29 políticas remotas contra 31 locais; 11 predicados divergentes | Isolamento de alunos, inativos e histórico não está homologado remotamente |
| Privilégios | Dois grants de tabela e 12 EXECUTE divergentes; 45 entradas EXECUTE ausentes por funções inexistentes | Rever exposição da Data API e funções internas |

Os nomes e as definições de cada objeto estão em [MASTER-BANCO.md](MASTER-BANCO.md) e `supabase/audit/catalog-diff.json`. O candidato `supabase/audit/reconciliation-candidate.sql` foi **preparado e ensaiado somente em banco local reconstruído**: parte do catálogo remoto observado, aplica diferenças incrementais das migrations 3–15 e chega ao catálogo final local nas dez categorias comparadas. Ele **não está liberado para aplicação remota**. Não basta marcar arquivos antigos como aplicados; o histórico ausente precisa de decisão própria após equivalência e execução real.

### 4. Segurança e integridade

As oito suítes pgTAP locais passaram **134/134** novamente nesta retomada. Os testes HTTP locais de Auth, aluno, professor e administrador passaram, incluindo isolamento, bloqueio de inativos, edição/ativação de fichas, sessões, histórico e auditoria. Uma vulnerabilidade de privilégio em `write_audit_event` foi corrigida pela migration local `20261104130000_internal_audit_privileges.sql` e coberta por pgTAP; o inventário remoto anterior ainda mostra o grant inseguro. Não houve exploração nem correção remota. A negativa 401 para `anon` não substitui testes autenticados de RLS no remoto.

### 5. Autenticação real

O aplicativo continua bloqueando Auth remoto sem `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true` e uma `NEXT_PUBLIC_SITE_URL` HTTPS válida. O painel remoto observado usa Site URL `http://localhost:3000`, não possui Redirect URLs e não tem SMTP personalizado; confirmação de e-mail está ligada. Cadastro, confirmação, recuperação, redefinição, logout, refresh, papéis e rotas passaram **localmente**. Entrega real de e-mail, callbacks HTTPS, domínio futuro e contas remotas não foram homologados. Não se habilitou Auth remoto para usuários finais.

### 6. Revisão visual pendente

Com uma fixture fictícia exclusiva do Supabase local, foram inspecionados no navegador o dashboard, ficha, execução, histórico, evolução e perfil do aluno; o detalhe de aluno, editor de ficha, catálogo e atividades do professor; e dashboard, listas, detalhes, vínculos, catálogo e auditoria do administrador. As rotas principais foram percorridas em **390 × 844, 768 × 1024 e 1440 × 900**. As páginas observadas não ultrapassaram a largura do viewport. Também foram verificados login com senha incorreta, aluno sem ficha, histórico vazio e ausência de medidas. O conteúdo dos formulários e as mensagens permaneceram legíveis. Indicadores da fixture ou de registros locais anteriores não são indicadores reais da NAC.

O detalhe do aluno no painel do professor exibia uma barra de rolagem horizontal nas abas internas em 390 px. `src/app/professor/alunos/[studentId]/page.tsx` agora distribui as cinco abas em duas linhas; a versão recompilada foi conferida visualmente sem barra horizontal. Nenhuma ação de publicação ou alteração funcional foi feita. A fixture foi removida integralmente (`VISUAL_FIXTURE_CLEAN`), e o Next de teste e o Supabase local foram encerrados.

### 7. Testes desta retomada

| Verificação | Resultado |
| --- | --- |
| Supabase local, oito suítes pgTAP | **134 aprovados, 0 falhas** |
| Auth, aluno, professor e admin contra Next + Supabase locais | Quatro fluxos aprovados; fixtures dos scripts limpas |
| `npm run lint`, `npm run typecheck`, `npm run build` | Aprovados após o ajuste visual |
| Verificador de esquema, configuração de deploy, paginação e regressões de recuperação | Aprovados; nove cenários de configuração |
| Navegador nas três larguras | Rotas principais e estados vazios/erro revisados; ajuste das abas confirmado |

### 8–9. Plano de integração e riscos

1. Repetir o inventário remoto completo imediatamente antes de qualquer mudança, executar o suplemento somente de leitura, identificar consumidores de `auth`, `storage`, outros schemas, funções externas e aplicações que usem o projeto. O catálogo `public` não prova ausência de dependências compartilhadas.
2. Obter autorização separada para um backup lógico completo, com destino privado fora de Git/OneDrive; verificar integridade e restaurabilidade em ambiente **local isolado**, sem criar outro Supabase remoto. O plano Free observado não oferece backup recuperável comprovado. Um dump padrão de esquema não cobre usuários Auth, dados e arquivos Storage.
3. Revisar o SQL incremental exato, pré-condições, locks e impacto com um novo catálogo remoto. Ensaiar com dados fictícios e preservar dados existentes. O candidato atual tem transação e pré-condições, mas não valida o project ref automaticamente nem cobre configuração externa. Submeter SQL/hash e janela para aprovação própria; não usar `db reset`, `db push` ou escrita no SQL Editor por suposição.
4. Após uma aplicação **futura e aprovada**, comparar catálogos, grants, FKs, índices, triggers e 31 políticas; executar testes autenticados de isolamento, inativos, auditoria e fluxos com contas fictícias somente se autorizadas. Se falhar antes de COMMIT, abortar a transação; após COMMIT, tratar recuperação a partir de backup testado ou correção de avanço aprovada, sem prometer rollback sem perda de escritas posteriores.
5. Configurar Site URL/Redirect URLs HTTPS, templates, SMTP, limites e rotação da chave secreta exposta somente em etapa aprovada. Provisionar o primeiro administrador com autorização específica. Preparar Preview protegido e separado de Production apenas depois da equivalência, backup e Auth; não foi publicado nada na Vercel.

**Decisão:** a preparação e o diagnóstico permitidos da Missão 10 estão documentados, e a pendência visual local foi concluída. O Supabase remoto **não está homologado para uso real**: faltam suplemento de catálogo, inventário atualizado, backup recuperável, correção remota aprovada, testes RLS autenticados e Auth/HTTPS/SMTP. Nenhuma ação remota de escrita ou publicação está autorizada por este relatório.

## Ambiente e autorização

Antes da mudança de orientação, a Missão 10 usou uma pilha local descartável `NACM10Clean` e a encerrou após os testes. **Nenhuma nova pilha foi iniciada naquela revisão anterior.** Nesta retomada, uma pilha local foi usada para pgTAP, fluxos e revisão visual, e depois encerrada. O usuário autorizou auditoria somente de leitura do projeto remoto NAC existente. Não há autorização para aplicar migrations, criar usuários, alterar Auth, fazer backup remoto ou publicar Preview.

O `.env.local` contém a URL HTTPS desse projeto e uma chave **publishable**, mas não contém `NEXT_PUBLIC_SITE_URL` e não ativa `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH`. Seus valores não foram copiados para logs ou relatório. Não há marcador local de projeto Supabase vinculado nem token de acesso do CLI. O usuário entrou no painel web e autorizou a continuação da **leitura**, incluindo o salvamento automático do texto das consultas como metadado privado do SQL Editor. O painel identifica `main` como **PRODUCTION**, no plano **Free**.

### Evidência remota de leitura obtida nesta revisão

Usando somente a chave publishable, foram feitas requisições GET com `limit=0`, sem solicitar linhas, aos dez recursos esperados. Todos responderam HTTP **401 / código PostgreSQL 42501**, com `permission denied` para `anon`: `profiles`, `student_instructors`, `exercises`, `workout_plans`, `workout_days`, `workout_exercises`, `workout_sessions`, `workout_set_logs`, `body_metrics` e `audit_events`. Isso indica que os dez recursos existem e que o papel anônimo não tem `SELECT` direto; **não comprova** colunas, vínculos, 31 políticas nem isolamento entre usuários autenticados. A raiz OpenAPI respondeu 401 com essa chave pública; não se utilizou a chave secreta anteriormente exposta.

`GET /auth/v1/settings` respondeu 200 e informou `disable_signup=false` e `mailer_autoconfirm=false`: cadastro está permitido e confirmação automática de e-mail está desligada na configuração pública observada. A resposta não comprova SMTP funcional, templates, Site URL, allowlist ou entrega de mensagens. Não foram criadas contas nem sessões.

Para a comparação completa, foi preparado o script [mission10_remote_readonly.sql](../supabase/audit/mission10_remote_readonly.sql). Nesta revisão foram executados **SELECTs individuais somente de leitura** no SQL Editor, derivados dele: versão e presença do histórico de migrations, `EXISTS` nas dez tabelas e `auth.users`, catálogo de funções, colunas, políticas, contagem de objetos e extensões. O script inteiro, que inclui `BEGIN READ ONLY`/`ROLLBACK`, **não foi executado como bloco**. O SQL Editor salvou automaticamente o texto das consultas como item privado autorizado; não se gravou no banco. Nenhuma linha pessoal foi selecionada. Resultados do SQL Editor privilegiado servem para inventário, não como prova de RLS.

**Resultado confirmado pelo SQL Editor:** PostgreSQL `17.11`; `to_regclass('supabase_migrations.schema_migrations')` retornou `NULL` (histórico inexistente). `EXISTS` retornou `false` para as dez tabelas NAC e `auth.users`: não havia linhas nessas 11 tabelas no instante da consulta. O catálogo retornou **10 tabelas públicas, 10 com RLS, 29 políticas, 28 índices, 16 triggers de usuário e 71 constraints públicas** ([captura](evidence/mission-10-remote-readonly.png)). Há somente as dez tabelas NAC em `public`. A extensão `pgcrypto` está instalada na versão `1.3`; `pgtap` não apareceu entre as extensões instaladas. O inventário de funções em `public` e `nac_private` retornou **23 funções, todas em `public`**, contra **38 nomes distintos** definidos pelas 14 migrations locais. Não houve consulta ou modificação de dados do Storage.

As **15 funções locais ausentes** por nome são: `nac_private.bootstrap_first_admin`; `public.activate_instructor_workout_plan`, `admin_completed_weekly`, `admin_dashboard_counts`, `admin_exercise_duplicate_counts`, `admin_instructor_link_counts`, `admin_set_instructor_link`, `audit_exercise_change`, `move_draft_workout_day`, `move_draft_workout_exercise`, `prevent_exercise_delete`, `protect_link_with_active_plan`, `protect_prescribed_exercise`, `remove_draft_workout_day` e `student_has_session_for_plan`. A presença de uma função de mesmo nome não prova que seu corpo corresponde à migration local. O catálogo de colunas confirmou as dez estruturas de base e a ausência de `audit_events.operator_reference`; comparação de defaults, nulidade, constraints e definições completas ainda precisa ser fechada antes de preparar SQL incremental exato.

### Inventário confirmado no painel autenticado

- Projeto `NACACADEMIA`, branch `main` marcada **PRODUCTION**, região `ca-central-1`, estado `Healthy`; PostgreSQL **17.11.0.011** no painel e `17.11` pelo SQL, mesma versão principal 17 exigida pelo `supabase/config.toml` local. `pgcrypto` 1.3 presente; `pgtap` ausente.
- Página **Database Migrations** mostra **“Run your first migration”**; não há versões registradas no histórico do painel. As dez tabelas `public` esperadas aparecem na página **Tables**, e ela não mostra outras tabelas `public`. Isso é compatível com aplicação anterior de SQL fora do histórico de migrations; **não prova** qual arquivo ou trecho foi aplicado.
- Página **Policies** mostra RLS ativa nas dez tabelas (controle “Disable RLS”) e **29 políticas visíveis**. O estado local esperado tem **31**. As políticas `workout_days_draft_delete` e `workout_exercises_draft_delete`, criadas em `20261104050000_instructor_draft_editor.sql`, não aparecem. Os demais nomes visíveis coincidem com os nomes esperados, mas os predicados `USING`/`WITH CHECK` não foram comparados integralmente.
- `audit_events` tem **6 colunas** e não possui `operator_reference`, adicionada pela migration `20261104120000_first_admin_bootstrap.sql`. A função pública `admin_dashboard_counts` não foi encontrada na busca da página **Functions**; ela é definida em `20261104060000_admin_operations.sql` e é usada pela central administrativa. Não foi possível confirmar a função privada de primeiro administrador pelo painel público.
- A página **Indexes** lista **28 índices** no esquema `public`, contra **30** na instalação local limpa. Não aparecem `workout_sessions_one_open_per_student` (migration `20261104020000_student_workout_flow.sql`) nem `exercises_normalized_name_idx` (migration `20261104110000_admin_catalog_duplicates.sql`). A página **Triggers** mostra **16 triggers de dados** em `public`, contra **20** locais: não aparecem `student_instructors_protect_active_plan`, `exercises_protect_prescribed`, `exercises_audit` (migration `20261104060000_admin_operations.sql`) nem `exercises_prevent_delete` (migration `20261104090000_admin_history_guards.sql`). A ausência de um índice de sessão aberta pode permitir duplicidades que a versão local impede; não se testou escrita para verificar o comportamento remoto.
- A página de tabelas mostra estimativa **0 linhas** para cada uma das dez tabelas e a página Auth exibiu indicadores contraditórios. O `SELECT EXISTS` privilegiado resolveu essa dúvida: **nenhuma** das dez tabelas NAC nem `auth.users` possuía linhas no instante da consulta. Isso não substitui um backup antes de futura escrita, pois o estado remoto pode mudar.
- **Backups:** a página informa que o plano Free **não inclui backups de projeto**; o resumo mostra “No backups”. Não há backup recuperável comprovado. **Database Settings:** SSL obrigatório está desligado e o banco aceita conexões de todos os IPs; são configurações a revisar, sem alteração nesta missão.
- **Auth:** cadastro e provedor Email habilitados; confirmação de e-mail ligada; login anônimo desligado; Site URL `http://localhost:3000`; **nenhuma Redirect URL**; SMTP personalizado desligado. Assim, os callbacks HTTPS da futura hospedagem ainda não estão configurados.
- **Vercel:** não há `.vercel/project.json` nem `vercel.json` no workspace. Nenhuma integração Vercel foi alterada ou publicada.

**Implicação imediata:** `supabase db push` tentaria aplicar arquivos locais sem histórico correspondente sobre tabelas já existentes. Isso pode falhar ou produzir estado parcial. **Não executar `db push` nem marcar as 14 migrations como aplicadas por suposição.** A ausência de 15 funções, dois índices, quatro triggers, duas políticas de remoção, uma coluna e sua constraint impede declarar os painéis remotos prontos.

## Auditoria de infraestrutura

| Item | Base local e leitura remota parcial | Pendente no Supabase NAC existente |
| --- | --- | --- |
| Migrations | 14 de 14 aplicadas do zero na validação anterior; tabela de histórico remoto **inexistente** | Comparar definições remotas, classificar drift e preparar sequência incremental antes de qualquer aplicação |
| PostgreSQL | Configuração exige major 17; remoto informa 17.11.0.011; `pgcrypto` 1.3 presente | `pgtap` não está instalado no remoto; conferir demais diferenças de configuração antes de testes SQL |
| RLS | 10 tabelas/31 políticas na base local; remoto mostra RLS ativa e **29** políticas; dez recursos negam `SELECT` anônimo | Comparar predicados/grants e testar isolamento autenticado somente após aprovação dos fixtures |
| Auth | Fluxos locais passaram; remoto permite cadastro e exige confirmação | Corrigir Site URL/Redirect URLs e SMTP após proposta/aprovação; testar HTTPS real |
| Credenciais | Código usa chave `sb_publishable_…`; busca em `src/` e `public/` não encontrou chave de serviço | Rotacionar a chave secreta antes compartilhada fora de um cofre; conferir segredos no painel sem registrá-los |
| Backup | Plano Free **sem backup agendado**; nenhum backup recuperável comprovado | Planejar exportação lógica e validação antes de migrations; ensaio integral exige destino isolado aprovado |
| Vercel | Build local de produção aprovado; nenhum projeto ou variável Vercel alterado | Configurar Preview isolado e protegido somente após autorização explícita |

A configuração local do Auth usa `http://localhost:3000` e callbacks adicionais nas portas 3000/3003. Essas entradas **não configuram** o painel do Supabase remoto. Os callbacks da aplicação são `/auth/confirm?destino=aluno` e `/auth/confirm?destino=redefinir-senha`; a origem HTTPS exata precisa constar na allowlist e nos templates de e-mail do projeto NAC antes de ativar Auth remoto. O [guia oficial de Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) descreve Site URL, lista de redirecionamentos e `{{ .RedirectTo }}`.

Backups do banco do Supabase não incluem os próprios objetos do Storage API; verificar separadamente caso a homologação passe a armazenar arquivos. Restaurar um projeto em uso pode causar indisponibilidade. A [documentação oficial de backups](https://supabase.com/docs/guides/platform/backups) descreve as opções conforme o plano e a restauração em projeto separado.

## Testes efetivamente executados antes da nova orientação

| Teste na pilha descartável | Resultado |
| --- | --- |
| Migrations | 14/14 aplicadas |
| Sete suítes pgTAP | **125 aprovados, 0 reprovados**; [log](evidence/mission-10-pgtap.log) |
| `supabase db lint --schema public,nac_private --fail-on error` | Sem erros de esquema |
| Auth local | 17 verificações aprovadas, incluindo e-mail via Mailpit, callbacks SSR, refresh inválido e limpeza |
| Fluxo do aluno | Aprovado: ficha, exercícios, sessão, séries, cargas, conclusão, histórico, evolução e isolamento |
| Fluxo do professor | Aprovado: vínculos, rascunhos, ativação, consulta de resultados, isolamento entre professores e encerramento de vínculo |
| Fluxo administrativo | Aprovado: papéis, vínculos, catálogo, indicadores, inativação, histórico e auditoria |
| Responsividade automatizada | Fluxos nos três painéis em 390 × 844, 768 × 1024 e 1440 × 900, sem rolagem horizontal nos percursos testados |
| `npm run lint`; `npx tsc --noEmit` | Aprovados |
| `npm run test:db-schema`; `npm run test:deployment-config` | Aprovados; 9 cenários de configuração |
| `npm run build` | Aprovado com variáveis **locais** e Auth remoto desligado; sem chamada ao remoto |
| Estado após testes | 14 migrations, 31 políticas, 10 tabelas RLS, **0 usuários/perfis/eventos**; [inventário](evidence/mission-10-local-inventory.log) |

Os testes funcionais usaram o Supabase Auth local e contas `example.test` criadas e removidas pelos próprios scripts. O teste de primeiro administrador foi executado apenas dentro da suíte pgTAP transacional; nenhuma conta administrativa remota ou permanente foi criada. Uma consulta privilegiada isolada no SQL Editor não foi usada como prova de RLS.

## Correção e desempenho

`getLinkedStudent()` em `src/lib/instructor/data.ts` buscava todos os vínculos e perfis ativos do professor para abrir o detalhe de um aluno. Agora consulta somente o vínculo ativo solicitado e o perfil correspondente. O teste funcional do professor passou após a alteração, inclusive a negação do detalhe de aluno vinculado a outro professor. A política RLS permaneceu intacta.

O build informou **103 kB de JavaScript compartilhado** e páginas com carga inicial de aproximadamente **103 a 114 kB**. Isso é tamanho de artefato, **não** tempo de carregamento medido em rede. A administração pagina listagens, vínculos, exercícios e auditoria em 20 itens. O painel do aluno limita sessões a 200 e medidas a 100; o resumo do professor limita sessões recentes a 200 e o catálogo a 500. Listas de vínculos e fichas do professor ainda podem crescer sem paginação, e os limites podem ocultar registros antigos ou itens de catálogo em bases grandes. Medir com dados fictícios representativos antes de alterar esses fluxos. Não houve benchmark remoto, teste de carga, contagem de requisições em infraestrutura remota nem medição de latência de SMTP.

## Plano seguro para o projeto NAC existente

1. O ID, versão principal PostgreSQL, dez tabelas, políticas visíveis, Auth, extensões, funções e estado de backups já foram verificados por leitura. A presença de dados foi verificada com `EXISTS`, sem selecionar linhas pessoais. Repetir o inventário imediatamente antes de qualquer operação futura, pois o banco pode mudar.
2. A tabela `supabase_migrations.schema_migrations` não existe, então não há 14 versões remotas a comparar diretamente. Comparar cada definição remota com o estado final esperado das 14 migrations: FKs, defaults, checks, índices, triggers, corpos de funções, grants, RLS e predicados das 31 políticas. Classificar cada diferença como já aplicada, ausente ou modificada manualmente. **Não** pressupor que a presença das dez tabelas significa equivalência das migrations.
3. Preparar uma proposta exata de migrations incrementais para apenas os objetos ausentes ou divergentes, com SQL de avanço, pré-condições, impacto, tempo de bloqueio e reversão. Não sobrescrever tabelas, não apagar registros e não usar `db reset`. Submeter a proposta à aprovação antes de qualquer escrita.
4. Antes de escrita aprovada, obter **backup lógico manual** e documentar o ponto de retorno. No plano Free não há backup diário; o Supabase recomenda exportação via CLI. O `supabase db dump` padrão exclui dados e os esquemas gerenciados `auth`/`storage`, portanto um único dump padrão **não** é backup completo: planejar esquema, dados, histórico de migrations, usuários Auth e metadados necessários separadamente, além dos próprios objetos do Storage. Guardar a cópia fora do repositório, protegida, verificar integridade e definir recuperação. **Não restaurar sobre o banco NAC em uso.** Sem destino isolado aprovado, o ensaio integral de restauração permanece pendente; não criar outro projeto Supabase por iniciativa própria. [Backups](https://supabase.com/docs/guides/platform/backups), [comportamento do `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump).
5. Rotacionar a chave secreta anteriormente exposta, sem colocá-la no cliente ou neste relatório. Conferir políticas/grants remotos e testar RLS com contas fictícias **somente após autorização específica para criá-las**. Provisionar administrador apenas com aprovação própria e o procedimento da [Missão 09](NAC-MISSAO-09.md).
6. Preparar Auth remoto: confirmação de e-mail, SMTP, remetente, limites, Site URL HTTPS e callbacks exatos. Testar cadastro, login, logout, recuperação, refresh, inativação e os três painéis após aprovação para testes com dados fictícios. Preservar os dados atuais.
7. Medir consultas e latência com volume fictício representativo sem misturar dados reais. Registrar p50/p95, requisições, paginação e erros; não inferir desempenho remoto do build local.
8. Preparar Vercel Preview protegido com URL/chave publishable **do mesmo projeto NAC**, `NEXT_PUBLIC_SITE_URL` da origem HTTPS e `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true` somente depois das verificações. Como Preview e site futuro compartilharão o mesmo banco, não executar testes que criem contas ou dados por meio desse Preview sem aprovação específica. Segregar as variáveis de Preview e Production na Vercel e revisar callbacks e segredos. A [documentação da Vercel](https://vercel.com/docs/environment-variables) distingue esses ambientes. Nenhuma variável Vercel foi configurada e nenhum Preview foi publicado.

## Decisão pré-publicação

O código passou pela instalação limpa, pela segurança automatizada e pelos fluxos locais dos três painéis **antes desta nova orientação**. A leitura remota confirmou que as dez tabelas NAC e `auth.users` estavam vazias, mas constatou divergências reais: histórico de migrations inexistente, duas políticas RLS, dois índices, quatro triggers, uma coluna, uma constraint e 15 funções exigidas pelo estado local ausentes. **Não há evidência para declarar a equivalência do esquema remoto, as 31 políticas remotas, a homologação funcional remota ou a prontidão para publicação concluídas.** Faltam comparação integral das definições, backup recuperável, destino aprovado para ensaio de restauração, SMTP/HTTPS, rotação da chave secreta, aprovação específica para fixtures/testes ou qualquer migration, medições e autorização separada de Preview. Publicação em produção pertence a missão futura.
