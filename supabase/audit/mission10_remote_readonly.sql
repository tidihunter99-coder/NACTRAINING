-- NAC TRAINING / Missão 10: inventário somente de leitura.
-- Execute apenas no projeto NAC autorizado, após verificar o project ref no painel.
-- A transação READ ONLY impede escrita acidental. Não é um teste de RLS:
-- o SQL Editor costuma usar papel privilegiado, distinto de aluno/professor.
begin transaction read only;

-- Identidade e compatibilidade do servidor.
select current_database() as database_name,
       current_user as connected_role,
       current_setting('server_version') as server_version;

select extname, extversion
from pg_extension
where extname in ('pgcrypto', 'pgtap')
order by extname;

-- Todas as tabelas públicas, inclusive possíveis tabelas anteriores ao NAC.
-- reltuples é estimativa, não contagem exata.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- Presença das dez tabelas locais e da tabela de histórico de migrations.
select name, to_regclass(name) is not null as exists_remotely
from unnest(array[
  'public.profiles',
  'public.student_instructors',
  'public.exercises',
  'public.workout_plans',
  'public.workout_days',
  'public.workout_exercises',
  'public.workout_sessions',
  'public.workout_set_logs',
  'public.body_metrics',
  'public.audit_events',
  'supabase_migrations.schema_migrations'
]) as names(name)
order by name;

-- Colunas, tipos e nulidade para comparação com as 14 migrations locais.
select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- FKs, checks, unicidade e chaves primárias.
select c.conrelid::regclass::text as table_name, c.conname as constraint_name,
       c.contype as constraint_type, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public'
order by table_name, constraint_name;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by table_name, trigger_name;

-- Políticas RLS reais, não apenas sua contagem.
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Grants efetivos para os papéis da Data API.
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

-- Funções públicas/privadas e modo de execução; sem executar nenhuma função.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'nac_private')
order by schema_name, function_name, arguments;

-- Este SELECT só deve ser usado após confirmar acima que o histórico existe.
-- select version from supabase_migrations.schema_migrations order by version;

-- Presença de dados sem ler linhas pessoais. Executar somente depois de
-- confirmar que as dez tabelas existem; manter comentado no inventário inicial.
-- select 'profiles' as table_name, exists(select 1 from public.profiles) as has_rows
-- union all select 'student_instructors', exists(select 1 from public.student_instructors)
-- union all select 'exercises', exists(select 1 from public.exercises)
-- union all select 'workout_plans', exists(select 1 from public.workout_plans)
-- union all select 'workout_days', exists(select 1 from public.workout_days)
-- union all select 'workout_exercises', exists(select 1 from public.workout_exercises)
-- union all select 'workout_sessions', exists(select 1 from public.workout_sessions)
-- union all select 'workout_set_logs', exists(select 1 from public.workout_set_logs)
-- union all select 'body_metrics', exists(select 1 from public.body_metrics)
-- union all select 'audit_events', exists(select 1 from public.audit_events)
-- union all select 'auth.users', exists(select 1 from auth.users);

rollback;
