# Missão 09 — Homologação local do banco e preparação para publicação

**Data:** 4 de novembro de 2026. **Escopo:** instalação limpa e validação exclusivamente local. Nenhum Supabase remoto foi consultado ou modificado; não houve deploy.

## 1. Instalação limpa

Foi criada uma segunda pilha Supabase descartável, com identificador `NACM09Clean`, separada da pilha local `NAC`. A configuração e as migrations foram copiadas para uma pasta temporária no workspace, com `project_id` próprio. A pilha NAC original permaneceu parada e seus dados não foram apagados. A nova pilha iniciou sem usuários ou dados de aplicação e aplicou as 13 migrations existentes, seguidas da migration nova da Missão 09, em ordem. O arquivo `supabase/seed.sql`, referenciado pela configuração mas ausente no projeto, foi adicionado vazio para garantir uma instalação reproduzível sem dados fictícios.

| Item verificado na pilha limpa | Resultado |
| --- | ---: |
| Migrations aplicadas | 14 de 14 |
| Tabelas do domínio | 10 |
| Chaves estrangeiras | 16 |
| Índices | 30 |
| Triggers não internos | 20 |
| Funções em `public` e `nac_private` | 38 |
| Tabelas do domínio com RLS ativa | 10 de 10 |
| Políticas RLS efetivas | 31 |
| Usuários e registros de aplicação antes dos testes | 0 |
| Usuários, perfis, vínculos, fichas, sessões, exercícios, métricas e eventos após os testes | 0 |

`supabase db lint --schema public,nac_private --fail-on error` não encontrou erros de esquema. O procedimento de instalação foi **`supabase start` em projeto novo**, que aplicou as migrations do zero. Não foi usado `db reset` no banco NAC existente. A configuração declara PostgreSQL 17; a versão do futuro projeto remoto deverá ser conferida antes da homologação.

Evidências locais: [inventário após instalação e limpeza](evidence/mission-09-clean-inventory.log) e [saída completa do pgTAP](evidence/mission-09-pgtap.log).

## 2. Segurança dos três perfis

As sete suítes pgTAP passaram na pilha limpa: **125 testes aprovados, 0 reprovados**. Destes, 112 pertencem às suítes das missões anteriores; 13 verificam o provisionamento do primeiro administrador. Os testes executam com papéis autenticados onde a autorização depende de RLS e fazem `ROLLBACK` dos fixtures. A execução funcional adicional autenticou contas fictícias pelo Supabase Auth real.

- **Aluno:** isolamento de dados, bloqueio das áreas de professor e administração, impedimento de alteração de papel ou ficha, bloqueio após inativação e leitura do próprio histórico após arquivamento.
- **Professor:** vínculo ativo obrigatório, isolamento entre professores, ativação atômica, imutabilidade de fichas ativas/arquivadas e perda de acesso após encerramento do vínculo.
- **Administrador:** operações autorizadas de conta, vínculo e catálogo; bloqueio de autopromoção e de auditoria falsa; sem leitura ampla de medidas físicas ou séries individuais.
- **Integridade:** sessão e série mantêm referências corretas, o treino em andamento sobrevive à troca de ficha e o histórico persiste após inativação e retirada do vínculo.

As regressões `test-auth-local.mjs` (**17 verificações**), `test-student-local.mjs`, `test-instructor-local.mjs` e `test-admin-local.mjs` passaram no banco instalado do zero. A interface permaneceu responsiva em 390 × 844, 768 × 1024 e 1440 × 900 nos fluxos automatizados. Os testes removeram seus usuários e registros fictícios.

## 3. Primeiro administrador

A migration `20261104120000_first_admin_bootstrap.sql` criou `nac_private.bootstrap_first_admin(...)`, fora dos esquemas expostos pela Data API. `anon`, `authenticated` e `service_role` não têm acesso ao esquema nem permissão para executar a função. A função é `SECURITY INVOKER` e exige uma conexão PostgreSQL confiável como `postgres`. Ela verifica, sob bloqueio transacional:

1. Nenhum administrador existente, inclusive inativo.
2. Conta com e-mail confirmado no Supabase Auth e perfil `student` ativo com UUID e e-mail esperados.
3. Ausência de vínculos, fichas, sessões, medidas ou exercícios associados à conta.
4. Frase explícita de confirmação e referência operacional sem segredo, de 8 a 120 caracteres.

Quando aprovada, a função atribui `admin` e grava `admin.bootstrap` na auditoria, com UUID alvo, data e `operator_reference`. O `actor_id` é nulo porque o primeiro administrador é criado por uma conexão técnica, não por um usuário autenticado do aplicativo. A referência operacional deve identificar o responsável ou ticket na trilha externa de mudanças. Uma segunda execução é recusada. Os 13 testes pgTAP cobrem permissões, e-mail não confirmado, parâmetros incorretos, histórico preexistente, sucesso, auditoria e duplicidade. O cadastro público continua criando apenas alunos.

### Procedimento controlado para um projeto autorizado

1. Obter **autorização explícita para o projeto remoto específico** e registrar operador/ticket. Confirmar que o projeto é de homologação separado, que as migrations foram revisadas e aplicadas e que existe backup recuperável.
2. Cadastrar a pessoa pelo fluxo normal e confirmar o e-mail. Verificar a identidade fora do aplicativo. Não criar senha fixa em código ou em SQL.
3. Em conexão PostgreSQL confiável como `postgres`, conferir o UUID e o estado:

```sql
select u.id, u.email, u.email_confirmed_at, p.role, p.status
from auth.users u join public.profiles p on p.id = u.id
where lower(u.email) = lower('EMAIL_CONFIRMADO_DO_OPERADOR');

select id from public.profiles where role = 'admin';
```

4. Somente após revisar os resultados, executar em uma transação com valores reais conferidos:

```sql
begin;
select nac_private.bootstrap_first_admin(
  'UUID_CONFERIDO'::uuid,
  'EMAIL_CONFIRMADO_DO_OPERADOR',
  'TICKET-OU-OPERADOR-SEM-SEGREDOS',
  'PROVISIONAR PRIMEIRO ADMIN NAC'
);
select action, entity_id, operator_reference, created_at
from public.audit_events
where action = 'admin.bootstrap' and entity_id = 'UUID_CONFERIDO'::uuid;
commit;
```

Uma falha cancela a transação; verificar o estado antes de repetir. Não executar o procedimento no remoto sem nova autorização explícita. O aplicativo não contém botão, rota pública, chave privilegiada ou credencial fixa para criar administradores.

## 4. Supabase remoto de homologação

**Estado: preparado em código e documentação; não executado.** Não foi identificado nem autorizado um projeto remoto de testes separado. A presença de uma URL remota em `.env.local` não equivale a autorização para consultá-la ou alterá-la.

Antes da homologação remota, confirmar:

- Identificador do projeto de testes, isolamento de produção e versão PostgreSQL compatível. Comparar o histórico de migrations e o esquema existente antes de qualquer aplicação; não usar `db reset` remoto.
- Cópia recuperável anterior à mudança e ensaio de restauração em projeto separado. Verificar modalidade e retenção de backup do plano; backups de banco não incluem os objetos do Storage API. [Documentação oficial de backups do Supabase](https://supabase.com/docs/guides/platform/backups).
- Chave publishable separada da chave secreta, controle de acesso às credenciais e **rotação da chave secreta anteriormente compartilhada fora de um cofre** antes do uso real. Nenhuma chave secreta deve entrar em `NEXT_PUBLIC_*`, navegador ou repositório.
- Supabase Auth com confirmação de e-mail, SMTP funcional, remetente, limites de envio e recuperação de senha testados. Configurar Site URL HTTPS e allowlist exata para `https://DOMINIO-DE-HOMOLOGACAO/auth/confirm?destino=aluno` e `...?destino=redefinir-senha`. Conferir templates que usem `{{ .RedirectTo }}` quando o redirecionamento é definido pelo aplicativo. [Redirect URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
- Executar novamente pgTAP e testes funcionais no projeto de **testes autorizado**, usando somente dados fictícios e credenciais segregadas. Verificar RLS com usuários autenticados, sem tomar uma consulta privilegiada no SQL Editor como prova de isolamento.

## 5. Preparação para Vercel

`npm run lint`, `npx tsc --noEmit` e `npm run build` passaram com a pilha limpa. O build incluiu as rotas protegidas dos três painéis. `getSupabaseEnv()` agora aceita apenas a URL raiz do Supabase e chave `sb_publishable_…`, recusando `/rest/v1`, chave `sb_secret_…`, HTTP remoto e ativação remota sem origem HTTPS exata. `npm run test:deployment-config` passou em **9 cenários**. O middleware renova sessão nas rotas privadas; os layouts e Server Actions verificam perfil ativo e papel no servidor; o banco aplica RLS. A busca por chaves privilegiadas em `src/` e `public/` não encontrou uso.

Para um futuro ambiente Preview de homologação, configurar separadamente:

| Variável | Preview autorizado | Production futura |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origem raiz HTTPS do Supabase de testes | Origem raiz HTTPS de produção |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable do projeto de testes | Chave publishable de produção |
| `NEXT_PUBLIC_SITE_URL` | Origem HTTPS exata do site de homologação | Origem HTTPS oficial |
| `NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH` | `true` **após** validar Auth, RLS e callbacks | `true` somente com autorização de publicação |

Variáveis de Preview e Production devem ser segregadas no projeto Vercel; uma mudança nas variáveis exige novo build/deploy para ter efeito. [Variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables). Nenhuma variável, domínio ou deploy da Vercel foi configurado nesta missão. Validar a aplicação em Preview protegido antes de qualquer publicação.

## 6. Problemas corrigidos, riscos e próxima etapa

- A configuração referenciava `supabase/seed.sql`, mas o arquivo não existia. Foi criado sem dados.
- Não havia provisionamento controlado do primeiro administrador. Foi adicionada a função privada transacional, auditoria e testes.
- A validação de configuração aceitava caminhos como `/rest/v1` e não recusava explicitamente `sb_secret_…` no campo público. Foi endurecida e coberta por nove testes.
- O README e `.env.example` estavam desatualizados; agora descrevem três painéis, variáveis e limites de ativação remota.

**Pendências:** homologação remota em projeto de testes explicitamente autorizado; conferência de backup e restauração, SMTP, URLs do Auth, versão PostgreSQL, variáveis Preview, chave secreta rotacionada e testes com volume representativo. A validação local não prova configuração, desempenho ou segurança de um projeto remoto ainda não identificado. A próxima etapa técnica recomendada é uma homologação remota controlada; publicação permanece separada e exige autorização própria.
