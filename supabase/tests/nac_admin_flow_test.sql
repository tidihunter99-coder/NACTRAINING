-- Mission 08: fictional identities, real authenticated RLS, full rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users(id, email, email_confirmed_at) values
  ('e0000000-0000-0000-0000-000000000001', 'admin-flow-admin@nac.test', now()),
  ('e0000000-0000-0000-0000-000000000002', 'admin-flow-student@nac.test', now()),
  ('e0000000-0000-0000-0000-000000000003', 'admin-flow-teacher@nac.test', now()),
  ('e0000000-0000-0000-0000-000000000004', 'admin-flow-candidate@nac.test', now());
update public.profiles set role = 'admin' where id = 'e0000000-0000-0000-0000-000000000001';
update public.profiles set role = 'instructor' where id = 'e0000000-0000-0000-0000-000000000003';

set local role authenticated;
set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
select throws_ok($$select public.admin_dashboard_counts(now() - interval '30 days')$$, 'P0001', null, 'Student cannot read administrative aggregate');
select throws_ok($$select public.admin_assign_role('e0000000-0000-0000-0000-000000000002', 'admin')$$, 'P0001', null, 'Student cannot elevate own role');
select throws_ok($$select public.admin_set_instructor_link('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', true)$$, 'P0001', null, 'Student cannot assign a teacher');
select throws_ok($$select public.admin_completed_weekly()$$, 'P0001', null, 'Student cannot read weekly aggregate');
set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000003';
select throws_ok($$select public.admin_dashboard_counts(now() - interval '30 days')$$, 'P0001', null, 'Instructor cannot read administrative aggregate');
select throws_ok($$select public.admin_assign_role('e0000000-0000-0000-0000-000000000003', 'admin')$$, 'P0001', null, 'Instructor cannot promote self');
select is_empty($$select id from public.profiles where id = 'e0000000-0000-0000-0000-000000000004'$$, 'Instructor cannot enumerate unrelated profiles');

set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
select throws_ok($$select public.admin_assign_role('e0000000-0000-0000-0000-000000000004', 'admin')$$, 'P0001', null, 'Admin cannot create another admin through this flow');
select lives_ok($$select public.admin_assign_role('e0000000-0000-0000-0000-000000000004', 'instructor')$$, 'Admin enables confirmed teacher');
select results_eq($$select role::text from public.profiles where id = 'e0000000-0000-0000-0000-000000000004'$$, array['instructor'], 'Teacher role persists');
select lives_ok($$select public.admin_set_instructor_link('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', true)$$, 'Admin links student and teacher');
select results_eq($$select count(*) from public.student_instructors where student_id = 'e0000000-0000-0000-0000-000000000002' and instructor_id = 'e0000000-0000-0000-0000-000000000004'$$, array[1::bigint], 'One link exists');
select lives_ok($$select public.admin_set_instructor_link('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', true)$$, 'Repeated assignment is idempotent');
select results_eq($$select count(*) from public.student_instructors where student_id = 'e0000000-0000-0000-0000-000000000002' and instructor_id = 'e0000000-0000-0000-0000-000000000004'$$, array[1::bigint], 'No duplicate link');
select throws_ok($$update public.student_instructors set instructor_id = 'e0000000-0000-0000-0000-000000000003' where student_id = 'e0000000-0000-0000-0000-000000000002'$$, 'P0001', null, 'Direct API cannot reassign link identity');
select throws_ok($$delete from public.student_instructors where student_id = 'e0000000-0000-0000-0000-000000000002'$$, 'P0001', null, 'Direct API cannot erase link history');
select lives_ok($$select public.admin_set_profile_status('e0000000-0000-0000-0000-000000000002', 'inactive')$$, 'Admin inactivates student');
select results_eq($$select public.current_app_role() is null$$, array[false], 'Admin remains active');
set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
select results_eq($$select public.current_app_role() is null$$, array[true], 'Inactive student loses active role');
set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
select lives_ok($$select public.admin_set_profile_status('e0000000-0000-0000-0000-000000000002', 'active')$$, 'Admin reactivates student');
select throws_ok($$select public.admin_set_profile_status('e0000000-0000-0000-0000-000000000001', 'inactive')$$, 'P0001', null, 'Admin cannot inactivate self');

insert into public.exercises(id, name, muscle_group, visibility) values
  ('e0000000-0000-0000-0000-000000000005', 'Admin exercise', 'chest', 'academy');
insert into public.workout_plans(id, student_id, instructor_id, title, status) values
  ('e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'Admin test plan', 'draft');
insert into public.workout_days(id, workout_plan_id, name, display_order) values
  ('e0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000006', 'Admin test day', 1);
insert into public.workout_exercises(id, workout_day_id, exercise_id, display_order, sets, repetitions) values
  ('e0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000005', 1, 2, 10);
select lives_ok($$update public.workout_plans set status = 'active' where id = 'e0000000-0000-0000-0000-000000000006'$$, 'Admin activates complete fixture plan');
select throws_ok($$select public.admin_assign_role('e0000000-0000-0000-0000-000000000002', 'instructor')$$, 'P0001', null, 'Student with training history cannot switch role');
reset role;
insert into public.body_metrics(student_id, weight_kg) values ('e0000000-0000-0000-0000-000000000002', 70);
insert into public.workout_sessions(id, student_id, workout_plan_id, workout_day_id, status, finished_at) values
  ('e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000007', 'completed', now());
insert into public.workout_set_logs(workout_session_id, workout_exercise_id, set_number, repetitions_completed, load_used, completed, completed_at) values
  ('e0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000008', 1, 10, 20, true, now());
set local role authenticated;
select is_empty($$select id from public.body_metrics where student_id = 'e0000000-0000-0000-0000-000000000002'$$, 'Admin cannot read private body metrics');
select is_empty($$select id from public.workout_set_logs where workout_session_id = 'e0000000-0000-0000-0000-000000000009'$$, 'Admin cannot read individual set logs');
select throws_ok($$update public.exercises set name = 'Tampered exercise' where id = 'e0000000-0000-0000-0000-000000000005'$$, 'P0001', null, 'Prescribed exercise content is immutable');
select lives_ok($$update public.exercises set is_active = false where id = 'e0000000-0000-0000-0000-000000000005'$$, 'Admin archives prescribed exercise');
select throws_ok($$delete from public.exercises where id = 'e0000000-0000-0000-0000-000000000005'$$, 'P0001', null, 'Admin cannot delete exercise via Data API');
select lives_ok($$select public.admin_set_instructor_link('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', false)$$, 'Admin removes assignment and archives active plan');
select results_eq($$select status::text from public.workout_plans where id = 'e0000000-0000-0000-0000-000000000006'$$, array['archived'], 'Training history remains archived');
select is_empty($$select id from public.student_instructors where student_id = 'e0000000-0000-0000-0000-000000000002' and active$$, 'Assignment is inactive');
select throws_ok($$insert into public.audit_events(action, entity_type, entity_id) values ('forged', 'profiles', 'e0000000-0000-0000-0000-000000000002')$$, '42501', null, 'Authenticated admin cannot forge audit events');
select results_eq($$select count(*) > 0 from public.audit_events where actor_id = 'e0000000-0000-0000-0000-000000000001' and action = 'student_instructor.update'$$, array[true], 'Link change records administrator actor');
insert into public.exercises(id, name, muscle_group, visibility) values ('e0000000-0000-0000-0000-000000000010', ' admin EXERCISE ', 'chest', 'academy');
select results_eq($$select duplicate_count from public.admin_exercise_duplicate_counts(array['e0000000-0000-0000-0000-000000000005'::uuid])$$, array[2::bigint], 'Admin detects normalized duplicate names');
set local request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
select throws_ok($$select * from public.admin_exercise_duplicate_counts(array['e0000000-0000-0000-0000-000000000005'::uuid])$$, 'P0001', null, 'Student cannot query duplicate catalog metadata');

select * from finish();
rollback;
