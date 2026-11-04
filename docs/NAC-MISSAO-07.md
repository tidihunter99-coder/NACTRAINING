# Missão 07 — Painel do professor

## Implementação

O painel protegido em `/professor` usa a sessão real do Supabase e exige perfil `instructor` ativo. O professor vê apenas vínculos ativos com alunos ativos. Os indicadores vêm de fichas, sessões e séries persistidas; o total de treinos concluídos usa uma contagem exata. A seção Meus Alunos oferece busca e filtros por ficha e atividade recente.

Em `/professor/fichas`, o professor cria rascunhos para alunos vinculados. O editor permite alterar dados, criar e editar divisões, adicionar e editar prescrições do catálogo, definir séries, repetições, carga de referência, descanso e observações, reordenar e remover itens do rascunho. O catálogo em `/professor/exercicios` usa exercícios existentes da academia ou criados pelo professor, com busca por nome e grupo muscular. Fichas ativas e arquivadas ficam em leitura.

A ativação é transacional. A ficha ativa anterior do mesmo professor é arquivada e a nova é ativada sob bloqueio por aluno. Uma ficha ativa de outro autor impede a substituição por este fluxo. Sessões iniciadas antes da troca preservam suas referências. O aluno vê a nova ficha em `/aluno/treinos`.

O detalhe em `/professor/alunos/[studentId]` apresenta visão geral, ficha atual, histórico, medidas e progressão de cargas reais. `/professor/alunos/[studentId]/sessoes/[sessionId]` apresenta exercícios, séries, repetições e cargas registradas. Sem registros, a interface apresenta estados vazios. Nenhum dado de demonstração é usado no aplicativo.

## Migrations locais

- `20261104030000_instructor_plan_workflow.sql`: leitura de fichas ativas e arquivadas de alunos vinculados e ativação atômica com RLS do chamador.
- `20261104040000_instructor_activation_conflict.sql`: identifica explicitamente o conflito com ficha ativa de outro professor.
- `20261104050000_instructor_draft_editor.sql`: imutabilidade de fichas ativas e arquivadas, remoção e ordenação restritas a rascunhos do autor.

As quatro migrations anteriores foram preservadas. No banco local, as sete migrations estão aplicadas e há 31 políticas RLS efetivas. Não houve execução no banco remoto.

## Segurança

As Server Actions validam sessão, papel ativo, vínculo professor-aluno, autoria e estado da ficha. O aplicativo usa o cliente SSR sob RLS; a chave de serviço aparece apenas nos scripts de teste local para criar e limpar fixtures. Os testes verificam que aluno não acessa `/professor`, professor não cria ficha para aluno não vinculado, professores não leem nem modificam alunos de outro vínculo, e fichas ativas/arquivadas não admitem edição indevida. A visualização histórica de aluno vinculado não concede edição da ficha de outro autor.

## Testes em 4 de novembro de 2026

- `npm run lint`: aprovado, sem erros de ESLint.
- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado com Supabase local e diretório de build isolado `.next-instructor-test`.
- `npm run test:db-schema`: aprovado; sete migrations e cinco suítes pgTAP encontradas.
- `supabase test db --local`: **77 aprovados, 0 reprovados**.
- `node scripts/test-instructor-local.mjs`: fluxo completo aprovado, com quatro contas fictícias locais e limpeza final. Abrange criação, edição, ordenação, remoção, ativação, troca transacional, treino em andamento, conclusão, medidas, consulta pelo professor e isolamento entre contas.
- `node scripts/test-student-local.mjs`: regressão do painel do aluno aprovada.
- `node scripts/test-auth-local.mjs`: 17 verificações de autenticação aprovadas.
- Chrome headless: seis rotas do professor em **390 × 844**, **768 × 1024** e **1440 × 900**, mais dashboard e detalhe depois do treino concluído nos mesmos tamanhos; nenhuma rolagem horizontal de página. As capturas foram inspecionadas visualmente.

Capturas: `evidence/mission-07-final-dashboard-390.png`, `evidence/mission-07-final-dashboard-768.png`, `evidence/mission-07-final-dashboard-1440.png`, `evidence/mission-07-final-detail-390.png` e `evidence/mission-07-detail-390.png` (editor de rascunho).

## Pendências e homologação

- Revisar as três migrations incrementais e executar a homologação em um ambiente remoto de testes autorizado antes de produção. Não foram aplicadas remotamente.
- O fluxo de criação de vínculos professor-aluno continua sob administração existente; o professor não pode atribuir alunos a si mesmo.
- Listas de atividade e histórico recentes usam limite de 200 sessões, e o catálogo carrega até 500 exercícios. Se a academia ultrapassar esses volumes, adicionar paginação ou consultas agregadas para manter todos os resultados disponíveis e o último treino por aluno exato.
- A troca de ficha ativa de outro professor exige um fluxo administrativo explícito; a ativação pelo professor atual é bloqueada.

Nenhum deploy foi realizado. Para executar localmente, iniciar o Supabase local, configurar as variáveis públicas para essa instância e usar `npm run dev`.
