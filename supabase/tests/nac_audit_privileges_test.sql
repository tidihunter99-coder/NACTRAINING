-- Regression: managed Supabase default ACLs previously allowed fabricated events.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

set local role anon;
select throws_ok($$select public.write_audit_event('forged', 'profiles', 'f1000000-0000-4000-8000-000000000001')$$, '42501', null, 'Anonymous RPC cannot fabricate audit events');
reset role;
insert into auth.users(id, email, email_confirmed_at) values
 ('f1000000-0000-4000-8000-000000000001', 'audit-student@example.test', now()),
 ('f1000000-0000-4000-8000-000000000002', 'audit-admin@example.test', now());
update public.profiles set role='admin' where id='f1000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='f1000000-0000-4000-8000-000000000001';
select throws_ok($$select public.write_audit_event('forged', 'profiles', 'f1000000-0000-4000-8000-000000000001')$$, '42501', null, 'Student RPC cannot fabricate audit events');
set local request.jwt.claim.sub='f1000000-0000-4000-8000-000000000002';
select throws_ok($$select public.write_audit_event('forged', 'profiles', 'f1000000-0000-4000-8000-000000000001')$$, '42501', null, 'Admin RPC cannot fabricate audit events');
select lives_ok($$select public.admin_set_profile_status('f1000000-0000-4000-8000-000000000001', 'inactive')$$, 'Legitimate audited admin operation still succeeds');
select results_eq($$select actor_id from public.audit_events where entity_id='f1000000-0000-4000-8000-000000000001' and action='profile.status_changed'$$, array['f1000000-0000-4000-8000-000000000002'::uuid], 'Trusted trigger records the actual actor');
reset role;
set local role service_role;
select throws_ok($$select public.write_audit_event('forged', 'profiles', 'f1000000-0000-4000-8000-000000000001')$$, '42501', null, 'Service role has no direct helper execution');
reset role;
select is((select count(*) from public.audit_events where action='forged'), 0::bigint, 'No forged event was persisted');
select ok(not has_function_privilege('anon','public.audit_profile_change()','EXECUTE'), 'Anonymous role cannot execute audit trigger function');
select ok(not has_function_privilege('authenticated','public.audit_exercise_change()','EXECUTE'), 'Authenticated role cannot execute audit trigger function');
select * from finish();
rollback;
