-- All NAC exercise assets are private. The app issues short-lived signed URLs
-- only after it has checked this function. Direct Storage reads are subject to
-- this same policy, so knowing an object path never grants access.
update storage.buckets set public = false where id = 'nac-exercise-media';

drop policy if exists nac_exercise_media_admin_select on storage.objects;
drop policy if exists nac_exercise_media_authorized_select on storage.objects;

create or replace function public.can_access_exercise_media(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.exercises e
    where e.id = target_exercise_id
      and (
        public.is_admin()
        or (
          e.is_active
          and e.visual_review_status = 'approved'
          and public.current_app_role() = 'instructor'
          and (
            e.visibility = 'academy'
            or e.created_by = auth.uid()
            or exists (
              select 1
              from public.workout_exercises we
              join public.workout_days wd on wd.id = we.workout_day_id
              join public.workout_plans wp on wp.id = wd.workout_plan_id
              where we.exercise_id = e.id
                and wp.status in ('active', 'archived')
                and public.is_active_instructor_for(wp.student_id)
            )
          )
        )
        or (
          e.is_active
          and e.visual_review_status = 'approved'
          and public.current_app_role() = 'student'
          and exists (
            select 1
            from public.workout_exercises we
            join public.workout_days wd on wd.id = we.workout_day_id
            join public.workout_plans wp on wp.id = wd.workout_plan_id
            where we.exercise_id = e.id
              and wp.student_id = auth.uid()
              and (wp.status = 'active' or public.student_has_session_for_plan(wp.id))
          )
        )
      )
  )
$$;

revoke all on function public.can_access_exercise_media(uuid) from public;
grant execute on function public.can_access_exercise_media(uuid) to authenticated;

create or replace function public.can_access_exercise_media_object(target_path text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.exercises e
    where public.can_access_exercise_media(e.id)
      and (
        e.image_url = 'nac-media:' || target_path
        or e.video_url = 'nac-media:' || target_path
        or e.anatomy_image_url = 'nac-media:' || target_path
      )
  )
$$;

revoke all on function public.can_access_exercise_media_object(text) from public;
grant execute on function public.can_access_exercise_media_object(text) to authenticated;

create policy nac_exercise_media_authorized_select on storage.objects
  for select to authenticated using (
    bucket_id = 'nac-exercise-media'
    and (public.is_admin() or public.can_access_exercise_media_object(storage.objects.name))
  );

-- An approved record must point to the exact private object names for its ID.
-- Existing pending rows remain usable without media.
alter table public.exercises drop constraint exercises_visual_approval_complete;
alter table public.exercises add constraint exercises_visual_approval_complete check (
  visual_review_status = 'pending' or (
    image_url ~ ('^nac-media:exercises/' || id::text || '/cover-[0-9a-f-]{36}\.webp$')
    and video_url ~ ('^nac-media:exercises/' || id::text || '/demonstration-[0-9a-f-]{36}\.(gif|mp4|webm)$')
    and anatomy_image_url ~ ('^nac-media:exercises/' || id::text || '/anatomy-[0-9a-f-]{36}\.webp$')
    and nullif(btrim(instructions), '') is not null
    and nullif(btrim(coaching_tip), '') is not null
    and nullif(btrim(common_mistakes), '') is not null
    and nullif(btrim(media_rights_note), '') is not null
    and nullif(btrim(technical_reviewer), '') is not null
    and visual_reviewed_by is not null
    and visual_reviewed_at is not null
  )
);

-- An instructor can still create an exercise, but cannot associate files or
-- impersonate an admin review through direct database access.
create or replace function public.protect_exercise_private_media()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.image_url is not null or new.video_url is not null or new.anatomy_image_url is not null then
        raise exception 'Only administrators can associate exercise media';
      end if;
    elsif (new.image_url, new.video_url, new.anatomy_image_url) is distinct from
          (old.image_url, old.video_url, old.anatomy_image_url) then
      raise exception 'Only administrators can associate exercise media';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists exercises_protect_private_media on public.exercises;
create trigger exercises_protect_private_media before insert or update on public.exercises
for each row execute function public.protect_exercise_private_media();
