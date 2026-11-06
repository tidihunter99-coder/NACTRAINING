alter table public.exercises
  add column if not exists coaching_tip text,
  add column if not exists common_mistakes text;

alter table public.exercises
  add constraint exercises_coaching_tip_length check (coaching_tip is null or char_length(coaching_tip) <= 2000),
  add constraint exercises_common_mistakes_length check (common_mistakes is null or char_length(common_mistakes) <= 4000);

-- Prescribed exercise identity and instructions stay immutable. Administrators may
-- correct media and supporting guidance without changing the training history.
create or replace function public.protect_prescribed_exercise()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.workout_exercises where exercise_id = old.id) then
    if (new.name, new.description, new.muscle_group, new.secondary_muscles,
        new.equipment, new.difficulty, new.instructions, new.created_by, new.visibility)
       is distinct from
       (old.name, old.description, old.muscle_group, old.secondary_muscles,
        old.equipment, old.difficulty, old.instructions, old.created_by, old.visibility) then
      raise exception 'Prescribed exercise content is immutable';
    end if;
    if (new.video_url, new.image_url, new.anatomy_image_url, new.coaching_tip, new.common_mistakes)
       is distinct from
       (old.video_url, old.image_url, old.anatomy_image_url, old.coaching_tip, old.common_mistakes)
       and not public.is_admin() then
      raise exception 'Only administrators can revise prescribed exercise media';
    end if;
  end if;
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nac-exercise-media', 'nac-exercise-media', true, 26214400,
        array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy nac_exercise_media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'nac-exercise-media' and public.is_admin());

create policy nac_exercise_media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'nac-exercise-media' and public.is_admin());
