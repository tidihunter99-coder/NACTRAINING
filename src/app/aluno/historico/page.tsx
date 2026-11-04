import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PageHeading, StudentCard, EmptyState } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getSessions } from "@/lib/student/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dateBR, decimalBR, timeBR } from "@/lib/student/format";
import type { WorkoutDayRow, WorkoutSetLogRow } from "@/types/database";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ periodo?: string; divisao?: string }> }) {
  const profile = await requireRole("student");
  const params = await searchParams;
  const sessions = (await getSessions(profile.id)).filter((item) => item.status === "completed");
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase indisponível");
  const dayIds = [...new Set(sessions.map((item) => item.workout_day_id))];
  const sessionIds = sessions.map((item) => item.id);
  const [{ data: dayData, error: dayError }, { data: logData, error: logError }] = await Promise.all([
    dayIds.length ? supabase.from("workout_days").select("*").in("id", dayIds) : Promise.resolve({ data: [], error: null }),
    sessionIds.length ? supabase.from("workout_set_logs").select("*").in("workout_session_id", sessionIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (dayError || logError) throw new Error("Não foi possível carregar o histórico");
  const days = (dayData ?? []) as WorkoutDayRow[];
  const logs = (logData ?? []) as WorkoutSetLogRow[];
  const dayMap = new Map(days.map((day) => [day.id, day]));
  const period = ["7", "30", "90"].includes(params.periodo ?? "") ? Number(params.periodo) : null;
  const cutoff = period ? Date.now() - period * 86400000 : null;
  const filtered = sessions.filter((session) => (!cutoff || new Date(session.finished_at ?? session.started_at).getTime() >= cutoff) && (!params.divisao || session.workout_day_id === params.divisao));
  return <>
    <PageHeading eyebrow="Atividades" title="Meu histórico" description="Consulte suas sessões concluídas e os resultados registrados. Exibindo até 200 sessões recentes." />
    <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-semibold">Período<select className="form-input mt-2" defaultValue={params.periodo ?? ""} name="periodo"><option value="">Todo o histórico</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label><label className="text-sm font-semibold">Divisão<select className="form-input mt-2" defaultValue={params.divisao ?? ""} name="divisao"><option value="">Todas</option>{days.map((day) => <option key={day.id} value={day.id}>{day.name}</option>)}</select></label><button className="button-secondary self-end" type="submit">Filtrar</button></form>
    {!filtered.length ? <EmptyState title="Nenhum treino neste período" description="As sessões concluídas aparecerão aqui. Ajuste os filtros se já tiver realizado treinos." action={<Link className="button-primary" href="/aluno/treinos">Ver minha ficha</Link>} /> : <div className="space-y-4">{filtered.map((session) => { const setLogs = logs.filter((log) => log.workout_session_id === session.id && log.completed); const exerciseCount = new Set(setLogs.map((log) => log.workout_exercise_id)).size; const loads = setLogs.map((log) => log.load_used).filter((value): value is number => value !== null); return <StudentCard key={session.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-nac-cyan"><CalendarDays size={15} /> {dateBR(session.finished_at ?? session.started_at)}</p><h2 className="mt-2 text-xl font-black">{dayMap.get(session.workout_day_id)?.name ?? "Treino"}</h2><p className="mt-2 text-sm text-nac-muted">{timeBR(session.started_at)} → {session.finished_at ? timeBR(session.finished_at) : "—"}</p><p className="mt-2 text-sm text-nac-muted">{exerciseCount} exercícios · {setLogs.length} séries registradas{loads.length ? ` · Cargas: ${loads.map((value) => `${decimalBR(value)} kg`).join(", ")}` : ""}</p></div><Link className="button-secondary" href={`/aluno/treino/${session.id}`}>Detalhes <ArrowRight size={16} /></Link></div></StudentCard>; })}</div>}
  </>;
}
