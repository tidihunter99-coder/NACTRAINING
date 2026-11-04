-- Mission 07 follow-up: inspect an active plan via SELECT before UPDATE.
-- SELECT FOR UPDATE applies the UPDATE RLS policy and hides plans authored by
-- another linked instructor; a plain SELECT plus per-student advisory lock
-- allows the function to reject that conflict explicitly without editing it.
create or replace function public.activate_instructor_workout_plan(target_plan_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  target_plan public.workout_plans%rowtype;
  previous_plan public.workout_plans%rowtype;
begin
  if public.current_app_role() is distinct from 'instructor' then
    raise exception 'Only an active instructor may activate a plan';
  end if;

  select * into target_plan from public.workout_plans
  where id = target_plan_id and instructor_id = auth.uid();
  if not found or not public.is_active_instructor_for(target_plan.student_id) then
    raise exception 'Plan or active instructor assignment not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_plan.student_id::text, 70407));
  select * into target_plan from public.workout_plans
  where id = target_plan_id and instructor_id = auth.uid() for update;
  if target_plan.status = 'active' then return target_plan.id; end if;
  if target_plan.status <> 'draft' then raise exception 'Only draft plans can be activated'; end if;

  if not exists (
    select 1 from public.workout_days wd
    join public.workout_exercises we on we.workout_day_id = wd.id
    where wd.workout_plan_id = target_plan.id
  ) then raise exception 'A plan needs a prescribed exercise before activation'; end if;

  select * into previous_plan from public.workout_plans
  where student_id = target_plan.student_id and status = 'active';
  if found then
    if previous_plan.instructor_id <> auth.uid() then
      raise exception 'The active plan belongs to another instructor';
    end if;
    update public.workout_plans set status = 'archived' where id = previous_plan.id;
  end if;

  update public.workout_plans set status = 'active' where id = target_plan.id;
  return target_plan.id;
end;
$$;
