-- Page-sized duplicate hints without loading the whole catalog into Next.js.
create index exercises_normalized_name_idx on public.exercises ((lower(btrim(name))));

create function public.admin_exercise_duplicate_counts(target_ids uuid[])
returns table(exercise_id uuid, duplicate_count bigint)
language plpgsql stable security invoker set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query select e.id, (select count(*) from public.exercises other
    where lower(btrim(other.name)) = lower(btrim(e.name)))
    from public.exercises e where e.id = any(target_ids);
end;
$$;
revoke all on function public.admin_exercise_duplicate_counts(uuid[]) from public;
grant execute on function public.admin_exercise_duplicate_counts(uuid[]) to authenticated;
