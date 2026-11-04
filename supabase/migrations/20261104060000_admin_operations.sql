-- Mission 08. Administrative operations retain history and use the caller's identity.

create or replace function public.admin_assign_role(target_profile_id uuid, target_role public.app_role)
returns void language plpgsql security definer set search_path = public, auth as $$
declare target public.profiles%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if target_profile_id = auth.uid() or target_role = 'admin' then
    raise exception 'Administrative role changes require a separate provisioning process';
  end if;
  select * into target from public.profiles where id = target_profile_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if target.role = 'admin' then raise exception 'Administrative accounts cannot be reassigned here'; end if;
  if target.role = target_role then return; end if;
  if target.status <> 'active' then raise exception 'Only active profiles can change role'; end if;
  if not exists (select 1 from auth.users where id = target_profile_id and email_confirmed_at is not null) then
    raise exception 'Email must be confirmed before a role change';
  end if;
  -- A role switch must never make existing training and link references inconsistent.
  if exists (select 1 from public.student_instructors where student_id = target_profile_id or instructor_id = target_profile_id)
     or exists (select 1 from public.workout_plans where student_id = target_profile_id or instructor_id = target_profile_id)
     or exists (select 1 from public.workout_sessions where student_id = target_profile_id)
     or exists (select 1 from public.body_metrics where student_id = target_profile_id)
     or exists (select 1 from public.exercises where created_by = target_profile_id) then
    raise exception 'Profile with training history or assignments cannot change role';
  end if;
  update public.profiles set role = target_role where id = target_profile_id;
end;
$$;

create or replace function public.admin_set_profile_status(target_profile_id uuid, target_status public.profile_status)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if target_profile_id = auth.uid() then raise exception 'Administrators cannot inactivate themselves'; end if;
  update public.profiles set status = target_status where id = target_profile_id and role in ('student', 'instructor');
  if not found then raise exception 'Student or instructor profile not found'; end if;
end;
$$;

create function public.protect_link_with_active_plan()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'DELETE' or (old.active and not new.active)) and exists (
    select 1 from public.workout_plans
    where student_id = old.student_id and instructor_id = old.instructor_id and status = 'active'
  ) then raise exception 'Archive the active plan before removing this assignment'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger student_instructors_protect_active_plan
  before update or delete on public.student_instructors
  for each row execute function public.protect_link_with_active_plan();

create function public.admin_set_instructor_link(target_student_id uuid, target_instructor_id uuid, target_active boolean)
returns uuid language plpgsql security invoker set search_path = public, auth as $$
declare assignment public.student_instructors%rowtype;
begin
  if not public.is_admin() or target_active is null then raise exception 'Not authorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_student_id::text, 70407));
  if not exists (select 1 from public.profiles where id = target_student_id and role = 'student')
     or not exists (select 1 from public.profiles where id = target_instructor_id and role = 'instructor') then
    raise exception 'A link requires a student and an instructor';
  end if;
  if target_active and (
    not exists (select 1 from public.profiles where id = target_student_id and status = 'active')
    or not exists (select 1 from public.profiles where id = target_instructor_id and status = 'active')
  ) then raise exception 'Both profiles must be active to assign'; end if;
  select * into assignment from public.student_instructors
    where student_id = target_student_id and instructor_id = target_instructor_id for update;
  if target_active then
    if found then
      if not assignment.active then
        update public.student_instructors set active = true, assigned_at = now() where id = assignment.id;
      end if;
      return assignment.id;
    end if;
    insert into public.student_instructors(student_id, instructor_id, active)
      values (target_student_id, target_instructor_id, true) returning id into assignment.id;
    return assignment.id;
  end if;
  if not found then raise exception 'Assignment not found'; end if;
  if assignment.active then
    update public.workout_plans set status = 'archived'
      where student_id = target_student_id and instructor_id = target_instructor_id and status = 'active';
    update public.student_instructors set active = false where id = assignment.id;
  end if;
  return assignment.id;
end;
$$;
revoke all on function public.admin_set_instructor_link(uuid, uuid, boolean), public.protect_link_with_active_plan() from public;
grant execute on function public.admin_set_instructor_link(uuid, uuid, boolean) to authenticated;

create function public.protect_prescribed_exercise()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.workout_exercises where exercise_id = old.id)
     and (new.name, new.description, new.muscle_group, new.secondary_muscles, new.equipment,
          new.difficulty, new.instructions, new.video_url, new.image_url, new.created_by, new.visibility)
       is distinct from
         (old.name, old.description, old.muscle_group, old.secondary_muscles, old.equipment,
          old.difficulty, old.instructions, old.video_url, old.image_url, old.created_by, old.visibility) then
    raise exception 'A prescribed exercise can only be archived or restored';
  end if;
  return new;
end;
$$;
create trigger exercises_protect_prescribed
  before update on public.exercises for each row execute function public.protect_prescribed_exercise();

create function public.audit_exercise_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit_event(case when tg_op = 'INSERT' then 'exercise.created' else 'exercise.updated' end, 'exercises', new.id);
  return new;
end;
$$;
create trigger exercises_audit after insert or update on public.exercises
  for each row execute function public.audit_exercise_change();
revoke all on function public.protect_prescribed_exercise(), public.audit_exercise_change() from public;

create function public.admin_dashboard_counts(since_at timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'students_total', (select count(*) from public.profiles where role = 'student'),
    'students_active', (select count(*) from public.profiles where role = 'student' and status = 'active'),
    'students_inactive', (select count(*) from public.profiles where role = 'student' and status = 'inactive'),
    'instructors_total', (select count(*) from public.profiles where role = 'instructor'),
    'instructors_active', (select count(*) from public.profiles where role = 'instructor' and status = 'active'),
    'students_linked', (select count(distinct student_id) from public.student_instructors where active),
    'students_unlinked', (select count(*) from public.profiles p where p.role = 'student'
      and not exists (select 1 from public.student_instructors si where si.student_id = p.id and si.active)),
    'plans_active', (select count(*) from public.workout_plans where status = 'active'),
    'sessions_completed', (select count(*) from public.workout_sessions
      where status = 'completed' and finished_at >= since_at)
  );
end;
$$;
create function public.admin_instructor_link_counts(target_ids uuid[])
returns table(instructor_id uuid, total bigint)
language plpgsql stable security invoker set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query select si.instructor_id, count(*) from public.student_instructors si
    where si.instructor_id = any(target_ids) and si.active group by si.instructor_id;
end;
$$;
revoke all on function public.admin_dashboard_counts(timestamptz), public.admin_instructor_link_counts(uuid[]) from public;
grant execute on function public.admin_dashboard_counts(timestamptz), public.admin_instructor_link_counts(uuid[]) to authenticated;

