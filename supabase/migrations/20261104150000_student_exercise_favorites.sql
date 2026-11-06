create table public.student_exercise_favorites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, exercise_id)
);

create index student_exercise_favorites_exercise_idx on public.student_exercise_favorites (exercise_id);

alter table public.student_exercise_favorites enable row level security;
revoke all on public.student_exercise_favorites from anon, authenticated;
grant select, insert, delete on public.student_exercise_favorites to authenticated;

create policy favorites_select_own on public.student_exercise_favorites
  for select to authenticated
  using (student_id = auth.uid() and public.current_app_role() = 'student');

create policy favorites_insert_own_visible on public.student_exercise_favorites
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.current_app_role() = 'student'
    and exists (select 1 from public.exercises e where e.id = exercise_id and e.is_active)
  );

create policy favorites_delete_own on public.student_exercise_favorites
  for delete to authenticated
  using (student_id = auth.uid() and public.current_app_role() = 'student');
