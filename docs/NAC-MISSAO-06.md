# Missão 06 — Painel do aluno

## Implementação

O painel protegido em `/aluno` consulta ficha ativa, sessões, séries, medidas e perfil via Supabase SSR com o token do aluno. Nenhum `service_role` é usado no aplicativo. A navegação móvel oferece Início, Treinos, Histórico, Evolução e Perfil.

As ações de iniciar treino, registrar ou corrigir uma série, finalizar, registrar medidas e editar nome/telefone verificam o perfil ativo no servidor antes de escrever. A sessão em andamento é retomada após recarregar a página. A carga, as repetições e o progresso vêm dos registros persistidos. O histórico exibe até 200 sessões recentes e permite filtrar por 7, 30 ou 90 dias e pela divisão. O total de treinos no painel usa uma contagem exata no banco.

O esquema não possui agenda semanal nem campos de altura ou abdômen. O painel mostra a ficha ativa e as medidas que realmente existem, sem criar uma agenda ou indicadores fictícios.

## Migration local

`20261104020000_student_workout_flow.sql` adiciona uma restrição de sessão aberta única por aluno; mantém fichas e exercícios arquivados legíveis quando fazem parte do histórico do próprio aluno; permite concluir uma sessão iniciada antes de a ficha ser arquivada. Não altera as migrations anteriores nem amplia a visibilidade para outros alunos. A aplicação remota depende de revisão e autorização posteriores. Antes de aplicar em outro banco, verificar se já existem sessões abertas duplicadas por aluno; o índice único recusará a migration se existirem.

## Testes locais

1. Iniciar o Supabase local e aplicar as migrations locais com `supabase migration up`.
2. Executar `supabase test db --local`: 48 testes pgTAP, todos transacionais e com dados fictícios.
3. Fazer build e iniciar o Next.js isolado na porta 3003 com `NAC_NEXT_DIST_DIR=.next-auth-test`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL=http://localhost:3003` definidos com **valores do Supabase local**. Não habilitar `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH`.
4. Definir no processo de teste `SUPABASE_LOCAL_URL`, `SUPABASE_LOCAL_PUBLISHABLE_KEY`, `SUPABASE_LOCAL_SECRET_KEY` da CLI local e `NAC_LOCAL_APP_URL=http://localhost:3003`; executar `node scripts/test-auth-local.mjs` e `npm run test:student-local`.
5. Executar `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:db-schema`.

O teste funcional cria e remove contas fictícias locais. Exercita as Server Actions do Next.js, confere persistência e isolamento na Data API, testa recarregamento, duplicidade, conclusão e novo login. Usa Chrome headless local para verificar seis rotas em 390 × 844, 768 × 1024 e 1440 × 900, salvando capturas em `docs/evidence/`. As capturas mostram apenas dados fictícios e devem ser inspecionadas visualmente após a execução.

### Resultado verificado em 4 de novembro de 2026

- `npm run lint`: aprovado, sem avisos ou erros de ESLint.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado com variáveis locais isoladas; todas as rotas do aluno compiladas.
- `npm run test:db-schema`: aprovado, quatro migrations e três suítes pgTAP encontradas.
- `supabase test db --local`: 48 de 48 testes aprovados.
- `node scripts/test-auth-local.mjs`: 17 verificações de autenticação aprovadas.
- `node scripts/test-student-local.mjs`: fluxo completo aprovado, inclusive os 18 pares rota/viewport sem rolagem horizontal. A limpeza final dos fixtures foi conferida por consulta local: zero usuários, perfis ou fichas do teste de fluxo.

## Pendências

O professor ainda não dispõe de interface para montar e ativar fichas; a ficha usada na validação é um fixture local. O projeto remoto não foi alterado. Antes da futura homologação remota, revisar a migration incremental, SMTP, políticas efetivas e fluxos de contas reais.
