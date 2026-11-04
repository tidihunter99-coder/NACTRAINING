-- Mission 07 local-only instructor workflow. Fictional fixture rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'teacher-flow-student-a@nac.test'),
  ('c0000000-0000-0000-0000-000000000002', 'teacher-flow-student-b@nac.test'),
  ('c0000000-0000-0000-0000-000000000003', 'teacher-flow-instructor-a@nac.test'),
  ('c0000000-0000-0000-0000-000000000004', 'teacher-flow-instructor-b@nac.test'),
  ('c0000000-0000-0000-0000-000000000005', 'teacher-flow-instructor-c@nac.test');
update public.profiles set role = 'instructor' where id in (
  'c0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000005'
);
insert into public.student_instructors (student_id, instructor_id) values
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005');
insert into public.exercises (id, name, muscle_group, created_by, visibility) values
  ('c0000000-0000-0000-0000-000000000006', 'Exercício A local', 'chest', 'c0000000-0000-0000-0000-000000000003', 'instructor_only'),
  ('c0000000-0000-0000-0000-000000000007', 'Exercício B local', 'back', 'c0000000-0000-0000-0000-000000000004', 'instructor_only');
insert into public.workout_plans (id, student_id, instructor_id, title, status) values
  ('c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Ficha antiga A', 'draft'),
  ('c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Ficha nova A', 'draft'),
  ('c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Ficha professor B', 'draft');

set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
select throws_ok($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000008')$$, 'P0001', null, 'Student cannot activate an instructor plan');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
select throws_ok($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000008')$$, 'P0001', null, 'Empty draft cannot replace an active plan');

reset role;
insert into public.workout_days (id, workout_plan_id, name, display_order) values
  ('c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000008', 'Treino antigo', 1),
  ('c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000009', 'Treino novo', 1),
  ('c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000010', 'Treino B', 1);
insert into public.workout_exercises (id, workout_day_id, exercise_id, display_order, sets, repetitions) values
  ('c0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000006', 1, 2, 10),
  ('c0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000006', 1, 2, 10),
  ('c0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000007', 1, 2, 10);

set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
select results_eq($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000008')$$, array['c0000000-0000-0000-0000-000000000008'::uuid], 'Instructor A activates own complete plan');
select results_eq($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000008')$$, array['c0000000-0000-0000-0000-000000000008'::uuid], 'Activation retry is idempotent');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
select results_eq($$select count(*) from public.workout_plans where id = 'c0000000-0000-0000-0000-000000000008'$$, array[1::bigint], 'Student sees activated plan');
select results_eq($$insert into public.workout_sessions (id, student_id, workout_plan_id, workout_day_id) values ('c0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000011') returning id$$, array['c0000000-0000-0000-0000-000000000017'::uuid], 'Student starts a real session');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';
select results_eq($$select count(*) from public.workout_plans where id = 'c0000000-0000-0000-0000-000000000008'$$, array[1::bigint], 'Linked instructor B can inspect another author active plan');
select results_eq($$select count(*) from public.exercises where id = 'c0000000-0000-0000-0000-000000000006'$$, array[1::bigint], 'Linked instructor B can inspect prescribed private exercise');
select is_empty($$update public.workout_plans set title = 'Unauthorized' where id = 'c0000000-0000-0000-0000-000000000008' returning id$$, 'Linked instructor B cannot edit another author plan');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';
select is_empty($$select id from public.workout_plans where id = 'c0000000-0000-0000-0000-000000000008'$$, 'Unlinked instructor C cannot see Student A plan');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
select results_eq($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000009')$$, array['c0000000-0000-0000-0000-000000000009'::uuid], 'Replacement archives old plan and activates new plan atomically');
select results_eq($$select count(*) from public.workout_plans where id = 'c0000000-0000-0000-0000-000000000008' and status = 'archived'$$, array[1::bigint], 'Old plan is archived');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
select results_eq($$update public.workout_sessions set status = 'completed', finished_at = now() where id = 'c0000000-0000-0000-0000-000000000017' returning id$$, array['c0000000-0000-0000-0000-000000000017'::uuid], 'Student finishes old session after replacement');
set local request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';
select results_eq($$select count(*) from public.workout_plans where id = 'c0000000-0000-0000-0000-000000000008' and status = 'archived'$$, array[1::bigint], 'Linked instructor B can inspect archived history');
select throws_ok($$select public.activate_instructor_workout_plan('c0000000-0000-0000-0000-000000000010')$$, 'P0001', null, 'Instructor B cannot displace another author active plan');

select * from finish();
rollback;
