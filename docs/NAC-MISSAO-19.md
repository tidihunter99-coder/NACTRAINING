# NAC TRAINING — Missão 19: integração e homologação

Data: 06/11/2026 (America/Sao_Paulo)
Classificação: **APROVADO COM RESSALVAS no ambiente local; HOLD para integração remota**

## Escopo executado

Esta rodada preservou os dados e não aplicou migrations, não alterou o projeto Supabase remoto e não publicou deploy. Foram executadas correções locais de segurança/configuração, verificações estáticas, leitura remota anônima e fluxos completos com fixtures descartáveis no Supabase local.

## Correções executadas

- O `.env.local` apontava ao projeto Supabase remoto com `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true`, sem `NEXT_PUBLIC_SITE_URL` HTTPS. O código recusava essa configuração, mas o flag contrariava a política de manter Auth remoto fechado antes da homologação. O flag foi restaurado para `false`; nenhuma configuração do Supabase foi alterada.
- O README citava 15 migrations, embora o repositório tenha 21. O estado foi corrigido para não apresentar a contagem histórica como inventário atual.

## Evidências atuais

| Área | Resultado | Evidência |
| --- | --- | --- |
| TypeScript | Aprovado | `npm run typecheck` sem erros. |
| Lint | Aprovado | `npm run lint`: sem avisos/erros. |
| Build | Aprovado | `npm run build`: compilação, tipos e 28 páginas estáticas concluídos. |
| Estrutura local versionada | Aprovado estaticamente | `npm run test:db-schema`: 21 migrations, 29 policies-base e 8 suítes pgTAP encontradas. |
| RLS local | Aprovado | `npm run test:db-rls`: 134 testes em 8 suítes, todos aprovados. |
| Fluxos HTTP locais | Aprovado | `node scripts/run-mission111-local.mjs --cleanup-stale-fixture`: Auth, aluno, professor, administração, favoritos, sessão/mídia e revisão: 8/8. |
| Configuração de deploy | Aprovado | `npm run test:deployment-config`: 9 verificações. |
| PWA | Aprovado estaticamente | `npm run test:pwa`: manifest, ícones, exclusão de dados privados do cache e estratégia de atualização. |
| Player de exercícios | Aprovado estaticamente | `node scripts/test-exercise-player.mjs`. |
| Storage local | Aprovado | Bucket `nac-exercise-media` encontrado com `public=false`; upload administrativo, URLs assinadas, revisão, revogação e remoção passaram no fluxo integrado. |
| Vercel local | Pendente | Não há `.vercel/project.json` nem `vercel.json`; não foi feito link, Preview ou deploy. |
| Auditoria remota de schema | Inventário disponível; divergente do alvo local | `npm run test:mission15-audit`: 17/17 CSVs somente-leitura disponíveis; `npm run test:mission15-consolidated` validou as 17 consultas. |
| Leitura anônima remota | Parcial | `node --use-system-ca scripts/mission10-remote-readonly.mjs`: as dez tabelas retornaram 401/42501 para `anon`; não testa usuários autenticados nem RLS entre papéis. |

## Banco, Auth e Storage remoto

- A rota pública de configurações Auth respondeu `disable_signup=false` e `mailer_autoconfirm=false`.
- O bucket `nac-exercise-media` respondeu `400 NoSuchBucket`. Assim, o Storage que o aplicativo espera para capas, demonstrações e mapas anatômicos **não existe no projeto remoto atual**.
- O inventário de 05/11/2026 mostra que o remoto não tem histórico de migrations e está atrás do schema local. O histórico também aponta ausência de controles locais posteriores, incluindo componentes administrativos e de mídia. Não foi aplicado nenhum patch porque isso requer backup verificável, teste de restauração e autorização explícita.
- Em 07/11/2026, uma sessão autorizada de professor confirmou **40 exercícios** em `public.exercises`, paginados em duas telas. A exportação visível de nome/grupo está em `catalog-remote-visible-20261107.json`; a consulta única para exportar todos os campos existentes está em `catalog-remote-export-readonly.sql`.

## Biblioteca de exercícios

Os 40 nomes e grupos musculares reais foram recuperados por leitura autenticada e passam no importador local em modo de simulação. A exportação visível não contém IDs, descrições, instruções ou mídias; portanto ainda não há base para aprovar qualquer exercício:

- O bucket remoto esperado não existe.
- Não houve inventário autenticado de mídias, direitos, responsável técnico ou estado de revisão.
- As cinco imagens e cinco exercícios citados na Missão 09.2 são somente fixtures locais e não representam o catálogo real.

O inventário persistente local após a limpeza das fixtures é: 0 exercícios, 0 capas, 0 vídeos, 0 mapas anatômicos, 0 pendentes e 0 aprovados. O importador validou os 40 metadados recuperados, mas não os gravou. Um manifesto organiza 40 associações candidatas de vídeo e marca uma duplicata para revisão; nenhum arquivo foi associado, enviado ou aprovado. Consequentemente, total de vídeos válidos, capas, mapas anatômicos e exercícios aprovados no ambiente remoto permanecem **indeterminados**; nenhum valor foi inferido.

## Fluxos de aluno, professor e administração

O Docker Desktop foi localizado e iniciado sem apagar containers ou volumes. A execução nova comprovou Auth, criação/ativação de ficha, vínculo professor-aluno, sessão, séries, cargas, histórico, indicadores administrativos, isolamento por papel/RLS e persistência após novo login. Todas as contas, mídias e registros usados foram fixtures locais e o executor as removeu ao final.

Uma tentativa de inspeção visual foi interrompida: a porta 3000 servia outro projeto local (JMSTUDIO), portanto não foi usada como evidência. O executor marcou responsividade como `SKIP RESPONSIVE`; a aprovação visual continua pendente. Nenhuma conta real, formulário externo ou dado de usuário foi utilizado.

## Bloqueios e ação necessária

1. **Storage remoto ausente (crítico):** confirmar que `ifczsjazqxfqimquozjy.supabase.co` é o projeto NAC correto e, somente após backup/restauração comprovados e autorização, criar/configurar o bucket e policies previstos pelas migrations.
2. **Schema remoto divergente (crítico):** concluir a revisão dos 17 CSVs, preparar migration incremental específica e obter aprovação antes de aplicar qualquer alteração remota.
3. **Primeiro administrador (crítico):** precisa de conta real confirmada, operador PostgreSQL confiável, referência de operação e autorização separada para `nac_private.bootstrap_first_admin`; não criar senha fixa nem promover usuário publicamente.
4. **Conteúdo real (crítico):** executar a consulta de exportação completa no SQL Editor autorizado, conferir mídias, direitos e responsável técnico, e revisar humanamente o manifesto antes de qualquer associação. Não associar mídias apenas por nome presumido.
5. **Aprovação visual (não crítica para o fluxo local):** abrir o NAC em uma porta exclusiva, diferente da ocupada pelo JMSTUDIO, e executar os percursos responsivos com fixtures locais.
6. **Publicação/Auth remoto (crítico):** definir domínio HTTPS, Site URL, Redirect URLs e SMTP; manter o opt-in remoto desativado até a homologação e autorização de publicação.
7. **Vercel (pendente):** vincular deliberadamente o repositório ao projeto correto e configurar as variáveis separadas de Preview/Production somente após decidir o ambiente de homologação; não criar Preview nesta etapa.

## Resultado

**APROVADO COM RESSALVAS localmente; HOLD remotamente.** A aplicação, os três painéis, RLS e Storage privado funcionam com fixtures locais e foram limpos ao final. Os 40 exercícios foram recuperados por leitura, porém a exportação completa, as mídias revisadas, o bucket remoto, o schema remoto homologado e o administrador remoto continuam pendentes. Não publicar nem habilitar Auth remoto até resolver esses bloqueios.
