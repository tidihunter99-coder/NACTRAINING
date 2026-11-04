# NAC TRAINING — Missão 05: homologação remota e segurança da autenticação

Data da revisão: 3 de novembro de 2026, horário de São Paulo.

## Estado da missão

**Preparação local concluída; homologação remota pendente.** A aplicação, o banco local e os testes foram revisados. Nenhuma migration, configuração, conta ou dado do Supabase remoto foi alterado. O projeto não foi publicado e `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH` permanece desativado.

## 1. O que foi implementado e corrigido

Foi identificada uma lacuna entre a proteção das páginas e a proteção direta da Data API. Antes da correção, uma pessoa cujo perfil fosse marcado `inactive` continuava com um JWT válido e podia ler medidas físicas, fichas, sessões, séries, vínculos e exercícios. Também conseguia inserir medidas pela API. A suíte nova reproduziu **10 falhas em 11 testes**; os 22 testes anteriores passaram porque não incluíam perfis inativos.

A migration incremental `supabase/migrations/20261104010000_inactive_profile_access.sql` exige perfil ativo nas policies de dados do aluno e professor e nas funções auxiliares de fichas e sessões. O perfil inativo ainda pode ler o próprio registro em `profiles` para que o aplicativo apresente o estado da conta. A migration foi aplicada **somente ao Supabase local**. As duas migrations históricas não foram editadas.

O código em `src/lib/supabase/env.ts` também exige, para ativação remota, opt-in explícito, endpoint HTTPS e `NEXT_PUBLIC_SITE_URL` com origem HTTPS exata. Isso evita abrir o Auth remoto com links de confirmação apontando para `localhost` por falta de configuração. O acesso local continua permitido. `scripts/verify-supabase-schema.mjs` passou a verificar a terceira migration e a suíte adicional. Os procedimentos em `docs/auth-local.md` e `docs/database.md` foram alinhados ao código.

## 2. Segurança validada localmente

- Três migrations presentes no histórico local: `20261103210000`, `20261103220000` e `20261104010000`.
- Dez tabelas com RLS habilitada e 29 policies efetivas após a migration.
- **38/38 testes pgTAP aprovados:** 22 originais e 16 novos para usuários inativos. Log: `supabase/tests/mission-05-rls-final.log`.
- **17/17 etapas de autenticação aprovadas** novamente após a migration, com contas fictícias somente locais. Incluem cadastro e confirmação PKCE, login, recuperação e redefinição de senha, logout, sessão vencida, perfis inativos e acesso por papel. Log: `supabase/tests/mission-05-auth-final.log`.
- O papel do cadastro público permanece definido como `student` pelo trigger `handle_new_user`. Metadata e parâmetros do cliente não concedem `instructor` ou `admin`.
- As páginas `/aluno`, `/professor` e `/administracao` continuam verificando identidade com `getUser()`, papel e status de `profiles` no servidor. RLS protege as operações com dados.
- `npm run lint`, `npx tsc --noEmit`, `npm run build` e `npm run test:db-schema` passaram. O build usou um diretório separado e variáveis do Supabase local para não interferir na instância Next.js já aberta na porta 3000.

## 3. O que foi observado no Supabase remoto

O único endpoint remoto configurado em `.env.local` aponta para o projeto de referência `ifczsjazqxfqimquozjy`; a CLI local não está vinculada a projeto remoto (`supabase/.temp/project-ref` ausente). **Não foi comprovado que esse projeto seja homologação nem que exista outro projeto separado de produção.** O acesso ao dashboard exigiu login nesta sessão, por isso configurações administrativas, histórico de migrations, policies, triggers, SMTP e URLs permitidas não puderam ser inspecionados.

Foram realizadas somente requisições públicas de leitura ao endpoint identificado, sem criar usuários ou consultar registros:

| Verificação pública | Observação | Limite da conclusão |
| --- | --- | --- |
| `/auth/v1/settings` | E-mail habilitado; `disable_signup=false`; `mailer_autoconfirm=false` | Cadastro via Auth está aberto e a confirmação aparenta ser exigida. Não informa SMTP, templates ou redirects. |
| Dez rotas `/rest/v1/<tabela>?select=id&limit=0` | Todas responderam HTTP 401, código PostgreSQL `42501` | A chave anônima não pôde consultar essas rotas. Não comprova as migrations, a contagem de policies ou o isolamento entre usuários autenticados. |

O bloqueio de autenticação remota no aplicativo **não desliga o endpoint público de cadastro do próprio Supabase**. Como `disable_signup=false`, a decisão sobre manter o cadastro remoto aberto deve ser tomada pelo responsável pelo projeto após confirmar se ele é homologação ou produção. Nenhuma configuração remota foi alterada aqui.

Uma chave secreta do Supabase foi compartilhada anteriormente nesta conversa. Ela não foi usada nos testes remotos nem gravada no código. O responsável técnico deve identificar o projeto correto, revisar seu uso e **rotacionar a credencial antes de liberar o ambiente**, sem reenviar o valor em chats ou logs.

## 4. E-mail e SMTP

O Mailpit local validou confirmação e recuperação sem envio real. O provedor SMTP remoto e seus limites **não puderam ser verificados**. Segundo a [documentação do Supabase sobre SMTP](https://supabase.com/docs/guides/auth/auth-smtp), o serviço padrão hospedado é restrito a endereços autorizados da equipe e não é indicado para usuários reais. A academia deve escolher e configurar um serviço SMTP apropriado em ambiente autorizado, com credenciais apenas no painel/servidor, remetente e domínio revisados e limites adequados. Nenhum serviço foi contratado ou ativado nesta missão.

As URLs de confirmação e recuperação precisam corresponder à lista de redirects no Auth. Usar entradas exatas para `https://DOMINIO-DE-HOMOLOGACAO/auth/confirm?destino=aluno` e `https://DOMINIO-DE-HOMOLOGACAO/auth/confirm?destino=redefinir-senha`, além de `NEXT_PUBLIC_SITE_URL` na mesma origem HTTPS. Revisar as templates para preservar o destino configurado. Referência: [Redirect URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 5. Primeiro administrador e professores

O cadastro público não cria professor ou administrador. `admin_assign_role` exige um administrador ativo e registra a mudança pelo trigger de auditoria. O primeiro administrador depende de procedimento excepcional, manual e privilegiado. O modelo em `docs/database.md` agora exige identidade Auth com e-mail confirmado, perfil ativo, ausência de outro administrador, atualização de exatamente um perfil e evento de auditoria. Também é necessário registro externo do operador e da autorização. **Nenhuma conta administrativa real foi criada.**

## 6. Textos jurídicos e privacidade

As páginas `/termos` e `/privacidade` declaram explicitamente que são provisórias. O cadastro exige a marcação do checkbox, mas a versão dos textos e o instante de aceitação não são armazenados. A NAC Academia deve revisar os textos e decidir, com assessoria jurídica, se precisa registrar aceite e versão antes de receber alunos reais. Nenhuma afirmação de conformidade jurídica definitiva foi feita.

## 7. Procedimento para homologação remota controlada

1. O responsável da NAC identifica e confirma a titularidade de **um projeto Supabase de homologação separado**, sua referência e a URL da aplicação de teste. Confirmar que não pertence à TR E-SPORTS nem a outra aplicação. Não inferir isso apenas do nome do projeto.
2. Com acesso administrativo autorizado, fazer uma comparação **somente de leitura** do histórico em `supabase_migrations.schema_migrations`, das dez tabelas, de `relrowsecurity`, das 29 policies efetivas, do trigger `on_auth_user_created` e das funções administrativas. Conferir também Auth, Site URL, Redirect URLs, templates, SMTP e rate limits. Não inspecionar dados pessoais para essa comparação.
3. Registrar diferenças e preparar um plano de aplicação incremental e reversão com backup/snapshot apropriado. A terceira migration local é necessária se as policies remotas ainda permitirem acesso de perfis inativos. **Não executar `link`, `db push`, SQL de alteração ou testes com contas no remoto sem autorização específica para o destino confirmado.**
4. Após essa autorização, aplicar somente as migrations pendentes na homologação, validar o histórico, executar testes RLS e os fluxos Auth com identidades fictícias desse ambiente. Verificar confirmação, recuperação, expiração, aluno/professor/admin e bloqueio de inativos por página **e pela Data API**. Não reutilizar credenciais ou dados reais.
5. Revisar e publicar textos jurídicos e SMTP antes de cogitar usuários reais. Só depois de homologação aprovada, avaliar a ativação de `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH=true` com `NEXT_PUBLIC_SITE_URL` HTTPS correto. Uma nova autorização é necessária para qualquer publicação ou mudança em produção.

## 8. Pendências e próxima missão

Permanecem pendentes: confirmar o projeto de homologação, auditar migrations/policies remotas com acesso autorizado, aplicar a correção de inativos nesse ambiente se necessária, configurar e testar SMTP, revisar textos jurídicos e rotacionar a credencial secreta anteriormente compartilhada. A autenticação remota e a liberação a alunos reais **não foram aprovadas**.

Próxima missão recomendada: executar a homologação remota controlada após identificação do projeto e autorização específica. O desenvolvimento do painel completo do aluno pode prosseguir localmente em uma etapa separada.
