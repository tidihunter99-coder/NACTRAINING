-- Mission 06 local-only student flow. Fictional data rolls back after every run.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'flow-student-a@nac.test'),
  ('b0000000-0000-0000-0000-000000000002', 'flow-student-b@nac.test'),
  ('b0000000-0000-0000-0000-000000000003', 'flow-instructor@nac.test');
update public.profiles set role = 'instructor' where id = 'b0000000-0000-0000-0000-000000000003';
insert into public.student_instructors (student_id, instructor_id) values
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003');
insert into public.exercises (id, name, muscle_group, created_by, visibility) values
  ('b0000000-0000-0000-0000-000000000004', 'Exercício A', 'chest', 'b0000000-0000-0000-0000-000000000003', 'instructor_only'),
  ('b0000000-0000-0000-0000-000000000005', 'Exercício B', 'back', 'b0000000-0000-0000-0000-000000000003', 'instructor_only');
insert into public.workout_plans (id, student_id, instructor_id, title, status) values
  ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Ficha A', 'draft'),
  ('b0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Ficha B', 'draft');
insert into public.workout_days (id, workout_plan_id, name, display_order) values
  ('b0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'Treino A', 1),
  ('b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000007', 'Treino B', 1);
insert into public.workout_exercises (id, workout_day_id, exercise_id, display_order, sets, repetitions) values
  ('b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 1, 2, 10),
  ('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 1, 2, 10);
update public.workout_plans set status = 'active' where id in ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000007');

set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
select results_eq($$insert into public.workout_sessions (id, student_id, workout_plan_id, workout_day_id) values ('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000008') returning id$$, array['b0000000-0000-0000-0000-000000000012'::uuid], 'Student can start own active plan');
select throws_ok($$insert into public.workout_sessions (student_id, workout_plan_id, workout_day_id) values ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000008')$$, '23505', null, 'Only one open session per student');
select is_empty($$select id from public.workout_sessions where student_id = 'b0000000-0000-0000-0000-000000000002'$$, 'Student A cannot read Student B session');
select results_eq($$insert into public.workout_set_logs (workout_session_id, workout_exercise_id, set_number, repetitions_completed, load_used, completed, completed_at) values ('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000010', 1, 10, 20, true, now()) returning set_number$$, array[1::smallint], 'Student can save own set');
select results_eq($$update public.workout_set_logs set repetitions_completed = 9 where workout_session_id = 'b0000000-0000-0000-0000-000000000012' returning repetitions_completed$$, array[9::smallint], 'Student can correct own open set');

reset role;
update public.workout_plans set status = 'archived' where id = 'b0000000-0000-0000-0000-000000000006';
update public.exercises set is_active = false where id = 'b0000000-0000-0000-0000-000000000004';
set local role authenticated;
set local request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
select results_eq($$select count(*) from public.workout_plans where id = 'b0000000-0000-0000-0000-000000000006'$$, array[1::bigint], 'Archived plan remains visible with own session');
select results_eq($$select count(*) from public.exercises where id = 'b0000000-0000-0000-0000-000000000004'$$, array[1::bigint], 'Archived exercise remains visible with own session');
select results_eq($$update public.workout_sessions set status = 'completed', finished_at = now() where id = 'b0000000-0000-0000-0000-000000000012' returning id$$, array['b0000000-0000-0000-0000-000000000012'::uuid], 'Student can complete started session after archive');
select is_empty($$update public.workout_set_logs set repetitions_completed = 8 where workout_session_id = 'b0000000-0000-0000-0000-000000000012' returning id$$, 'Completed session sets cannot be edited');
select throws_ok($$insert into public.workout_sessions (student_id, workout_plan_id, workout_day_id) values ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000008')$$, 'P0001', null, 'Archived plan cannot start a new session');

select * from finish();
rollback;
