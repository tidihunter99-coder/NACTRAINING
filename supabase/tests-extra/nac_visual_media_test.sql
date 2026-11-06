-- Mission 09.2: local-only visual review and storage policy tests.
-- This suite is separate from the original 134 assertions and rolls back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id, email, email_confirmed_at) values
  ('f2000000-0000-4000-8000-000000000001', 'media-student@nac.test', now()),
  ('f2000000-0000-4000-8000-000000000002', 'media-teacher@nac.test', now()),
  ('f2000000-0000-4000-8000-000000000003', 'media-admin@nac.test', now());
update public.profiles set role = 'instructor' where id = 'f2000000-0000-4000-8000-000000000002';
update public.profiles set role = 'admin' where id = 'f2000000-0000-4000-8000-000000000003';
insert into public.student_instructors(id, student_id, instructor_id)
values ('f2000000-0000-4000-8000-000000000008', 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000002');

insert into public.exercises(id, name, muscle_group, visibility, created_by, instructions)
values ('f2000000-0000-4000-8000-000000000004', 'Exercício visual de teste', 'chest', 'academy', 'f2000000-0000-4000-8000-000000000002', 'Passo específico de teste');
insert into public.workout_plans(id, student_id, instructor_id, title, status)
values ('f2000000-0000-4000-8000-000000000005', 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000002', 'Ficha visual de teste', 'draft');
insert into public.workout_days(id, workout_plan_id, name, display_order)
values ('f2000000-0000-4000-8000-000000000006', 'f2000000-0000-4000-8000-000000000005', 'Treino de teste', 1);
insert into public.workout_exercises(id, workout_day_id, exercise_id, display_order, sets, repetitions, suggested_load)
values ('f2000000-0000-4000-8000-000000000007', 'f2000000-0000-4000-8000-000000000006', 'f2000000-0000-4000-8000-000000000004', 1, 3, 10, 20);

select is((select visual_review_status from public.exercises where id = 'f2000000-0000-4000-8000-000000000004'), 'pending', 'New exercise starts pending review');
select is((select public from storage.buckets where id = 'nac-exercise-media'), false, 'Dedicated media bucket is private');
select results_eq($$select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('nac_exercise_media_admin_insert','nac_exercise_media_admin_delete','nac_exercise_media_authorized_select')$$, array[3::bigint], 'Storage has three scoped access policies');

set local role authenticated;
set local request.jwt.claim.sub = 'f2000000-0000-4000-8000-000000000002';
select throws_ok($$update public.exercises set media_rights_note='indevido' where id='f2000000-0000-4000-8000-000000000004'$$, 'P0001', null, 'Teacher cannot record visual approval');
set local request.jwt.claim.sub = 'f2000000-0000-4000-8000-000000000001';
select is_empty($$update public.exercises set image_url='/images/exercises/bench-press.webp' where id='f2000000-0000-4000-8000-000000000004' returning id$$, 'Student cannot change official media');

set local request.jwt.claim.sub = 'f2000000-0000-4000-8000-000000000003';
select throws_ok($$update public.exercises set visual_review_status='approved', visual_reviewed_by='f2000000-0000-4000-8000-000000000003', visual_reviewed_at=now(), media_rights_note='Teste local', technical_reviewer='Profissional de teste' where id='f2000000-0000-4000-8000-000000000004'$$, '23514', null, 'Incomplete media cannot be approved');
select lives_ok($$update public.exercises set image_url='nac-media:exercises/f2000000-0000-4000-8000-000000000004/cover-f2000000-0000-4000-8000-000000000011.webp', video_url='nac-media:exercises/f2000000-0000-4000-8000-000000000004/demonstration-f2000000-0000-4000-8000-000000000012.mp4', anatomy_image_url='nac-media:exercises/f2000000-0000-4000-8000-000000000004/anatomy-f2000000-0000-4000-8000-000000000013.webp', coaching_tip='Dica de teste', common_mistakes='Erro de teste', visual_review_status='approved', visual_reviewed_by='f2000000-0000-4000-8000-000000000003', visual_reviewed_at=now(), media_rights_note='Teste local', technical_reviewer='Profissional de teste' where id='f2000000-0000-4000-8000-000000000004'$$, 'Admin can approve complete test metadata');
select throws_ok($$update public.exercises set image_url='/images/exercises/other.webp' where id='f2000000-0000-4000-8000-000000000004'$$, 'P0001', null, 'Approved content is immutable until review reopens');
select lives_ok($$update public.exercises set visual_review_status='pending', visual_reviewed_by=null, visual_reviewed_at=null, media_rights_note=null, technical_reviewer=null where id='f2000000-0000-4000-8000-000000000004'$$, 'Admin can reopen review');
select lives_ok($$update public.exercises set image_url='/images/exercises/other.webp' where id='f2000000-0000-4000-8000-000000000004'$$, 'Admin can replace media on a prescribed item after reopening');
select throws_ok($$update public.exercises set name='Alteração indevida' where id='f2000000-0000-4000-8000-000000000004'$$, 'P0001', null, 'Prescribed exercise identity remains immutable');
select is((select sets::text || ',' || repetitions::text || ',' || suggested_load::numeric::text from public.workout_exercises where id='f2000000-0000-4000-8000-000000000007'), '3,10,20.00', 'Prescription remains unchanged');

select * from finish();
rollback;
