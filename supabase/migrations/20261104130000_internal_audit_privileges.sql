-- Supabase assigns explicit EXECUTE grants to API roles by default.
-- Revoking PUBLIC alone does not remove those independent grants.
-- Only trusted SECURITY DEFINER audit triggers may call this internal helper.
revoke all on function public.write_audit_event(text, text, uuid)
  from public, anon, authenticated, service_role;

-- Trigger functions are not RPCs. Preserve their execution by existing triggers.
revoke all on function public.audit_profile_change(),
  public.audit_student_instructor_change(),
  public.audit_workout_plan_status_change(),
  public.audit_exercise_change()
  from public, anon, authenticated, service_role;
