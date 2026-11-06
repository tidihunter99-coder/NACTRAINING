-- Mission 11.1: isolated local Storage RLS rehearsal. No remote connection.
begin;
set local plan_cache_mode = force_custom_plan;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id, email, email_confirmed_at) values
  ('f3000000-0000-4000-8000-000000000001', 'private-student@nac.test', now()),
  ('f3000000-0000-4000-8000-000000000002', 'private-teacher@nac.test', now()),
  ('f3000000-0000-4000-8000-000000000003', 'private-admin@nac.test', now()),
  ('f3000000-0000-4000-8000-000000000005', 'private-unassigned@nac.test', now());
update public.profiles set role='instructor' where id='f3000000-0000-4000-8000-000000000002';
update public.profiles set role='admin' where id='f3000000-0000-4000-8000-000000000003';
insert into public.student_instructors(id, student_id, instructor_id)
values ('f3000000-0000-4000-8000-000000000006', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002');
insert into public.exercises(id, name, muscle_group, visibility, created_by, instructions)
values ('f3000000-0000-4000-8000-000000000004', 'Exercício privado local', 'chest', 'academy',
  'f3000000-0000-4000-8000-000000000002', 'Instrução local');
insert into public.workout_plans(id, student_id, instructor_id, title, status)
values ('f3000000-0000-4000-8000-000000000007', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 'Ficha privada local', 'draft');
insert into public.workout_days(id, workout_plan_id, name, display_order)
values ('f3000000-0000-4000-8000-000000000008', 'f3000000-0000-4000-8000-000000000007', 'Treino privado', 1);
insert into public.workout_exercises(id, workout_day_id, exercise_id, display_order, sets, repetitions)
values ('f3000000-0000-4000-8000-000000000009', 'f3000000-0000-4000-8000-000000000008', 'f3000000-0000-4000-8000-000000000004', 1, 3, 10);
update public.workout_plans set status='active' where id='f3000000-0000-4000-8000-000000000007';
insert into storage.objects(id, bucket_id, name) values
  ('f3000000-0000-4000-8000-000000000011', 'nac-exercise-media', 'exercises/f3000000-0000-4000-8000-000000000004/cover-f3000000-0000-4000-8000-000000000011.webp'),
  ('f3000000-0000-4000-8000-000000000012', 'nac-exercise-media', 'exercises/f3000000-0000-4000-8000-000000000004/demonstration-f3000000-0000-4000-8000-000000000012.mp4'),
  ('f3000000-0000-4000-8000-000000000013', 'nac-exercise-media', 'exercises/f3000000-0000-4000-8000-000000000004/anatomy-f3000000-0000-4000-8000-000000000013.webp');

select is((select public from storage.buckets where id='nac-exercise-media'), false, 'Bucket remains private');
select results_eq($$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='nac_exercise_media_authorized_select'$$, array[1::bigint], 'Approved-object SELECT policy exists');

set local role authenticated;
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000001';
select is_empty($$select id from storage.objects where bucket_id='nac-exercise-media'$$, 'Student cannot see pending media');
select throws_ok($$insert into storage.objects(id,bucket_id,name) values ('f3000000-0000-4000-8000-000000000014','nac-exercise-media','exercises/f3000000-0000-4000-8000-000000000004/cover-f3000000-0000-4000-8000-000000000014.webp')$$, '42501', null, 'Student cannot upload');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000002';
select is_empty($$select id from storage.objects where bucket_id='nac-exercise-media'$$, 'Instructor cannot see pending media');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000003';
select ok(public.can_access_exercise_media('f3000000-0000-4000-8000-000000000004'), 'Admin may authorize pending media');
select results_eq($$select count(*) from storage.objects where bucket_id='nac-exercise-media'$$, array[3::bigint], 'Admin can see pending media');
update public.exercises set
  image_url='nac-media:exercises/f3000000-0000-4000-8000-000000000004/cover-f3000000-0000-4000-8000-000000000011.webp',
  video_url='nac-media:exercises/f3000000-0000-4000-8000-000000000004/demonstration-f3000000-0000-4000-8000-000000000012.mp4',
  anatomy_image_url='nac-media:exercises/f3000000-0000-4000-8000-000000000004/anatomy-f3000000-0000-4000-8000-000000000013.webp',
  coaching_tip='Dica local', common_mistakes='Erro local', media_rights_note='Teste isolado',
  technical_reviewer='Revisor local', visual_reviewed_by='f3000000-0000-4000-8000-000000000003',
  visual_reviewed_at=now(), visual_review_status='approved'
where id='f3000000-0000-4000-8000-000000000004';
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000001';
select results_eq($$select count(*) from storage.objects where bucket_id='nac-exercise-media'$$, array[3::bigint], 'Student sees approved media');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000005';
select is_empty($$select id from storage.objects where bucket_id='nac-exercise-media'$$, 'Student cannot see approved media outside own workout');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000002';
select results_eq($$select count(*) from storage.objects where bucket_id='nac-exercise-media'$$, array[3::bigint], 'Instructor sees approved media');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000003';
update public.exercises set visual_review_status='pending', visual_reviewed_by=null, visual_reviewed_at=null,
  media_rights_note=null, technical_reviewer=null where id='f3000000-0000-4000-8000-000000000004';
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000001';
select is_empty($$select id from storage.objects where bucket_id='nac-exercise-media'$$, 'Revocation immediately hides media');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000003';
select public.admin_set_profile_status('f3000000-0000-4000-8000-000000000001', 'inactive');
set local request.jwt.claim.sub='f3000000-0000-4000-8000-000000000001';
select is_empty($$select id from storage.objects where bucket_id='nac-exercise-media'$$, 'Inactive student cannot see media');

select * from finish();
rollback;
