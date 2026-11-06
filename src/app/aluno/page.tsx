import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, Clock3, Dumbbell, Flame, Play } from "lucide-react";
import { ExerciseCard } from "@/components/student/exercise-card";
import { EmptyState } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getActivePlan, getCompletedCount, getDayExercises, getFullProfile, getMetrics, getOpenSession, getSessions } from "@/lib/student/data";
import { dateBR, decimalBR, localDay, weekStart } from "@/lib/student/format";
import { startWorkoutAction } from "@/lib/student/actions";
import { safeMediaUrl } from "@/lib/student/exercise-visual";

export default async function StudentPage() {
  const profile = await requireRole("student");
  const [active, open, sessions, metrics, completedCount, fullProfile] = await Promise.all([getActivePlan(profile.id), getOpenSession(profile.id), getSessions(profile.id), getMetrics(profile.id), getCompletedCount(profile.id), getFullProfile(profile.id)]);
  const completed = sessions.filter((session) => session.status === "completed");
  const weeklyDays = new Set(completed.filter((session) => localDay(session.finished_at ?? session.started_at) >= weekStart()).map((session) => localDay(session.finished_at ?? session.started_at)));
  const day = active?.days.find((item) => item.id === open?.workout_day_id) ?? active?.days[0];
  const exercises = day ? await getDayExercises(day.id) : [];
  const series = exercises.reduce((sum, item) => sum + item.prescription.sets, 0);
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "aluno";
  const avatar = safeMediaUrl(fullProfile.avatar_url);
  return <div className="mx-auto max-w-5xl">
    <div className="student-intro mb-4 flex items-center gap-4"><div aria-hidden="true" className="student-avatar" style={avatar ? { backgroundImage: `url("${avatar.replaceAll('"', '%22')}")` } : undefined}>{avatar ? "" : firstName.charAt(0).toLocaleUpperCase("pt-BR")}</div><div className="min-w-0"><h1 className="text-xl font-black">Olá, {firstName}! <span aria-hidden="true">👋</span></h1><p className="text-sm text-[#b9d4e5]">Seu treino de hoje</p></div><Link aria-label="Ver histórico" className="student-calendar ml-auto rounded-xl border border-sky-500/50 p-2.5 text-sky-200" href="/aluno/historico"><CalendarDays size={20} /></Link></div>
    {active && day ? <><div className="student-workout-focus p-4"><p className="sr-only">{active.plan.title}</p><div className="relative flex items-center gap-3"><Dumbbell className="student-focus-icon" size={42} /><div><h2 className="text-2xl font-black">{day.name}</h2><p className="text-sm text-sky-100/80">{active.plan.objective || "Seu treino. Sua evolução."}</p></div></div></div><div className="student-workout-stats"><span>Exercícios: <strong>{exercises.length}</strong></span><span>Séries: <strong>{series}</strong></span>{day.estimated_duration && <span className="inline-flex items-center gap-1"><Clock3 size={18} /> ≈ {day.estimated_duration} min</span>}</div><div className="student-home-list space-y-2.5">{exercises.slice(0, 4).map(({ exercise, prescription }, index) => <ExerciseCard exercise={exercise} highlighted={index === 0} key={prescription.id} prescription={prescription} />)}</div>{open ? <Link className="student-yellow-action mt-4 w-full" href={`/aluno/treino/${open.id}`}><Play fill="currentColor" size={19} /> Continuar treino</Link> : exercises.length > 0 && <form action={startWorkoutAction} className="mt-4"><input name="dayId" type="hidden" value={day.id} /><button className="student-yellow-action w-full" type="submit"><Play fill="currentColor" size={19} /> Iniciar Treino</button></form>}</> : <EmptyState title="Sua ficha ainda não está disponível" description="Quando um professor ativar sua ficha, os treinos aparecerão aqui." />}
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="card-surface p-4"><Flame className="text-nac-cyan" size={21} /><p className="mt-3 text-2xl font-black">{completedCount}</p><p className="text-xs text-nac-muted">Treinos realizados</p></div><div className="card-surface p-4"><CalendarDays className="text-nac-cyan" size={21} /><p className="mt-3 text-2xl font-black">{weeklyDays.size}</p><p className="text-xs text-nac-muted">Dias nesta semana</p></div><div className="card-surface p-4"><Activity className="text-nac-cyan" size={21} /><p className="mt-3 text-2xl font-black">{metrics[0]?.weight_kg != null ? `${decimalBR(metrics[0].weight_kg)} kg` : "—"}</p><p className="text-xs text-nac-muted">Último peso registrado</p></div></div>
    <div className="card-surface mt-5 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-black">Sua evolução</h2><p className="mt-1 text-sm text-nac-muted">{metrics.length ? `Última medição em ${dateBR(metrics[0].recorded_at)}.` : "Registre suas medidas para acompanhar sua evolução."}</p></div><Link className="inline-flex items-center gap-2 font-bold text-nac-cyan" href="/aluno/evolucao">Ver evolução <ArrowRight size={17} /></Link></div><div className="mt-5 flex flex-wrap gap-4 text-sm font-bold"><Link className="text-sky-100" href="/aluno/exercicios">Biblioteca de exercícios →</Link><Link className="text-sky-100" href="/aluno/historico">Histórico de treinos →</Link></div>
  </div>;
}
