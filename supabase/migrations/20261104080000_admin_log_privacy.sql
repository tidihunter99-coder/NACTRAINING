-- Administrative summaries do not require reading individual set records.
drop policy workout_set_logs_select_authorized on public.workout_set_logs;
create policy workout_set_logs_select_authorized on public.workout_set_logs for select to authenticated using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_set_logs.workout_session_id
      and ((ws.student_id = auth.uid() and public.current_app_role() = 'student')
        or public.is_active_instructor_for(ws.student_id))
  )
);
