-- NAC TRAINING — Mission 03
-- This migration is declarative only. It has not been applied to any Supabase project.
-- Apply it only to the dedicated NAC TRAINING development project after a review.

create type public.app_role as enum ('student', 'instructor', 'admin');
create type public.profile_status as enum ('active', 'inactive');
create type public.exercise_visibility as enum ('academy', 'instructor_only');
create type public.workout_plan_status as enum ('draft', 'active', 'archived');
create type public.workout_session_status as enum ('in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text,
  email text not null unique,
  phone text,
  avatar_url text,
  role public.app_role not null default 'student',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) between 1 and 160),
  constraint profiles_phone_length check (phone is null or char_length(phone) between 6 and 32),
  constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

create table public.student_instructors (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint student_instructors_distinct_users check (student_id <> instructor_id),
  constraint student_instructors_unique_pair unique (student_id, instructor_id)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  muscle_group text not null,
  secondary_muscles text[] not null default '{}',
  equipment text,
  difficulty text,
  instructions text,
  video_url text,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  visibility public.exercise_visibility not null default 'academy',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_length check (char_length(name) between 2 and 160),
  constraint exercises_description_length check (description is null or char_length(description) <= 4000),
  constraint exercises_allowed_muscle_group check (muscle_group in (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps',
    'hamstrings', 'glutes', 'calves', 'abdomen', 'core', 'full_body'
  )),
  constraint exercises_allowed_equipment check (equipment is null or equipment in (
    'dumbbells', 'barbells', 'machines', 'cables', 'bodyweight', 'bands', 'other'
  )),
  constraint exercises_difficulty check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint exercises_video_url_length check (video_url is null or char_length(video_url) <= 2048),
  constraint exercises_image_url_length check (image_url is null or char_length(image_url) <= 2048)
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  objective text,
  status public.workout_plan_status not null default 'draft',
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plans_title_length check (char_length(title) between 2 and 160),
  constraint workout_plans_date_range check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete restrict,
  name text not null,
  description text,
  display_order smallint not null,
  estimated_duration integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_days_name_length check (char_length(name) between 1 and 100),
  constraint workout_days_display_order check (display_order > 0),
  constraint workout_days_duration check (estimated_duration is null or estimated_duration between 1 and 600),
  constraint workout_days_unique_order unique (workout_plan_id, display_order)
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  display_order smallint not null,
  sets smallint not null,
  repetitions smallint not null,
  suggested_load numeric(7,2),
  rest_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_display_order check (display_order > 0),
  constraint workout_exercises_sets check (sets between 1 and 100),
  constraint workout_exercises_repetitions check (repetitions between 1 and 100),
  constraint workout_exercises_load check (suggested_load is null or suggested_load between 0 and 1000),
  constraint workout_exercises_rest check (rest_seconds is null or rest_seconds between 0 and 3600),
  constraint workout_exercises_notes_length check (notes is null or char_length(notes) <= 4000),
  constraint workout_exercises_unique_order unique (workout_day_id, display_order)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  workout_plan_id uuid not null references public.workout_plans(id) on delete restrict,
  workout_day_id uuid not null references public.workout_days(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status public.workout_session_status not null default 'in_progress',
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  constraint workout_sessions_finished_after_started check (finished_at is null or finished_at >= started_at),
  constraint workout_sessions_duration check (duration_seconds is null or duration_seconds between 0 and 86400),
  constraint workout_sessions_completion check (
    (status = 'in_progress' and finished_at is null) or
    (status in ('completed', 'cancelled') and finished_at is not null)
  ),
  constraint workout_sessions_notes_length check (notes is null or char_length(notes) <= 4000)
);

create table public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete restrict,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete restrict,
  set_number smallint not null,
  repetitions_completed smallint,
  load_used numeric(7,2),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workout_set_logs_set_number check (set_number between 1 and 100),
  constraint workout_set_logs_repetitions check (repetitions_completed is null or repetitions_completed between 0 and 100),
  constraint workout_set_logs_load check (load_used is null or load_used between 0 and 1000),
  constraint workout_set_logs_completion check ((completed and completed_at is not null) or (not completed and completed_at is null)),
  constraint workout_set_logs_unique_set unique (workout_session_id, workout_exercise_id, set_number)
);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  weight_kg numeric(6,2),
  waist_cm numeric(6,2),
  chest_cm numeric(6,2),
  arm_cm numeric(6,2),
  thigh_cm numeric(6,2),
  hip_cm numeric(6,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint body_metrics_recorded_at check (recorded_at >= timestamptz '2000-01-01 00:00:00+00'),
  constraint body_metrics_weight check (weight_kg is null or weight_kg between 1 and 500),
  constraint body_metrics_waist check (waist_cm is null or waist_cm between 1 and 500),
  constraint body_metrics_chest check (chest_cm is null or chest_cm between 1 and 500),
  constraint body_metrics_arm check (arm_cm is null or arm_cm between 1 and 500),
  constraint body_metrics_thigh check (thigh_cm is null or thigh_cm between 1 and 500),
  constraint body_metrics_hip check (hip_cm is null or hip_cm between 1 and 500),
  constraint body_metrics_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint audit_events_action_length check (char_length(action) between 3 and 120),
  constraint audit_events_entity_type_length check (char_length(entity_type) between 3 and 120)
);

create unique index workout_plans_one_active_per_student on public.workout_plans(student_id) where status = 'active';
create index student_instructors_student_active_idx on public.student_instructors(student_id) where active;
create index student_instructors_instructor_active_idx on public.student_instructors(instructor_id) where active;
create index exercises_created_by_idx on public.exercises(created_by);
create index workout_plans_student_status_idx on public.workout_plans(student_id, status, created_at desc);
create index workout_plans_instructor_idx on public.workout_plans(instructor_id, created_at desc);
create index workout_days_plan_idx on public.workout_days(workout_plan_id, display_order);
create index workout_exercises_day_idx on public.workout_exercises(workout_day_id, display_order);
create index workout_sessions_student_started_idx on public.workout_sessions(student_id, started_at desc);
create index workout_sessions_plan_day_idx on public.workout_sessions(workout_plan_id, workout_day_id);
create index workout_set_logs_session_idx on public.workout_set_logs(workout_session_id);
create index body_metrics_student_recorded_idx on public.body_metrics(student_id, recorded_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create trigger workout_plans_set_updated_at before update on public.workout_plans for each row execute function public.set_updated_at();
create trigger workout_days_set_updated_at before update on public.workout_days for each row execute function public.set_updated_at();
create trigger workout_exercises_set_updated_at before update on public.workout_exercises for each row execute function public.set_updated_at();

-- Role is deliberately omitted from metadata: every self-service sign-up starts as student.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email,
    'student',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.validate_student_instructor()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  student_role public.app_role;
  instructor_role public.app_role;
begin
  select role into student_role from public.profiles where id = new.student_id;
  select role into instructor_role from public.profiles where id = new.instructor_id;
  if student_role is distinct from 'student' or instructor_role is distinct from 'instructor' then
    raise exception 'A student-instructor link must reference a student and an instructor';
  end if;
  return new;
end;
$$;

create trigger student_instructors_validate before insert or update on public.student_instructors for each row execute function public.validate_student_instructor();

create function public.validate_workout_plan()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  student_role public.app_role;
  instructor_role public.app_role;
begin
  select role into student_role from public.profiles where id = new.student_id;
  select role into instructor_role from public.profiles where id = new.instructor_id;
  if student_role is distinct from 'student' or instructor_role is distinct from 'instructor' then
    raise exception 'A workout plan must reference a student and an instructor';
  end if;
  if not exists (
    select 1 from public.student_instructors si
    where si.student_id = new.student_id and si.instructor_id = new.instructor_id and si.active
  ) then
    raise exception 'A workout plan instructor must be actively assigned to the student';
  end if;
  if new.status = 'active' and not exists (
    select 1 from public.workout_days wd
    join public.workout_exercises we on we.workout_day_id = wd.id
    where wd.workout_plan_id = new.id
  ) then
    raise exception 'An active workout plan must contain at least one prescribed exercise';
  end if;
  return new;
end;
$$;

create trigger workout_plans_validate before insert or update on public.workout_plans for each row execute function public.validate_workout_plan();

create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.status = 'active'
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create function public.is_active_instructor_for(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.student_instructors si
    join public.profiles instructor on instructor.id = si.instructor_id
    where si.student_id = target_student_id
      and si.instructor_id = auth.uid()
      and si.active
      and instructor.role = 'instructor'
      and instructor.status = 'active'
      and exists (select 1 from public.profiles student where student.id = si.student_id and student.role = 'student' and student.status = 'active')
  )
$$;

create function public.can_manage_workout_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_plans wp
    where wp.id = target_plan_id
      and wp.instructor_id = auth.uid()
      and public.is_active_instructor_for(wp.student_id)
  ) or public.is_admin()
$$;

create function public.can_edit_draft_workout_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_plans wp
    where wp.id = target_plan_id and wp.status = 'draft'
  ) and public.can_manage_workout_plan(target_plan_id)
$$;

create function public.can_view_workout_plan(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_plans wp
    where wp.id = target_plan_id
      and ((wp.student_id = auth.uid() and wp.status = 'active') or public.can_manage_workout_plan(wp.id))
  )
$$;

create function public.owns_open_workout_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.workout_sessions ws
    where ws.id = target_session_id and ws.student_id = auth.uid() and ws.status = 'in_progress'
  )
$$;

create function public.validate_workout_session()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  plan_student_id uuid;
  day_plan_id uuid;
  plan_status public.workout_plan_status;
begin
  select student_id, status into plan_student_id, plan_status from public.workout_plans where id = new.workout_plan_id;
  select workout_plan_id into day_plan_id from public.workout_days where id = new.workout_day_id;
  if plan_student_id is null or day_plan_id is null or plan_student_id <> new.student_id or day_plan_id <> new.workout_plan_id then
    raise exception 'Workout session references must belong to the same student, plan, and workout day';
  end if;
  if plan_status <> 'active' then
    raise exception 'Workout sessions can only be created for active workout plans';
  end if;
  if tg_op = 'UPDATE' and (new.student_id, new.workout_plan_id, new.workout_day_id) is distinct from (old.student_id, old.workout_plan_id, old.workout_day_id) then
    raise exception 'A workout session cannot be reassigned';
  end if;
  if tg_op = 'UPDATE' and old.status in ('completed', 'cancelled') and new.status <> old.status then
    raise exception 'A completed or cancelled workout session cannot be reopened';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_validate before insert or update on public.workout_sessions for each row execute function public.validate_workout_session();

create function public.validate_workout_set_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_day_id uuid;
  exercise_day_id uuid;
  prescribed_sets smallint;
begin
  select workout_day_id into session_day_id from public.workout_sessions where id = new.workout_session_id;
  select workout_day_id, sets into exercise_day_id, prescribed_sets from public.workout_exercises where id = new.workout_exercise_id;
  if session_day_id is null or exercise_day_id is null or session_day_id <> exercise_day_id then
    raise exception 'A set log exercise must belong to the workout session day';
  end if;
  if new.set_number > prescribed_sets then
    raise exception 'Set number exceeds the prescribed number of sets';
  end if;
  if tg_op = 'UPDATE' and (new.workout_session_id, new.workout_exercise_id, new.set_number) is distinct from (old.workout_session_id, old.workout_exercise_id, old.set_number) then
    raise exception 'A recorded set cannot be reassigned';
  end if;
  return new;
end;
$$;

create trigger workout_set_logs_validate before insert or update on public.workout_set_logs for each row execute function public.validate_workout_set_log();

create function public.validate_body_metric_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner_role public.app_role;
begin
  select role into owner_role from public.profiles where id = new.student_id;
  if owner_role is distinct from 'student' then
    raise exception 'Body metrics can only belong to student profiles';
  end if;
  return new;
end;
$$;

create trigger body_metrics_validate before insert or update on public.body_metrics for each row execute function public.validate_body_metric_owner();

create function public.protect_profile_sensitive_fields()
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
     and current_user not in ('postgres', 'service_role')
     and not public.is_admin() then
    raise exception 'Role and profile status require an authorized administrative operation';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_sensitive_fields before update on public.profiles for each row execute function public.protect_profile_sensitive_fields();

create function public.write_audit_event(a_action text, a_entity_type text, a_entity_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.audit_events(actor_id, action, entity_type, entity_id)
  values (auth.uid(), a_action, a_entity_type, a_entity_id);
end;
$$;

create function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    perform public.write_audit_event('profile.role_changed', 'profiles', new.id);
  end if;
  if new.status is distinct from old.status then
    perform public.write_audit_event('profile.status_changed', 'profiles', new.id);
  end if;
  return new;
end;
$$;

create trigger profiles_audit after update on public.profiles for each row execute function public.audit_profile_change();

create function public.audit_student_instructor_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_event('student_instructor.' || lower(tg_op), 'student_instructors', coalesce(new.id, old.id));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger student_instructors_audit after insert or update or delete on public.student_instructors for each row execute function public.audit_student_instructor_change();

create function public.audit_workout_plan_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.write_audit_event('workout_plan.status_changed', 'workout_plans', new.id);
  end if;
  return new;
end;
$$;

create trigger workout_plans_audit after update on public.workout_plans for each row execute function public.audit_workout_plan_status_change();

-- Explicit, audited administrative RPCs. No client can change role through a normal profile update.
create function public.admin_assign_role(target_profile_id uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set role = target_role where id = target_profile_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

create function public.admin_set_profile_status(target_profile_id uuid, target_status public.profile_status)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set status = target_status where id = target_profile_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.student_instructors enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_set_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, update (full_name, phone, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.student_instructors to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update on public.workout_plans, public.workout_days, public.workout_exercises to authenticated;
grant select, insert, update on public.workout_sessions, public.workout_set_logs, public.body_metrics to authenticated;
grant select on public.audit_events to authenticated;
revoke all on function public.current_app_role(), public.is_admin(), public.is_active_instructor_for(uuid), public.can_manage_workout_plan(uuid), public.can_edit_draft_workout_plan(uuid), public.can_view_workout_plan(uuid), public.owns_open_workout_session(uuid), public.admin_assign_role(uuid, public.app_role), public.admin_set_profile_status(uuid, public.profile_status) from public;
grant execute on function public.current_app_role(), public.is_admin(), public.is_active_instructor_for(uuid), public.can_manage_workout_plan(uuid), public.can_edit_draft_workout_plan(uuid), public.can_view_workout_plan(uuid), public.owns_open_workout_session(uuid), public.admin_assign_role(uuid, public.app_role), public.admin_set_profile_status(uuid, public.profile_status) to authenticated;
revoke all on function public.handle_new_user(), public.set_updated_at(), public.validate_student_instructor(), public.validate_workout_plan(), public.validate_workout_session(), public.validate_workout_set_log(), public.validate_body_metric_owner(), public.protect_profile_sensitive_fields(), public.write_audit_event(text, text, uuid), public.audit_profile_change(), public.audit_student_instructor_change(), public.audit_workout_plan_status_change() from public;

create policy profiles_select_authorized on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_active_instructor_for(id) or public.is_admin()
);
create policy profiles_update_self_basic_fields on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy student_instructors_select_authorized on public.student_instructors for select to authenticated using (
  student_id = auth.uid() or instructor_id = auth.uid() or public.is_admin()
);
create policy student_instructors_admin_insert on public.student_instructors for insert to authenticated with check (public.is_admin());
create policy student_instructors_admin_update on public.student_instructors for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy student_instructors_admin_delete on public.student_instructors for delete to authenticated using (public.is_admin());

create policy exercises_select_authorized on public.exercises for select to authenticated using (
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
);
create policy exercises_instructor_insert on public.exercises for insert to authenticated with check (
  public.is_admin() or (public.current_app_role() = 'instructor' and created_by = auth.uid())
);
create policy exercises_owner_update on public.exercises for update to authenticated using (
  public.is_admin() or (public.current_app_role() = 'instructor' and created_by = auth.uid())
) with check (
  public.is_admin() or (public.current_app_role() = 'instructor' and created_by = auth.uid())
);
create policy exercises_owner_delete on public.exercises for delete to authenticated using (
  public.is_admin() or (public.current_app_role() = 'instructor' and created_by = auth.uid())
);

create policy workout_plans_select_authorized on public.workout_plans for select to authenticated using (
  (student_id = auth.uid() and status = 'active') or public.can_manage_workout_plan(id)
);
create policy workout_plans_instructor_insert on public.workout_plans for insert to authenticated with check (
  public.is_admin() or (instructor_id = auth.uid() and public.current_app_role() = 'instructor' and public.is_active_instructor_for(student_id))
);
create policy workout_plans_instructor_update on public.workout_plans for update to authenticated using (public.can_manage_workout_plan(id)) with check (
  public.is_admin() or (instructor_id = auth.uid() and public.current_app_role() = 'instructor' and public.is_active_instructor_for(student_id))
);

create policy workout_days_select_authorized on public.workout_days for select to authenticated using (public.can_view_workout_plan(workout_plan_id));
create policy workout_days_draft_write on public.workout_days for insert to authenticated with check (public.can_edit_draft_workout_plan(workout_plan_id));
create policy workout_days_draft_update on public.workout_days for update to authenticated using (public.can_edit_draft_workout_plan(workout_plan_id)) with check (public.can_edit_draft_workout_plan(workout_plan_id));

create policy workout_exercises_select_authorized on public.workout_exercises for select to authenticated using (
  exists (select 1 from public.workout_days wd where wd.id = workout_exercises.workout_day_id and public.can_view_workout_plan(wd.workout_plan_id))
);
create policy workout_exercises_draft_insert on public.workout_exercises for insert to authenticated with check (
  exists (select 1 from public.workout_days wd where wd.id = workout_exercises.workout_day_id and public.can_edit_draft_workout_plan(wd.workout_plan_id))
);
create policy workout_exercises_draft_update on public.workout_exercises for update to authenticated using (
  exists (select 1 from public.workout_days wd where wd.id = workout_exercises.workout_day_id and public.can_edit_draft_workout_plan(wd.workout_plan_id))
) with check (
  exists (select 1 from public.workout_days wd where wd.id = workout_exercises.workout_day_id and public.can_edit_draft_workout_plan(wd.workout_plan_id))
);

create policy workout_sessions_select_authorized on public.workout_sessions for select to authenticated using (
  student_id = auth.uid() or public.is_active_instructor_for(student_id) or public.is_admin()
);
create policy workout_sessions_student_insert on public.workout_sessions for insert to authenticated with check (
  student_id = auth.uid() and status = 'in_progress' and exists (
    select 1 from public.workout_plans wp where wp.id = workout_plan_id and wp.student_id = auth.uid() and wp.status = 'active'
  )
);
create policy workout_sessions_student_update on public.workout_sessions for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy workout_set_logs_select_authorized on public.workout_set_logs for select to authenticated using (
  exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_set_logs.workout_session_id
      and (ws.student_id = auth.uid() or public.is_active_instructor_for(ws.student_id) or public.is_admin())
  )
);
create policy workout_set_logs_student_insert on public.workout_set_logs for insert to authenticated with check (public.owns_open_workout_session(workout_session_id));
create policy workout_set_logs_student_update on public.workout_set_logs for update to authenticated using (public.owns_open_workout_session(workout_session_id)) with check (public.owns_open_workout_session(workout_session_id));

-- Health-adjacent measurements: administrators intentionally receive no blanket policy.
create policy body_metrics_select_limited on public.body_metrics for select to authenticated using (
  student_id = auth.uid() or public.is_active_instructor_for(student_id)
);
create policy body_metrics_student_insert on public.body_metrics for insert to authenticated with check (student_id = auth.uid());
create policy body_metrics_student_update on public.body_metrics for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy audit_events_admin_select on public.audit_events for select to authenticated using (public.is_admin());
