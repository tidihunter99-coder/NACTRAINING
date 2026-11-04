-- Mission 07: historical prescriptions are immutable; draft-only editor tools.

create or replace function public.protect_workout_plan_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id or new.instructor_id is distinct from old.instructor_id then
    raise exception 'Workout plan ownership is immutable; archive and create a new plan instead';
  end if;
  if old.status = 'archived' then
    raise exception 'Archived plans are immutable';
  end if;
  if old.status = 'active' and (
    new.status <> 'archived' or
    (new.title, new.description, new.objective, new.starts_at, new.ends_at)
      is distinct from (old.title, old.description, old.objective, old.starts_at, old.ends_at)
  ) then
    raise exception 'Active plans can only be archived without changing their prescription';
  end if;
  return new;
end;
$$;

grant delete on public.workout_days, public.workout_exercises to authenticated;

create policy workout_exercises_draft_delete on public.workout_exercises for delete to authenticated using (
  exists (
    select 1 from public.workout_days wd
    where wd.id = workout_day_id and public.can_edit_draft_workout_plan(wd.workout_plan_id)
  )
);
create policy workout_days_draft_delete on public.workout_days for delete to authenticated using (
  public.can_edit_draft_workout_plan(workout_plan_id)
);

create function public.remove_draft_workout_day(target_day_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  target_day public.workout_days%rowtype;
begin
  if public.current_app_role() is distinct from 'instructor' then raise exception 'Instructor required'; end if;
  select * into target_day from public.workout_days where id = target_day_id;
  if not found or not public.can_edit_draft_workout_plan(target_day.workout_plan_id) then
    raise exception 'Draft day not available';
  end if;
  if exists (select 1 from public.workout_sessions where workout_day_id = target_day_id) then
    raise exception 'A day with training history cannot be removed';
  end if;
  delete from public.workout_exercises where workout_day_id = target_day_id;
  delete from public.workout_days where id = target_day_id;
end;
$$;

create function public.move_draft_workout_day(target_day_id uuid, direction integer)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  current_day public.workout_days%rowtype;
  neighbor public.workout_days%rowtype;
  temp_order integer;
begin
  if direction not in (-1, 1) or public.current_app_role() is distinct from 'instructor' then
    raise exception 'Invalid draft move';
  end if;
  select * into current_day from public.workout_days where id = target_day_id;
  if not found or not public.can_edit_draft_workout_plan(current_day.workout_plan_id) then
    raise exception 'Draft day not available';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_day.workout_plan_id::text, 70409));
  select * into current_day from public.workout_days where id = target_day_id for update;
  if direction = -1 then
    select * into neighbor from public.workout_days
      where workout_plan_id = current_day.workout_plan_id and display_order < current_day.display_order
      order by display_order desc limit 1 for update;
  else
    select * into neighbor from public.workout_days
      where workout_plan_id = current_day.workout_plan_id and display_order > current_day.display_order
      order by display_order asc limit 1 for update;
  end if;
  if not found then return; end if;
  select max(display_order) + 1 into temp_order from public.workout_days where workout_plan_id = current_day.workout_plan_id;
  if temp_order > 32767 then raise exception 'Too many divisions to reorder'; end if;
  update public.workout_days set display_order = temp_order where id = current_day.id;
  update public.workout_days set display_order = current_day.display_order where id = neighbor.id;
  update public.workout_days set display_order = neighbor.display_order where id = current_day.id;
end;
$$;

create function public.move_draft_workout_exercise(target_prescription_id uuid, direction integer)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  current_item public.workout_exercises%rowtype;
  neighbor public.workout_exercises%rowtype;
  target_plan_id uuid;
  temp_order integer;
begin
  if direction not in (-1, 1) or public.current_app_role() is distinct from 'instructor' then
    raise exception 'Invalid draft move';
  end if;
  select * into current_item from public.workout_exercises where id = target_prescription_id;
  if not found then raise exception 'Prescription not found'; end if;
  select workout_plan_id into target_plan_id from public.workout_days where id = current_item.workout_day_id;
  if not public.can_edit_draft_workout_plan(target_plan_id) then
    raise exception 'Draft prescription not available';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(current_item.workout_day_id::text, 70410));
  select * into current_item from public.workout_exercises where id = target_prescription_id for update;
  if direction = -1 then
    select * into neighbor from public.workout_exercises
      where workout_day_id = current_item.workout_day_id and display_order < current_item.display_order
      order by display_order desc limit 1 for update;
  else
    select * into neighbor from public.workout_exercises
      where workout_day_id = current_item.workout_day_id and display_order > current_item.display_order
      order by display_order asc limit 1 for update;
  end if;
  if not found then return; end if;
  select max(display_order) + 1 into temp_order from public.workout_exercises where workout_day_id = current_item.workout_day_id;
  if temp_order > 32767 then raise exception 'Too many exercises to reorder'; end if;
  update public.workout_exercises set display_order = temp_order where id = current_item.id;
  update public.workout_exercises set display_order = current_item.display_order where id = neighbor.id;
  update public.workout_exercises set display_order = neighbor.display_order where id = current_item.id;
end;
$$;

revoke all on function public.remove_draft_workout_day(uuid), public.move_draft_workout_day(uuid, integer), public.move_draft_workout_exercise(uuid, integer) from public;
grant execute on function public.remove_draft_workout_day(uuid), public.move_draft_workout_day(uuid, integer), public.move_draft_workout_exercise(uuid, integer) to authenticated;
