-- Mission 09: trusted, one-time first-admin provision. Fully transactional.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users(id, email, email_confirmed_at) values
  ('f0000000-0000-0000-0000-000000000001', 'bootstrap-unconfirmed@nac.test', null),
  ('f0000000-0000-0000-0000-000000000002', 'bootstrap-confirmed@nac.test', now());

select results_eq($$select has_schema_privilege('authenticated', 'nac_private', 'USAGE')$$, array[false], 'Authenticated API role has no private-schema access');
select results_eq($$select has_function_privilege('authenticated', 'nac_private.bootstrap_first_admin(uuid,text,text,text)', 'EXECUTE')$$, array[false], 'Authenticated API role cannot execute bootstrap');
select results_eq($$select has_function_privilege('anon', 'nac_private.bootstrap_first_admin(uuid,text,text,text)', 'EXECUTE')$$, array[false], 'Anonymous API role cannot execute bootstrap');
select results_eq($$select has_function_privilege('service_role', 'nac_private.bootstrap_first_admin(uuid,text,text,text)', 'EXECUTE')$$, array[false], 'Service API role cannot execute bootstrap');
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000001', 'bootstrap-unconfirmed@nac.test', 'M09-LOCAL-TEST', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'P0001', null, 'Unconfirmed account cannot become first admin');
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000002', 'bootstrap-confirmed@nac.test', 'M09-LOCAL-TEST', 'wrong')$$, 'P0001', null, 'Explicit confirmation phrase is required');
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000002', 'bootstrap-confirmed@nac.test', 'short', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'P0001', null, 'Operator reference is required');
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000002', 'wrong@nac.test', 'M09-LOCAL-TEST', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'P0001', null, 'Expected email must match Auth and profile');

insert into public.body_metrics(student_id, weight_kg) values ('f0000000-0000-0000-0000-000000000002', 70);
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000002', 'bootstrap-confirmed@nac.test', 'M09-LOCAL-TEST', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'P0001', null, 'Account with training history cannot become first admin');
delete from public.body_metrics where student_id = 'f0000000-0000-0000-0000-000000000002';

select lives_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000002', 'bootstrap-confirmed@nac.test', 'M09-LOCAL-TEST', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'Trusted operator provisions first admin');
select results_eq($$select role::text from public.profiles where id = 'f0000000-0000-0000-0000-000000000002'$$, array['admin'], 'First admin role persists');
select results_eq($$select count(*) from public.audit_events where entity_id = 'f0000000-0000-0000-0000-000000000002' and action = 'admin.bootstrap' and operator_reference = 'M09-LOCAL-TEST' and actor_id is null$$, array[1::bigint], 'Bootstrap records the trusted operator reference');
select throws_ok($$select nac_private.bootstrap_first_admin('f0000000-0000-0000-0000-000000000001', 'bootstrap-unconfirmed@nac.test', 'M09-LOCAL-TEST', 'PROVISIONAR PRIMEIRO ADMIN NAC')$$, 'P0001', null, 'Second bootstrap is refused');

select * from finish();
rollback;
