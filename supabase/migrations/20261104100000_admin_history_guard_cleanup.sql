-- Service maintenance and local fixture cleanup remain possible; authenticated
-- administrators still use soft archive operations that retain history.
create or replace function public.protect_link_with_active_plan()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if current_user in ('postgres', 'service_role') then return old; end if;
    raise exception 'Assignments are retained for audit; set active to false';
  end if;
  if new.student_id is distinct from old.student_id
     or new.instructor_id is distinct from old.instructor_id
     or new.id is distinct from old.id then
    raise exception 'Assignment identity is immutable';
  end if;
  if old.active and not new.active and exists (
    select 1 from public.workout_plans
    where student_id = old.student_id and instructor_id = old.instructor_id and status = 'active'
  ) then raise exception 'Archive the active plan before removing this assignment'; end if;
  return new;
end;
$$;

create or replace function public.prevent_exercise_delete()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('postgres', 'service_role') then return old; end if;
  raise exception 'Exercises are retained for history; set is_active to false';
end;
$$;
