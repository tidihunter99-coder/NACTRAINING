-- NAC TRAINING — deny private data access to inactive profiles, including
-- direct Data API requests made with a previously issued session.
-- Apply only to a reviewed, authorized target after local verification.

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
        (wp.student_id = auth.uid() and wp.status = 'active' and public.current_app_role() = 'student')
        or public.can_manage_workout_plan(wp.id)
      )
  )
$$;

create or replace function public.owns_open_workout_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_sessions ws
    where ws.id = target_session_id
      and ws.student_id = auth.uid()
      and ws.status = 'in_progress'
      and public.current_app_role() = 'student'
  )
$$;

-- Keep self-read of profiles so the application can explain inactive status.
drop policy profiles_update_self_basic_fields on public.profiles;
create policy profiles_update_self_basic_fields on public.profiles for update to authenticated
  using (id = auth.uid() and public.current_app_role() is not null)
  with check (id = auth.uid() and public.current_app_role() is not null);

drop policy student_instructors_select_authorized on public.student_instructors;
create policy student_instructors_select_authorized on public.student_instructors for select to authenticated using (
  public.is_admin()
  or (student_id = auth.uid() and public.current_app_role() = 'student')
  or (instructor_id = auth.uid() and public.current_app_role() = 'instructor')
);

drop policy exercises_select_authorized on public.exercises;
create policy exercises_select_authorized on public.exercises for select to authenticated using (
  public.current_app_role() is not null
  and (
    public.is_admin() or created_by = auth.uid() or (
      is_active and (
        visibility = 'academy' or exists (
          select 1 from public.workout_exercises we
          join public.workout_days wd on wd.id = we.workout_day_id
          join public.workout_plans wp on wp.id = wd.workout_plan_id
          where we.exercise_id = exercises.id and wp.student_id = auth.uid() and wp.status = 'active'
        )
      )
    )
  )
);

drop policy workout_plans_select_authorized on public.workout_plans;
create policy workout_plans_select_authorized on public.workout_plans for select to authenticated using (
  (student_id = auth.uid() and status = 'active' and public.current_app_role() = 'student')
  or public.can_manage_workout_plan(id)
);

drop policy workout_sessions_select_authorized on public.workout_sessions;
create policy workout_sessions_select_authorized on public.workout_sessions for select to authenticated using (
  (student_id = auth.uid() and public.current_app_role() = 'student')
  or public.is_active_instructor_for(student_id) or public.is_admin()
);
drop policy workout_sessions_student_insert on public.workout_sessions;
create policy workout_sessions_student_insert on public.workout_sessions for insert to authenticated with check (
  student_id = auth.uid() and public.current_app_role() = 'student' and status = 'in_progress' and exists (
    select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.student_id = auth.uid() and wp.status = 'active'
  )
);
drop policy workout_sessions_student_update on public.workout_sessions;
create policy workout_sessions_student_update on public.workout_sessions for update to authenticated
  using (student_id = auth.uid() and public.current_app_role() = 'student')
  with check (student_id = auth.uid() and public.current_app_role() = 'student');

drop policy workout_set_logs_select_authorized on public.workout_set_logs;
create policy workout_set_logs_select_authorized on public.workout_set_logs for select to authenticated using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_set_logs.workout_session_id
      and (
        (ws.student_id = auth.uid() and public.current_app_role() = 'student')
        or public.is_active_instructor_for(ws.student_id) or public.is_admin()
      )
  )
);

drop policy body_metrics_select_limited on public.body_metrics;
create policy body_metrics_select_limited on public.body_metrics for select to authenticated using (
  (student_id = auth.uid() and public.current_app_role() = 'student')
  or public.is_active_instructor_for(student_id)
);
drop policy body_metrics_student_insert on public.body_metrics;
create policy body_metrics_student_insert on public.body_metrics for insert to authenticated with check (
  student_id = auth.uid() and public.current_app_role() = 'student'
);
drop policy body_metrics_student_update on public.body_metrics;
create policy body_metrics_student_update on public.body_metrics for update to authenticated
  using (student_id = auth.uid() and public.current_app_role() = 'student')
  with check (student_id = auth.uid() and public.current_app_role() = 'student');
