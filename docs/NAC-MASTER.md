# Missão Master — relatório de execução

Data: 04/11/2026. **Status: validação local aprovada nos testes executados; homologação remota e publicação não concluídas.** Nenhuma migration, dado, conta, configuração Auth, backup ou deploy foi executado remotamente nesta etapa.

O projeto original foi preservado na branch local `mission-master-validation`, a partir de `a62c45f`, já publicado anteriormente no GitHub. As alterações desta missão não foram enviadas ao GitHub. Durante a execução apareceram alterações concorrentes em login, AuthFrame, CSS e Tailwind; foram preservadas e não são atribuídas à auditoria. Os testes finais usam o workspace disponível, incluindo essas alterações.

## 1. Auditoria e classificação

| Área | Estado comprovado | Limite / próximo passo |
|---|---|---|
| Arquitetura | Next.js 15.5.29, React 19, TS e Tailwind preservados; Server Components e Server Actions por papel | Não houve troca de stack |
| Supabase remoto | Metadados principais exportados por SELECT: tabelas, colunas, constraints, índices, triggers, funções, políticas, grants e enums | Complemento de schema grants, column grants, default ACL e dependências pendente por indisponibilidade do navegador |
| Banco local | 15 migrations; 10 tabelas RLS; 31 políticas; 30 índices; 20 triggers públicos e 1 Auth; 38 funções | Não equivale a aplicação remota |
| Reconciliação | SQL incremental ensaiado sobre reconstrução local das definições remotas | Revalidar catálogo completo, backup e autorização antes de uso remoto |
| Autenticação | Cadastro, confirmação, login/logout, recuperação/redefinição, sessão SSR, expiração e papéis passaram localmente | SMTP real, HTTPS remoto, entrega externa e configuração Auth não homologados |
| Aluno | Ficha, início, séries/cargas, conclusão, histórico, medidas e isolamento passaram | Interação visual/touch no navegador pendente |
| Professor | Vínculos, editor, ativação, histórico, evolução e isolamento passaram | Maior volume de professores/alunos ainda precisa benchmark representativo |
| Administração | Habilitação de professor, vínculos, catálogo, indicadores, inativação e auditoria passaram | Administrador real não provisionado |
| Segurança | Falha do helper de auditoria corrigida localmente e comprovada por regressão | Mesmo grant perigoso consta no inventário remoto; não aplicado patch remoto |
| Dependências | Zero avisos em `npm audit --omit=dev` | 14 avisos moderados nas ferramentas de desenvolvimento, originados em minimatch |
| Responsividade | Paginação compartilhada com wrap e 20 cards por página; código tipado e build aprovado | Não houve aprovação visual desta versão: navegador desativado |
| Backup / Vercel | Plano operacional preparado | Nenhum backup recuperável nem projeto Vercel verificado/configurado nesta etapa |

Guardas privados verificam usuário confirmado, perfil ativo e papel no servidor. Server Actions verificam papel, identificadores e vínculo; RLS permanece em vigor no cliente de sessão. Não foi introduzida chave de serviço no aplicativo. `nac_private` é inacessível às três roles de API no inventário local. Os triggers/funções SECURITY DEFINER usam search_path explícito; o direito CREATE no schema public está negado às roles API localmente. Essa última verificação ainda deve ser feita no remoto.

## 2. Comparação do banco

Matriz completa das categorias exportadas: [MASTER-BANCO.md](MASTER-BANCO.md). Definições exatas e diferenças por campo: `supabase/audit/catalog-diff.json`.

| Categoria | Idênticos | Diferentes | Ausentes no remoto |
|---|---:|---:|---:|
| Colunas | 96 | 0 | 1 |
| Constraints | 71 | 0 | 1 |
| Índices | 28 | 0 | 2 |
| Triggers, incluindo Auth | 17 | 0 | 4 |
| Funções | 17 | 6 | 15 |
| Políticas RLS | 18 | 11 | 2 |
| Grants de tabela por role | 18 | 2 | 0 |
| EXECUTE por função e role | 57 | 12 | 45 |
| Tabelas/RLS/owner | 10 | 0 | 0 |
| Valores de enums | 13 | 0 | 0 |

As seis funções diferentes são `admin_assign_role`, `admin_set_profile_status`, `can_view_workout_plan`, `owns_open_workout_session`, `protect_workout_plan_ownership` e `validate_workout_session`. As divergências de políticas incluem bloqueio de inativos, acesso histórico e privacidade das séries. As duas políticas ausentes são as exclusões autorizadas de divisões/prescrições em rascunho. Não se enfraqueceu política para obter aprovação de teste.

A coluna ausente é `audit_events.operator_reference`, com sua constraint. Índices e triggers ausentes e todas as definições estão identificados individualmente na matriz. O remoto não tem histórico de migrations; presença de objetos não é registro de aplicação de arquivos.

## 3. Vulnerabilidade de auditoria

`write_audit_event(text,text,uuid)` era SECURITY DEFINER, inseria eventos sem validar chamador e mantinha grants explícitos para anon/authenticated/service_role. O `REVOKE FROM PUBLIC` da migration inicial não removia esses grants independentes do Supabase.

Reprodução efetiva **somente local**: `SET LOCAL ROLE anon` conseguiu fabricar um evento com UUID fictício; a transação foi revertida. A primeira tentativa com UUID nulo falhou por NOT NULL, portanto foi corrigido o dado da reprodução, sem alterar o banco. O teste definitivo usou UUID válido. As definições e permissões remotas exportadas mostram a mesma exposição, mas não foi feita exploração remota.

Correção: migration `20261104130000_internal_audit_privileges.sql`, revogando acesso direto ao helper e às quatro funções internas de trigger de auditoria. Triggers confiáveis continuam escrevendo como proprietário; a role real do ator é mantida. Não houve mudança nas 31 políticas RLS.

Evidências:

- `master-audit-rpc-before.log`: inserção falsa local, contagem 1, rollback.
- `master-audit-regression-before.log`: 7 de 9 testes novos falham antes do patch; anônimo, aluno, admin e service_role conseguiam chamada direta.
- `master-reconciled-nac_audit_privileges_test.log`: 9 de 9 após patch, inclusive evento legítimo com ator correto.
- `master-pgtap-after.log`: suíte completa oficial local, 134/134.

## 4. Correções de aplicação e ferramentas

- Histórico do aluno agora filtra no banco antes da paginação, com contagem exata e páginas de 20 sessões; registros anteriores ao limite de 200 continuam acessíveis.
- Leituras de séries avançam por páginas reais, inclusive quando o gateway impõe limite menor. Lotes de IDs evitam URLs excessivas. A leitura pesada de séries usa até 1.000 linhas por requisição, mantendo a continuidade até a página vazia.
- Medidas, catálogo, fichas e vínculos não são silenciosamente truncados pelos antigos limites de 100/500/1.000. Listagens extensas renderizam 20 cards por página. Catálogo filtra visibilidade antes de paginar a leitura.
- Resumo do professor mantém o último treino de cada aluno e as cinco atividades globais mais recentes; um aluno não é classificado como sem atividade só porque outro ocupou as 200 linhas recentes.
- Componente Pagination compartilhado entre painéis, com preservação dos filtros e layout que quebra linha em telas estreitas.
- Recuperação de senha não retorna sucesso quando o provedor falha; mensagens genéricas não expõem detalhes internos. Falha de rede também retorna estado de erro.
- Ferramentas de teste validam a URL completa; `127.0.0.1:porta@outro-host`, caminhos, credenciais na URL e destinos remotos são rejeitados.
- PostCSS 8.4.31 transitivo do Next foi substituído por 8.5.32 usando override dentro da mesma versão principal. Next 15 foi preservado; não foi usado `npm audit fix --force`.
- O harness aceita `NAC_SKIP_BROWSER_CHECK=1` com mensagem **SKIP RESPONSIVE**, sem emitir aprovação visual. Isso permitiu continuar os testes HTTP/banco sem contornar o bloqueio do navegador.

## 5. Testes efetivamente executados

| Teste | Resultado / evidência |
|---|---|
| CLI Supabase `test db --local` | 8 suítes, **134 aprovados, 0 reprovados**; `master-pgtap-after.log` |
| Reconciliação em `nac_master_remote_v2` | Reconstrução igual às dez categorias remotas → candidato incremental → igualdade final → **134 aprovados**; `master-reconciliation-run.log` |
| Instalação limpa em `nac_master_clean` | **15 migrations**, zero diferença nas categorias comparadas, **134 aprovados**; `master-clean-run.log` |
| Auth local | Fluxo PKCE e callbacks Next, recuperação, papéis, inativos e limpeza; `master-auth.log` |
| Aluno local | Fluxo completo e regressão de volume; `master-student.log` |
| Professor local | Edição, ativação, substituição transacional, isolamento e encerramento de vínculo; `master-instructor.log` |
| Admin local | Operações autorizadas, bloqueios, privacidade e histórico; `master-admin.log` |
| Volume | 206 sessões, 2.400 séries adicionais e 121 medidas; página antiga acessível, 1.200 séries contadas integralmente numa página e filtro aplicado antes de paginar |
| Paginação unitária | 1.205 registros com gateway limitado a 73 linhas, erro de provedor, vazio, página inválida e lote de 1.000; `scripts/test-pagination.mjs` |
| Regressões unitárias | Alvos de teste enganosos/remotos rejeitados; recuperação indisponível/erro/rede/sucesso genérico; `scripts/test-master-regressions.mjs` |
| Lint / TypeScript / build | Aprovados; build de produção com variáveis locais, Auth remoto false; `master-build.log` |
| Esquema e configuração | Verificador de 15 migrations/8 suítes e 9 cenários de configuração aprovados |
| npm audit | Produção: 0. Árvore completa: 14 moderadas de ferramentas; arquivos `master-npm-audit-*.json` |

Os testes funcionais são HTTP + Server Actions + Supabase Auth/Data API locais, com contas `example.test`. **Não são testes de interação em navegador** quando o skip está ligado. Fixtures foram removidas pelos próprios testes. Os ensaios PostgreSQL foram preservados para inspeção; não houve reset ou exclusão de bancos.

O inventário final do banco local principal encontrou 37 usuários/perfis e 199 eventos, com zero fichas, vínculos, sessões, séries, exercícios e medidas. Não foi capturada uma contagem inicial desta retomada para atribuir a origem desses usuários/eventos. A limpeza dos scripts é restrita aos IDs que eles criaram; registros restantes não foram apagados por suposição. Consulte `master-local-final-inventory.log`. Os bancos novos de ensaio partiram de esquema sem dados de usuários, e seus testes foram transacionais.

Os 134 testes foram executados em três contextos locais; isso não representa 402 cenários diferentes. Há 134 asserções distintas de banco, repetidas para validar os caminhos de instalação/upgrade.

## 6. Desempenho medido

Build: 103 kB de JavaScript inicial compartilhado, páginas entre aproximadamente 103 e 115 kB, middleware 94,1 kB. Isso mede artefatos, não velocidade em celular.

Medição HTTP local em build de produção, dez amostras sequenciais após uma de aquecimento por rota. Fixture: 206 sessões, 2.402 séries totais e 121 medidas. Não é teste de carga, infraestrutura remota, rede móvel ou Web Vitals.

| Rota | p50 antes (ms) | p95 antes (ms) | p50 depois (ms) | p95 depois (ms) |
|---|---:|---:|---:|---:|
| `/aluno` | 121,80 | 160,18 | 277,98 | 427,37 |
| `/aluno/historico?pagina=2` | 1.163,68 | 1.813,59 | 627,63 | 749,16 |
| `/aluno/evolucao` | 134,82 | 175,48 | 129,11 | 159,07 |

Mudança entre as medições: leitura das séries passou de lotes de 250 para até 1.000, reduzindo de seis para três requisições numa leitura de 1.200 linhas, incluindo a consulta final vazia. A resposta do histórico permaneceu com 114.080 bytes. O dashboard variou para cima sem alteração no seu código nessa comparação; máquina compartilhada e apenas dez amostras impedem atribuir toda variação ao código. Não há promessa de ganho remoto. Dados brutos em `master-local-performance-before.json` e `master-local-performance.json`.

Limitações: alguns resumos/gráficos ainda leem todo o conjunto autorizado em lotes e calculam no servidor; volume muito maior merece agregados SQL com RLS e benchmark próprio. Isso evita omissão de dados, mas não comprova escalabilidade ilimitada. O gráfico de medidas pode crescer; validar em navegador com histórico longo antes de publicação.

## 7. Responsividade e experiência

Esta execução não obteve capturas novas nem aprovou as resoluções 320/360/390/414/768/1024/1440. O navegador retornou “Local browser use is disabled in Work settings”. O usuário informou que vai reativá-lo; aguardamos a confirmação de disponibilidade.

Depois: testar página inicial, login, cadastro e os três painéis com fixtures locais; conferir ausência de overflow, foco/teclado, mostrar senha, estados de envio/erro, redimensionamento, navegação, sessão expirada e formulários. Capturas anteriores em `docs/evidence` são históricas e não comprovam o layout alterado nesta versão. Persistência de valores não enviados após erros de formulário ainda exige inspeção interativa; nenhuma aprovação por presunção.

## 8. Pendências e decisão

**Não recomendar produção agora.** Faltam inventário complementar remoto, backup recuperável com destino aprovado, patch/reconciliação autorizados, rotação da chave secreta exposta, SMTP/URLs HTTPS, fixtures e fluxos remotos autorizados, primeiro administrador autorizado, testes visuais e Preview protegido.

A documentação atual da Vercel limita Hobby a uso pessoal não comercial; o uso operacional da NAC precisa resolver elegibilidade/plano sem contratar serviço por iniciativa do agente. A conexão Vercel e o navegador ficaram indisponíveis; não foi comprovado se já existe um projeto NAC remoto. Não criar duplicata por suposição.

Plano detalhado, comandos de backup propostos, recuperação, limites do candidato, Auth e Vercel: [MASTER-OPERACOES.md](MASTER-OPERACOES.md). Não solicitar aplicação remota do candidato antes de satisfazer essas pré-condições. A próxima ação de leitura continua autorizada assim que o navegador estiver disponível; backup e escrita permanecem sujeitos a aprovação própria.

## 9. Reprodução local

```bash
npm run lint
npx tsc --noEmit
npm run test:db-schema
npm run test:deployment-config
node scripts/test-pagination.mjs
node scripts/test-master-regressions.mjs
npx supabase test db --local
node scripts/run-master-local.mjs
```

O runner usa o CLI Supabase já instalado (ou `SUPABASE_CLI_PATH`), lê exclusivamente o status local, mantém chaves em memória, usa porta 3003 e `.next-master-test`, faz build e encerra apenas seu processo Next ao terminar. Não modifica `.env.local`. O modo atual pula explicitamente a parte visual; a ativação dos testes visuais exige ambiente com navegador disponível e fluxo autorizado.

`scripts/test-reconciliation-local.mjs` e `scripts/test-clean-local.mjs` recusam bases de ensaio já existentes; não apagam nem resetam automaticamente. Para desenvolvimento normal: `npm run dev`; usar o endereço informado pelo Next, normalmente `http://localhost:3000`.

## Referências de segurança

- [Next.js — advisory de novembro de 2026](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2): conferir o intervalo afetado junto à versão instalada, além de npm audit.
- [PostCSS — advisory de source maps](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp): cadeia de produção corrigida dentro da versão principal.
- [Minimatch — advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249): avisos restantes são da cadeia de lint; não foi forçada atualização major incompatível para apenas zerar o relatório.
- [Vercel — termos do Hobby](https://vercel.com/docs/plans/hobby).
