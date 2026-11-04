-- NAC TRAINING — Mission 03 security hardening.
-- Prepared locally after static review. Do not apply remotely without review and authorization.

-- `current_user` inside a SECURITY DEFINER function is the function owner, not
-- the API caller. Use auth.uid() so direct requests cannot bypass this safeguard.
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'Email is managed by Supabase Auth';
  end if;
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Role and profile status require an authorized administrative operation';
  end if;
  return new;
end;
$$;

-- A plan with history must never be silently transferred to another student or instructor.
create function public.protect_workout_plan_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id or new.instructor_id is distinct from old.instructor_id then
    raise exception 'Workout plan ownership is immutable; archive and create a new plan instead';
  end if;
  return new;
end;
$$;

create trigger workout_plans_protect_ownership
  before update on public.workout_plans
  for each row execute function public.protect_workout_plan_ownership();

-- Preserve the completion record and duration after a session reaches a terminal state.
create function public.protect_terminal_workout_session()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('completed', 'cancelled') and (
    new.started_at is distinct from old.started_at or
    new.finished_at is distinct from old.finished_at or
    new.status is distinct from old.status or
    new.duration_seconds is distinct from old.duration_seconds or
    new.notes is distinct from old.notes
  ) then
    raise exception 'Completed or cancelled workout sessions are immutable';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_protect_terminal
  before update on public.workout_sessions
  for each row execute function public.protect_terminal_workout_session();

-- Academy-wide exercise publishing is an administrative action. Instructors can
-- create and maintain only instructor-scoped exercises; prescribed students can
-- still read those exercises through the existing plan policy.
drop policy exercises_instructor_insert on public.exercises;
create policy exercises_instructor_insert on public.exercises for insert to authenticated with check (
  public.is_admin() or (
    public.current_app_role() = 'instructor'
    and created_by = auth.uid()
    and visibility = 'instructor_only'
  )
);

drop policy exercises_owner_update on public.exercises;
create policy exercises_owner_update on public.exercises for update to authenticated using (
  public.is_admin() or (public.current_app_role() = 'instructor' and created_by = auth.uid())
) with check (
  public.is_admin() or (
    public.current_app_role() = 'instructor'
    and created_by = auth.uid()
    and visibility = 'instructor_only'
  )
);

revoke all on function public.protect_workout_plan_ownership(), public.protect_terminal_workout_session() from public;
