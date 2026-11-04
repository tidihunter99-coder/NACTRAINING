# Banco de dados — NAC TRAINING

## Status

As três migrations foram aplicadas à pilha Supabase local isolada para os testes. O histórico remoto de migrations e policies não foi verificado por acesso administrativo. Há uma URL e uma chave pública em `.env.local`; nenhuma chave secreta é armazenada no repositório ou no código do navegador.

Migration: `supabase/migrations/20261103210000_nac_training_schema.sql`

Correção de segurança: `supabase/migrations/20261103220000_security_hardening.sql`. Ela foi aplicada após a migration base somente na pilha local de teste. O usuário relatou aplicação remota, mas isso ainda não foi conferido por esta validação.

Bloqueio de perfis inativos: `supabase/migrations/20261104010000_inactive_profile_access.sql`. Aplicada **somente no banco local** após a reprodução de acessos diretos indevidos com uma sessão antiga. Veja `docs/NAC-MISSAO-05.md` para o relatório e a homologação.

## Modelo de dados

| Tabela | Finalidade |
| --- | --- |
| `profiles` | Perfil único ligado a `auth.users`, com papel e status. |
| `student_instructors` | Vínculo ativo entre aluno e professor, sem duplicidade. |
| `exercises` | Biblioteca da academia e exercícios de professores. |
| `workout_plans` | Fichas atribuídas a um aluno por um professor vinculado. |
| `workout_days` | Divisões configuráveis de uma ficha. |
| `workout_exercises` | Prescrição por divisão, sem misturar com a carga realizada. |
| `workout_sessions` | Execução histórica de uma divisão por um aluno. |
| `workout_set_logs` | Séries efetivamente registradas durante uma sessão. |
| `body_metrics` | Medidas do aluno, tratadas como dado pessoal sensível. |
| `audit_events` | Eventos administrativos sem senhas, tokens ou medidas. |

O histórico usa referências com `on delete restrict`: arquivar uma ficha não apaga sessões nem séries. A ficha ativa é única por aluno por meio de um índice parcial.

## Segurança e RLS

Todos os dados privados têm RLS habilitado. Funções auxiliares `SECURITY DEFINER` usam `search_path` fixo e só recebem `EXECUTE` quando necessário.

- Alunos leem apenas o próprio perfil, fichas ativas, sessões, séries e medidas.
- Professores acessam somente alunos com vínculo ativo; podem prescrever em fichas em rascunho desses alunos.
- Alunos não recebem permissão para alterar fichas, vínculos ou papéis.
- Papéis e status não possuem permissão de coluna para atualizações comuns. As RPCs administrativas auditadas são `admin_assign_role` e `admin_set_profile_status`.
- `body_metrics` não concede acesso irrestrito sequer a administradores. Apenas o aluno e professor ativamente vinculado possuem política de leitura.
- Exercícios globais, próprios do professor e prescritos ao aluno são diferenciados por RLS e por `visibility`.
- Perfis inativos podem ler somente o próprio status de perfil; não podem ler ou escrever dados de treino, vínculo ou evolução pela API.

O trigger de `auth.users` cria todo perfil novo como `student`; ele ignora qualquer tentativa de enviar papel em `user_metadata`.

## Como aplicar em ambiente autorizado

1. Confirme a identidade de um projeto Supabase **exclusivo para homologação do NAC TRAINING**, separado da produção. A existência desse ambiente ainda não foi confirmada.
2. Configure somente as variáveis públicas em `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

3. Revise as três migrations com um administrador técnico da academia e compare o histórico, triggers, RLS e policies do destino.
4. Somente após autorização específica para um projeto de homologação verificado, vincule o destino e aplique as migrations pendentes conforme o plano aprovado:

   ```bash
   npx supabase@latest link --project-ref <ref-de-homologacao-confirmado>
   npx supabase@latest db push
   ```

Nunca coloque `service_role` em `.env.local` exposto ao navegador. Não execute esses comandos contra o endpoint atualmente configurado sem confirmar sua finalidade e obter autorização específica. Não aplique migrations em produção antes de validar as políticas em homologação.

## Primeiro administrador

Não existe promoção automática do primeiro usuário. O procedimento a seguir é **somente um modelo para revisão**, nunca para execução nesta missão. Exige autorização explícita, titular identificado, e-mail Auth confirmado, perfil ativo e ausência de outro administrador. Deve ser executado apenas por operador privilegiado, com registro externo de identidade, data e justificativa:

```sql
begin;
do $$
declare
  target_id uuid := '<uuid-do-titular-autorizado>';
  changed_count integer;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Administrator already exists';
  end if;
  if not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = target_id and u.email_confirmed_at is not null
      and p.role = 'student' and p.status = 'active'
  ) then
    raise exception 'Confirmed active Auth identity not found';
  end if;
  update public.profiles set role = 'admin'
  where id = target_id and role = 'student' and status = 'active';
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then raise exception 'Unexpected profile update count'; end if;
  insert into public.audit_events (actor_id, action, entity_type, entity_id)
  values (null, 'bootstrap.first_admin', 'profiles', target_id);
end $$;
commit;
```

O trigger também registra `profile.role_changed`; o evento `bootstrap.first_admin` identifica a concessão excepcional. Promoções posteriores devem usar a RPC auditada `admin_assign_role` por um administrador autenticado. Nenhum administrador real foi criado nesta missão.

## Testes

O teste estático local é executável sem banco:

```bash
npm run test:db-schema
```

A suíte original `supabase/tests/nac_rls_test.sql` cria cinco identidades fictícias apenas na transação local e faz rollback no final. A suíte adicional `supabase/tests/nac_inactive_rls_test.sql` cobre perfis inativos. Após as três migrations locais, ambas passaram com **38/38** testes, incluindo os 22 originais.

Em um ambiente isolado, inicialize somente a pilha local e rode:

```bash
supabase start
supabase test db
```

Não execute `supabase db reset` em um banco remoto ou em um ambiente local com dados que precisem ser preservados. A documentação oficial do Supabase recomenda executar testes pgTAP com `authenticated` e `request.jwt.claim.sub` para verificar RLS como um usuário real, não como administrador.

## Tipos TypeScript

`src/types/database.ts` é um espelho manual da migration e declara isso explicitamente. Após aplicar o banco autorizado, gere a versão canônica:

```bash
npx supabase@latest gen types typescript --linked --schema public > src/types/database.generated.ts
```

Revise e substitua o espelho manual somente após comparar o arquivo gerado com a migration aplicada.
