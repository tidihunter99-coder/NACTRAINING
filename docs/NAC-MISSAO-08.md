# Missão 08 — Central administrativa NAC TRAINING

## Resultado

A central protegida em `/administracao` usa a sessão Supabase e exige perfil `admin` ativo. Os dados exibidos vêm do banco local, sob RLS, sem chave `service_role` no aplicativo. O teste funcional usou contas fictícias e confirmou o ciclo administrador → professor → aluno → administrador.

### Funcionalidades e rotas

| Rota | Funcionalidade |
| --- | --- |
| `/administracao` | Indicadores agregados de alunos, professores, vínculos, fichas e treinos dos últimos 30 dias; gráfico semanal com dados suficientes; atalhos. |
| `/administracao/alunos` | Busca por nome, filtro de situação, paginação de 20 registros, vínculos e ficha ativa. |
| `/administracao/alunos/[studentId]` | Cadastro, situação, professores, ficha ativa e atividade resumida; inativação e reativação com confirmação. |
| `/administracao/professores` | Busca, filtro, paginação, quantidade de alunos e aprovação de uma conta já cadastrada e confirmada para o papel de professor. |
| `/administracao/professores/[instructorId]` | Cadastro, situação, contagem exata de vínculos e lista dos 20 vínculos mais recentes. |
| `/administracao/vinculos` | Atribuição idempotente, reativação e retirada de vínculos; lista paginada. O esquema permite múltiplos professores por aluno. |
| `/administracao/exercicios` | Catálogo paginado com pesquisa, grupo muscular, situação, cadastro central e aviso de possíveis duplicatas por nome normalizado. |
| `/administracao/exercicios/[exerciseId]` | Edição de exercício ainda não prescrito e arquivamento/restauração com confirmação. |
| `/administracao/auditoria` | Eventos paginados com ator, ação, registro e horário; filtro por ação. |

Foram reutilizados `PageHeading`, `StudentCard`, `EmptyState`, `Notice`, `Brand` e o design system NAC. Os novos componentes compartilhados são `AdminNav`, `AdminMessage`, `ConfirmField`, `Pagination` e `StatusBadge`. A navegação inferior no celular respeita a área segura.

## Segurança e migrations

As sete migrations anteriores permanecem intactas. Seis migrations incrementais foram adicionadas; **13 migrations** estão aplicadas no Supabase local:

1. `20261104060000_admin_operations.sql`: autorização de papel e situação cadastral, RPC transacional de vínculo, indicadores agregados, proteção de exercício prescrito e auditoria do catálogo.
2. `20261104070000_admin_weekly_activity.sql`: agregação semanal de treinos concluídos.
3. `20261104080000_admin_log_privacy.sql`: elimina a leitura administrativa irrestrita de séries individuais.
4. `20261104090000_admin_history_guards.sql`: bloqueia exclusões e mudanças de identidade de vínculos e exercícios pela Data API autenticada.
5. `20261104100000_admin_history_guard_cleanup.sql`: mantém manutenção privilegiada e limpeza de fixtures locais, sem conceder exclusão a administradores autenticados.
6. `20261104110000_admin_catalog_duplicates.sql`: índice de nome normalizado e contagem de duplicatas por página.

Há **31 políticas RLS efetivas** no banco local. O administrador pode consultar contagens e dados cadastrais autorizados, mas não recebe leitura de medidas físicas ou séries individuais. As Server Actions verificam papel ativo e usam as RPCs protegidas. A inativação bloqueia rotas e Data API; não apaga histórico. A retirada de vínculo arquiva a ficha ativa desse professor na mesma transação e preserva sessões anteriores. A alteração de papel exige conta com e-mail confirmado e sem referências de treino; a interface não permite criar administradores. O procedimento de provisionamento do primeiro administrador continua externo ao cadastro público.

Eventos de situação, papel, vínculo, ficha e catálogo guardam ator, ação, registro e horário. Usuários autenticados não podem inserir eventos de auditoria arbitrários. Os logs não guardam senhas ou tokens.

## Testes executados em 4 de novembro de 2026

- `supabase test db --local`: **112 aprovados, 0 reprovados**, em seis suítes pgTAP. Os 35 testes administrativos incluem elevação de privilégios, acesso por papel, vínculo duplicado, inativação, histórico, auditoria falsificada, Data API, medidas, séries e catálogo.
- `npm run test:admin-local`: aprovado com quatro contas fictícias. Habilitou professor por fluxo autorizado, vinculou aluno, criou e ativou ficha, registrou e concluiu treino, verificou indicadores, inativou e reativou aluno, arquivou exercício, retirou vínculo e confirmou a preservação do histórico. Os fixtures do teste foram removidos.
- `npm run test:instructor-local`: regressão aprovada, inclusive isolamento entre professores e limpeza.
- `npm run test:student-local`: regressão aprovada, inclusive execução e histórico.
- `node scripts/test-auth-local.mjs`: 17 verificações aprovadas; o teste agora remove as contas e os eventos fictícios que cria.
- `npm run test:db-schema`: aprovado; 13 migrations e seis suítes detectadas.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: aprovados. O build usou variáveis do Supabase local e `.next-admin-test`, sem habilitar autenticação remota.
- Chrome headless: nove rotas administrativas em **390 × 844**, **768 × 1024** e **1440 × 900**; mais painel e detalhe com ficha ativa nas mesmas larguras. Nenhuma rolagem horizontal de página. As capturas foram inspecionadas visualmente.

Capturas: `evidence/mission-08-active-dashboard-390.png`, `evidence/mission-08-active-dashboard-768.png`, `evidence/mission-08-active-dashboard-1440.png` e `evidence/mission-08-active-detail-390.png`. Os totais incluem contas fictícias preexistentes no banco local e variam conforme o momento da captura; não são dados de produção.

## Correções feitas durante a validação

O teste ponta a ponta revelou um validador de UUID incompleto nas novas páginas de detalhe, corrigido antes da execução final. A suíte pgTAP inicial tinha contagem planejada incorreta e um fixture de série sem os campos exigidos pelo esquema; ambos foram corrigidos. Os scripts de regressão passaram a remover os próprios registros de auditoria. A execução final das suítes está aprovada.

## Pendências e homologação

- Revisar as seis migrations incrementais em um ambiente remoto de **teste autorizado** e validar a aplicação em uma cópia limpa antes de qualquer produção. A cadeia completa não foi reaplicada do zero nesta missão, pois o banco local continha fixtures preexistentes que foram preservados.
- Definir o processo operacional de provisionamento inicial de administradores e a aprovação interna de professores. O cadastro público sempre cria aluno.
- Definir política de retenção e exportação de auditoria; eventos não devem ser apagados em produção.
- O detalhe do professor apresenta os 20 vínculos mais recentes com contagem exata; a lista completa está na rota paginada de vínculos. Indicadores e tendências devem ser acompanhados com volume real em homologação.
- Exercícios já prescritos preservam seus campos de conteúdo. Uma correção de prescrição histórica exigirá um fluxo de versionamento explícito, não edição retroativa.

Nenhuma migration foi aplicada ao Supabase remoto. Não houve deploy nem mudança nos dados reais.
