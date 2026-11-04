-- NAC TRAINING — local-only pgTAP RLS suite.
-- Run with `supabase test db` only after `supabase start` in an isolated local stack.
-- Every fixture is fictional and the enclosing transaction always rolls back.

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

-- Test identities: Student A/B, Instructor A/B, and Administrator.
insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'student-a@nac.test'),
  ('10000000-0000-0000-0000-000000000002', 'student-b@nac.test'),
  ('10000000-0000-0000-0000-000000000003', 'instructor-a@nac.test'),
  ('10000000-0000-0000-0000-000000000004', 'instructor-b@nac.test'),
  ('10000000-0000-0000-0000-000000000005', 'admin@nac.test');

-- The auth trigger creates student profiles. Role changes below emulate the
-- privileged bootstrap path and are never performed as an authenticated user.
update public.profiles set role = 'instructor' where id in (
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
);
update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000005';

insert into public.student_instructors (id, student_id, instructor_id)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004');

insert into public.exercises (id, name, muscle_group, created_by, visibility)
values
  ('30000000-0000-0000-0000-000000000001', 'Supino teste A', 'chest', '10000000-0000-0000-0000-000000000003', 'instructor_only'),
  ('30000000-0000-0000-0000-000000000002', 'Remada teste B', 'back', '10000000-0000-0000-0000-000000000004', 'instructor_only');

insert into public.workout_plans (id, student_id, instructor_id, title, status)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Ficha teste A', 'draft'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Ficha teste B', 'draft');

insert into public.workout_days (id, workout_plan_id, name, display_order)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Treino A', 1),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Treino B', 1);

insert into public.workout_exercises (id, workout_day_id, exercise_id, display_order, sets, repetitions)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, 3, 12),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 1, 3, 12);

update public.workout_plans set status = 'active' where id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002'
);

insert into public.workout_sessions (id, student_id, workout_plan_id, workout_day_id, status, finished_at)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'in_progress', null),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'in_progress', null),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'completed', now());

insert into public.body_metrics (id, student_id, weight_kg)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 70),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 80);
insert into public.audit_events (id, action, entity_type, entity_id)
values ('90000000-0000-0000-0000-000000000001', 'fixture.created', 'tests', '10000000-0000-0000-0000-000000000001');

set local role authenticated;

-- Student A: own data is visible; Student B data and prescription writes are blocked.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select results_eq('select count(*) from public.profiles', array[1::bigint], 'Student A sees only own profile');
select is_empty($$select id from public.profiles where id = '10000000-0000-0000-0000-000000000002'$$, 'Student A cannot read Student B profile');
select is_empty($$update public.profiles set phone = '00000000000' where id = '10000000-0000-0000-0000-000000000002' returning id$$, 'Student A cannot modify Student B profile');
select throws_ok($$update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000001'$$, '42501', null, 'Student A cannot promote own role');
select results_eq('select count(*) from public.workout_plans', array[1::bigint], 'Student A sees only own active plan');
select is_empty($$update public.workout_plans set title = 'Attempted edit' where id = '40000000-0000-0000-0000-000000000001' returning id$$, 'Student A cannot change prescription');
select is_empty($$select id from public.workout_sessions where id = '70000000-0000-0000-0000-000000000002'$$, 'Student A cannot read Student B session');
select throws_ok($$insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number) values ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 1)$$, 'P0001', null, 'Student A cannot log a set in Student B session');
select throws_ok($$insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number) values ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 1)$$, 'P0001', null, 'Student A cannot attach an exercise from another workout day');
select results_eq($$insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number, repetitions_completed, load_used, completed, completed_at) values ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 1, 12, 20, true, now()) returning set_number$$, array[1::smallint], 'Student A can log a valid own set');
select throws_ok($$update public.workout_sessions set notes = 'changed' where id = '70000000-0000-0000-0000-000000000003'$$, 'P0001', null, 'Student A cannot alter a completed session');
select is_empty($$select id from public.body_metrics where student_id = '10000000-0000-0000-0000-000000000002'$$, 'Student A cannot read Student B body metrics');
select throws_ok($$insert into public.audit_events (action, entity_type, entity_id) values ('forged', 'tests', '10000000-0000-0000-0000-000000000001')$$, '42501', null, 'Student A cannot forge audit events');
select throws_ok($$delete from public.audit_events where id = '90000000-0000-0000-0000-000000000001'$$, '42501', null, 'Student A cannot delete audit events');

-- Instructor A: sees and manages only Student A.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select results_eq($$select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000001'$$, array[1::bigint], 'Instructor A sees linked Student A');
select is_empty($$select id from public.profiles where id = '10000000-0000-0000-0000-000000000002'$$, 'Instructor A cannot see unlinked Student B');
select results_eq($$select count(*) from public.body_metrics where student_id = '10000000-0000-0000-0000-000000000001'$$, array[1::bigint], 'Instructor A sees linked Student A metrics');
select throws_ok($$insert into public.workout_plans (student_id, instructor_id, title) values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Unauthorized')$$, 'P0001', null, 'Instructor A cannot create a plan for unlinked Student B');
select throws_ok($$insert into public.exercises (name, muscle_group, created_by, visibility) values ('Unauthorized global', 'chest', '10000000-0000-0000-0000-000000000003', 'academy')$$, '42501', null, 'Instructor A cannot publish an academy-wide exercise');

-- Instructor B and admin: metrics remain narrowly scoped.
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
select is_empty($$select id from public.body_metrics where student_id = '10000000-0000-0000-0000-000000000001'$$, 'Instructor B cannot read Student A metrics');
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000005';
select is_empty($$select id from public.body_metrics where student_id = '10000000-0000-0000-0000-000000000001'$$, 'Admin has no blanket access to Student A metrics');
select lives_ok('select count(*) from public.audit_events', 'Admin can read audit events created by the fixture');

select * from finish();
rollback;
