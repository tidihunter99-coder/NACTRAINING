-- Mission 07 draft editor and historical immutability. Local transaction only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'editor-student@nac.test'),
  ('d0000000-0000-0000-0000-000000000002', 'editor-instructor-a@nac.test'),
  ('d0000000-0000-0000-0000-000000000003', 'editor-instructor-b@nac.test');
update public.profiles set role = 'instructor' where id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003');
insert into public.student_instructors (student_id, instructor_id) values
  ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003');
insert into public.exercises (id, name, muscle_group, created_by, visibility) values
  ('d0000000-0000-0000-0000-000000000004', 'Editor exercise local', 'chest', 'd0000000-0000-0000-0000-000000000002', 'instructor_only');
insert into public.workout_plans (id, student_id, instructor_id, title, status) values
  ('d0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Editor draft local', 'draft');
insert into public.workout_days (id, workout_plan_id, name, display_order) values
  ('d0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005', 'Day one', 1),
  ('d0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000005', 'Day two', 2);
insert into public.workout_exercises (id, workout_day_id, exercise_id, display_order, sets, repetitions) values
  ('d0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 1, 3, 10),
  ('d0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 2, 2, 12),
  ('d0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000004', 1, 2, 8);

set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';
select lives_ok($$select public.move_draft_workout_exercise('d0000000-0000-0000-0000-000000000009', -1)$$, 'Owner can move a draft exercise');
select results_eq($$select display_order from public.workout_exercises where id = 'd0000000-0000-0000-0000-000000000009'$$, array[1::smallint], 'Moved exercise has the first position');
select results_eq($$delete from public.workout_exercises where id = 'd0000000-0000-0000-0000-000000000009' returning id$$, array['d0000000-0000-0000-0000-000000000009'::uuid], 'Owner can delete draft exercise');
select lives_ok($$select public.move_draft_workout_day('d0000000-0000-0000-0000-000000000007', -1)$$, 'Owner can move a draft day');
select results_eq($$select display_order from public.workout_days where id = 'd0000000-0000-0000-0000-000000000007'$$, array[1::smallint], 'Moved day has the first position');
select lives_ok($$select public.remove_draft_workout_day('d0000000-0000-0000-0000-000000000007')$$, 'Owner removes draft day with its exercises atomically');
select is_empty($$select id from public.workout_exercises where id = 'd0000000-0000-0000-0000-000000000010'$$, 'Removed day exercise is also gone');

set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
select is_empty($$delete from public.workout_exercises where id = 'd0000000-0000-0000-0000-000000000008' returning id$$, 'Student cannot delete a prescribed exercise');
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000003';
select throws_ok($$select public.move_draft_workout_exercise('d0000000-0000-0000-0000-000000000008', -1)$$, 'P0001', null, 'Another linked instructor cannot reorder the draft');
select is_empty($$delete from public.workout_days where id = 'd0000000-0000-0000-0000-000000000006' returning id$$, 'Another linked instructor cannot delete the draft day');

set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';
select lives_ok($$select public.activate_instructor_workout_plan('d0000000-0000-0000-0000-000000000005')$$, 'Owner activates completed draft');
select throws_ok($$update public.workout_plans set status = 'draft' where id = 'd0000000-0000-0000-0000-000000000005'$$, 'P0001', null, 'Active plan cannot return to draft');
select throws_ok($$update public.workout_plans set title = 'Changed history' where id = 'd0000000-0000-0000-0000-000000000005'$$, 'P0001', null, 'Active plan metadata is immutable');
select is_empty($$delete from public.workout_exercises where id = 'd0000000-0000-0000-0000-000000000008' returning id$$, 'Active prescription cannot be deleted');

select * from finish();
rollback;
