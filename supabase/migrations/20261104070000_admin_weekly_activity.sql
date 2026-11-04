-- Aggregate only completed sessions for the administrative overview.
create function public.admin_completed_weekly()
returns table(week_start date, total bigint)
language plpgsql stable security invoker set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query select date_trunc('week', ws.finished_at at time zone 'America/Sao_Paulo')::date,
    count(*) from public.workout_sessions ws
    where ws.status = 'completed' and ws.finished_at >= now() - interval '8 weeks'
    group by 1 order by 1;
end;
$$;
revoke all on function public.admin_completed_weekly() from public;
grant execute on function public.admin_completed_weekly() to authenticated;
