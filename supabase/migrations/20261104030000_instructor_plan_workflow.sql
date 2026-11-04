-- Mission 07: linked-instructor reading and atomic activation. Apply locally first.

-- An active instructor may inspect prescriptions behind a linked student's
-- activity, even when another instructor authored them. Drafts stay private.
create or replace function public.can_view_workout_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_plans wp
    where wp.id = target_plan_id and (
      (wp.student_id = auth.uid() and public.current_app_role() = 'student'
        and (wp.status = 'active' or public.student_has_session_for_plan(wp.id)))
      or public.can_manage_workout_plan(wp.id)
      or (wp.status in ('active', 'archived') and public.is_active_instructor_for(wp.student_id))
    )
  )
$$;

drop policy workout_plans_select_authorized on public.workout_plans;
create policy workout_plans_select_authorized on public.workout_plans for select to authenticated using (
  (student_id = auth.uid() and public.current_app_role() = 'student'
    and (status = 'active' or public.student_has_session_for_plan(id)))
  or public.can_manage_workout_plan(id)
  or (status in ('active', 'archived') and public.is_active_instructor_for(student_id))
);

drop policy exercises_select_authorized on public.exercises;
create policy exercises_select_authorized on public.exercises for select to authenticated using (
  public.current_app_role() is not null and (
    public.is_admin() or created_by = auth.uid()
    or (is_active and visibility = 'academy')
    or exists (
      select 1 from public.workout_exercises we
      join public.workout_days wd on wd.id = we.workout_day_id
      join public.workout_plans wp on wp.id = wd.workout_plan_id
      where we.exercise_id = exercises.id and (
        (wp.student_id = auth.uid() and public.current_app_role() = 'student'
          and (wp.status = 'active' or public.student_has_session_for_plan(wp.id)))
        or (wp.status in ('active', 'archived') and public.is_active_instructor_for(wp.student_id))
      )
    )
  )
);

-- SECURITY INVOKER preserves all existing RLS and write grants. The advisory
-- lock serializes activation attempts for the same student. Another author's
-- active plan is never archived by this function.
create function public.activate_instructor_workout_plan(target_plan_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  target_plan public.workout_plans%rowtype;
  previous_plan public.workout_plans%rowtype;
begin
  if public.current_app_role() <> 'instructor' then
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

  -- The insert/update trigger also checks this. Check before archiving the old
  -- plan so an incomplete draft cannot displace a valid prescription.
  if not exists (
    select 1 from public.workout_days wd
    join public.workout_exercises we on we.workout_day_id = wd.id
    where wd.workout_plan_id = target_plan.id
  ) then raise exception 'A plan needs a prescribed exercise before activation'; end if;

  select * into previous_plan from public.workout_plans
  where student_id = target_plan.student_id and status = 'active' for update;
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

revoke all on function public.activate_instructor_workout_plan(uuid) from public;
grant execute on function public.activate_instructor_workout_plan(uuid) to authenticated;
