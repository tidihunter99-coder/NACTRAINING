import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Dumbbell, Play, Sparkles } from "lucide-react";
import { ExerciseCard } from "@/components/student/exercise-card";
import { EmptyState, Notice } from "@/components/student/ui";
import { startWorkoutAction } from "@/lib/student/actions";
import { getActivePlan, getDayExercises, getLogs, getOpenSession } from "@/lib/student/data";
import { requireRole } from "@/lib/auth/guard";

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ erro?: string; dia?: string }> }) {
  const profile = await requireRole("student");
  const [active, open, params] = await Promise.all([getActivePlan(profile.id), getOpenSession(profile.id), searchParams]);
  const days = active ? await Promise.all(active.days.map(async (day) => ({ day, exercises: await getDayExercises(day.id) }))) : [];
  const selected = days.find(({ day }) => day.id === params.dia) ?? days.find(({ day }) => day.id === open?.workout_day_id) ?? days[0];
  const logs = open && open.workout_day_id === selected?.day.id ? await getLogs(open.id) : [];
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "aluno";
  const series = selected?.exercises.reduce((sum, item) => sum + item.prescription.sets, 0) ?? 0;

  return <div className="mx-auto max-w-5xl">
    <div className="student-intro mb-5 flex items-center gap-4"><div aria-hidden="true" className="student-avatar">{firstName.charAt(0).toLocaleUpperCase("pt-BR")}</div><div className="min-w-0"><p className="text-xl font-black">Olá, {firstName}! <span aria-hidden="true">👋</span></p><p className="text-sm text-[#b9d4e5]">Seu treino de hoje</p></div><Link aria-label="Ver histórico" className="ml-auto rounded-xl border border-sky-500/50 p-2.5 text-sky-200" href="/aluno/historico"><CalendarDays size={20} /></Link></div>
    {params.erro && <Notice>Não foi possível iniciar o treino. Confira sua ficha e tente novamente.</Notice>}
    {!active || !selected ? <EmptyState title="Nenhuma ficha ativa" description="Sua ficha aparecerá aqui quando um professor da NAC Academia a ativar." action={<Link className="button-secondary" href="/aluno/exercicios">Explorar biblioteca</Link>} /> : <>
      <div className="student-workout-focus p-5"><p className="eyebrow">{active.plan.title}</p><div className="relative mt-2 flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-yellow-400/50 bg-yellow-400/10 text-nac-yellow"><Dumbbell size={31} /></div><div><h1 className="text-2xl font-black">{selected.day.name}</h1><p className="text-sm text-sky-100/80">{active.plan.objective || "Sua evolução começa agora"}</p></div></div><div className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-sky-300/20 pt-4 text-sm font-semibold"><span>Exercícios: <strong>{selected.exercises.length}</strong></span><span>Séries: <strong>{series}</strong></span>{selected.day.estimated_duration && <span className="inline-flex items-center gap-1 text-nac-yellow"><Clock3 size={17} /> ≈ {selected.day.estimated_duration} min</span>}</div></div>
      {days.length > 1 && <nav aria-label="Divisões da ficha" className="student-library-chips my-5 flex gap-2 overflow-x-auto pb-1">{days.map(({ day }, index) => <Link aria-current={day.id === selected.day.id ? "page" : undefined} className="student-library-chip shrink-0 rounded-full border border-sky-500/45 px-4 py-2 text-sm font-bold text-sky-100" href={`/aluno/treinos?dia=${day.id}`} key={day.id}>Treino {index + 1}</Link>)}</nav>}
      <div className="mt-5 space-y-2.5">{selected.exercises.length ? selected.exercises.map(({ prescription, exercise }, index) => <div key={prescription.id}><ExerciseCard completed={logs.filter((log) => log.workout_exercise_id === prescription.id && log.completed).length >= prescription.sets} exercise={exercise} highlighted={index === 0} prescription={prescription} />{exercise?.visual_review_status === "approved" && exercise.instructions && <details className="px-4 pt-1 text-xs text-sky-100/75"><summary className="cursor-pointer font-semibold text-nac-cyan">Instruções do exercício</summary><p className="mt-2 whitespace-pre-line">{exercise.instructions}</p></details>}</div>) : <EmptyState title="Divisão sem exercícios" description="Seu professor ainda não cadastrou exercícios nesta divisão." />}</div>
      <div className="mt-5">{open ? <Link className="student-yellow-action w-full" href={`/aluno/treino/${open.id}`}><Play fill="currentColor" size={19} /> Continuar treino</Link> : selected.exercises.length > 0 ? <form action={startWorkoutAction}><input name="dayId" type="hidden" value={selected.day.id} /><button className="student-yellow-action w-full" type="submit"><Play fill="currentColor" size={19} /> Iniciar treino</button></form> : null}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><Link className="inline-flex items-center gap-2 font-bold text-nac-cyan" href="/aluno/exercicios"><Sparkles size={16} /> Biblioteca de exercícios <ArrowRight size={15} /></Link><Link className="font-bold text-sky-100/75 hover:text-white" href="/aluno/historico">Ver histórico</Link></div>
    </>}
  </div>;
}
