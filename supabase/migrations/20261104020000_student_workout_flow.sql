-- NAC TRAINING Mission 06: one resumable session and readable historical plans.
-- Local validation first. Never apply to a remote project without authorization.

create unique index workout_sessions_one_open_per_student
  on public.workout_sessions(student_id) where status = 'in_progress';

create function public.student_has_session_for_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_app_role() = 'student' and exists (
    select 1 from public.workout_sessions ws
    where ws.workout_plan_id = target_plan_id and ws.student_id = auth.uid()
  )
$$;

revoke all on function public.student_has_session_for_plan(uuid) from public;
grant execute on function public.student_has_session_for_plan(uuid) to authenticated;

create or replace function public.can_view_workout_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_plans wp
    where wp.id = target_plan_id
      and (
        (wp.student_id = auth.uid() and public.current_app_role() = 'student'
          and (wp.status = 'active' or public.student_has_session_for_plan(wp.id)))
        or public.can_manage_workout_plan(wp.id)
      )
  )
$$;

drop policy workout_plans_select_authorized on public.workout_plans;
create policy workout_plans_select_authorized on public.workout_plans for select to authenticated using (
  (student_id = auth.uid() and public.current_app_role() = 'student'
    and (status = 'active' or public.student_has_session_for_plan(id)))
  or public.can_manage_workout_plan(id)
);

drop policy exercises_select_authorized on public.exercises;
create policy exercises_select_authorized on public.exercises for select to authenticated using (
  public.current_app_role() is not null
  and (
    public.is_admin() or created_by = auth.uid()
    or (is_active and visibility = 'academy')
    or exists (
      select 1 from public.workout_exercises we
      join public.workout_days wd on wd.id = we.workout_day_id
      join public.workout_plans wp on wp.id = wd.workout_plan_id
      where we.exercise_id = exercises.id and wp.student_id = auth.uid()
        and (wp.status = 'active' or public.student_has_session_for_plan(wp.id))
    )
  )
);

-- Completing a session is allowed when its plan was archived after the start.
-- Starting a new session still requires an active plan and the RLS insert policy.
create or replace function public.validate_workout_session()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  plan_student_id uuid;
  day_plan_id uuid;
  plan_status public.workout_plan_status;
begin
  select student_id, status into plan_student_id, plan_status
  from public.workout_plans where id = new.workout_plan_id;
  select workout_plan_id into day_plan_id
  from public.workout_days where id = new.workout_day_id;
  if plan_student_id is null or day_plan_id is null
     or plan_student_id <> new.student_id or day_plan_id <> new.workout_plan_id then
    raise exception 'Workout session references must belong to the same student, plan, and workout day';
  end if;
  if tg_op = 'INSERT' and plan_status <> 'active' then
    raise exception 'Workout sessions can only be created for active workout plans';
  end if;
  if tg_op = 'UPDATE' and (new.student_id, new.workout_plan_id, new.workout_day_id)
     is distinct from (old.student_id, old.workout_plan_id, old.workout_day_id) then
    raise exception 'A workout session cannot be reassigned';
  end if;
  if tg_op = 'UPDATE' and old.status in ('completed', 'cancelled') and new.status <> old.status then
    raise exception 'A completed or cancelled workout session cannot be reopened';
  end if;
  return new;
end;
$$;
