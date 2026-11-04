-- NAC TRAINING — inactive identities must lose direct data access.
-- Fictional local-only fixtures; the transaction always rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email)
values
  ('a0000000-0000-0000-0000-000000000001', 'inactive-student@nac.test'),
  ('a0000000-0000-0000-0000-000000000002', 'inactive-instructor@nac.test');
update public.profiles set role = 'instructor' where id = 'a0000000-0000-0000-0000-000000000002';
insert into public.student_instructors (student_id, instructor_id)
values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
insert into public.exercises (id, name, muscle_group, created_by, visibility)
values ('a0000000-0000-0000-0000-000000000003', 'Exercício NAC teste', 'chest', 'a0000000-0000-0000-0000-000000000002', 'academy');
insert into public.workout_plans (id, student_id, instructor_id, title, status)
values ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Ficha inativa teste', 'draft');
insert into public.workout_days (id, workout_plan_id, name, display_order)
values ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'Treino teste', 1);
insert into public.workout_exercises (id, workout_day_id, exercise_id, display_order, sets, repetitions)
values ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 1, 3, 10);
update public.workout_plans set status = 'active' where id = 'a0000000-0000-0000-0000-000000000004';
insert into public.workout_sessions (id, student_id, workout_plan_id, workout_day_id, status)
values ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'in_progress');
insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number)
values ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000006', 1);
insert into public.body_metrics (student_id, weight_kg)
values ('a0000000-0000-0000-0000-000000000001', 70);

update public.profiles set status = 'inactive'
where id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select results_eq($$select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'$$, array[1::bigint], 'Inactive student can read own status');
select is_empty('select id from public.body_metrics', 'Inactive student cannot read body metrics');
select throws_ok($$insert into public.body_metrics (student_id, weight_kg) values ('a0000000-0000-0000-0000-000000000001', 71)$$, '42501', null, 'Inactive student cannot insert body metrics');
select is_empty('select id from public.workout_plans', 'Inactive student cannot read plans');
select is_empty('select id from public.workout_days', 'Inactive student cannot read workout days');
select is_empty('select id from public.workout_exercises', 'Inactive student cannot read prescribed exercises');
select is_empty('select id from public.workout_sessions', 'Inactive student cannot read sessions');
select is_empty('select id from public.workout_set_logs', 'Inactive student cannot read sets');
select is_empty('select id from public.student_instructors', 'Inactive student cannot read assignments');
select is_empty('select id from public.exercises', 'Inactive student cannot read exercise catalog');
select is_empty($$update public.profiles set phone = '00000000000' where id = 'a0000000-0000-0000-0000-000000000001' returning id$$, 'Inactive student cannot update profile');
select is_empty($$update public.workout_sessions set notes = 'changed' where id = 'a0000000-0000-0000-0000-000000000007' returning id$$, 'Inactive student cannot update sessions');
-- The validation triggers reject these writes before the RLS check because the
-- inactive caller can no longer see the plan/day and session/exercise rows.
select throws_ok($$insert into public.workout_sessions (student_id, workout_plan_id, workout_day_id, status) values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'in_progress')$$, 'P0001', null, 'Inactive student cannot start a session');
select throws_ok($$insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number) values ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000006', 2)$$, 'P0001', null, 'Inactive student cannot add a set');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
select is_empty('select id from public.student_instructors', 'Inactive instructor cannot read assignments');
select is_empty('select id from public.exercises', 'Inactive instructor cannot read exercise catalog');

select * from finish();
rollback;
