-- Mission 09: one-time administrator provisioning from a trusted PostgreSQL
-- connection only. This schema is not exposed by the Data API.
create schema if not exists nac_private;
revoke all on schema nac_private from public, anon, authenticated, service_role;

alter table public.audit_events
  add column operator_reference text,
  add constraint audit_events_operator_reference_length
    check (operator_reference is null or char_length(operator_reference) between 8 and 120);

create function nac_private.bootstrap_first_admin(
  target_profile_id uuid,
  expected_email text,
  operator_reference text,
  confirmation_phrase text
)
returns void
language plpgsql
security invoker
set search_path = public, auth, nac_private
as $$
declare
  target_profile public.profiles%rowtype;
begin
  if current_user <> 'postgres' then
    raise exception 'A trusted PostgreSQL operator is required';
  end if;
  if confirmation_phrase is distinct from 'PROVISIONAR PRIMEIRO ADMIN NAC' then
    raise exception 'Explicit bootstrap confirmation is required';
  end if;
  if operator_reference is null or char_length(operator_reference) not between 8 and 120
     or operator_reference !~ '^[A-Za-z0-9][A-Za-z0-9 _./:@-]*$' then
    raise exception 'A non-secret operator or change-ticket reference is required';
  end if;
  if expected_email is null or btrim(expected_email) = '' then
    raise exception 'Expected account email is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('nac-first-admin', 70411));
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  select * into target_profile from public.profiles
    where id = target_profile_id for update;
  if not found or target_profile.role <> 'student' or target_profile.status <> 'active'
     or lower(target_profile.email) <> lower(btrim(expected_email)) then
    raise exception 'An active student profile with the expected email is required';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = target_profile_id
      and u.email_confirmed_at is not null
      and lower(u.email) = lower(btrim(expected_email))
  ) then
    raise exception 'The Supabase Auth email must be confirmed';
  end if;
  if exists (select 1 from public.student_instructors where student_id = target_profile_id or instructor_id = target_profile_id)
     or exists (select 1 from public.workout_plans where student_id = target_profile_id or instructor_id = target_profile_id)
     or exists (select 1 from public.workout_sessions where student_id = target_profile_id)
     or exists (select 1 from public.body_metrics where student_id = target_profile_id)
     or exists (select 1 from public.exercises where created_by = target_profile_id) then
    raise exception 'An account with training history or assignments cannot become the first administrator';
  end if;

  update public.profiles set role = 'admin' where id = target_profile_id;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, operator_reference)
    values (null, 'admin.bootstrap', 'profiles', target_profile_id, operator_reference);
end;
$$;

revoke all on function nac_private.bootstrap_first_admin(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant usage on schema nac_private to postgres;
grant execute on function nac_private.bootstrap_first_admin(uuid, text, text, text) to postgres;
