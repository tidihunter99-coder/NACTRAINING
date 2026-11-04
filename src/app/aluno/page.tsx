import Link from "next/link";
import { Activity, ArrowRight, CalendarCheck, Dumbbell, Flame, Play } from "lucide-react";
import { PageHeading, StudentCard, EmptyState } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getActivePlan, getCompletedCount, getDay, getMetrics, getOpenSession, getSessions } from "@/lib/student/data";
import { dateBR, decimalBR, localDay, weekStart } from "@/lib/student/format";

export default async function StudentPage() {
  const profile = await requireRole("student");
  const [active, open, sessions, metrics, completedCount] = await Promise.all([getActivePlan(profile.id), getOpenSession(profile.id), getSessions(profile.id), getMetrics(profile.id), getCompletedCount(profile.id)]);
  const completed = sessions.filter((session) => session.status === "completed");
  const weeklyDays = new Set(completed.filter((session) => localDay(session.finished_at ?? session.started_at) >= weekStart()).map((session) => localDay(session.finished_at ?? session.started_at)));
  const latestMetric = metrics[0];
  const openDay = open ? await getDay(open.workout_day_id) : null;
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "aluno";
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return <>
    <PageHeading eyebrow={dateBR(new Date())} title={`${greeting}, ${firstName}!`} description="Seu espaço para treinar, registrar resultados e acompanhar sua evolução." />
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StudentCard><CalendarCheck className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{completedCount}</p><p className="mt-1 text-sm text-nac-muted">Treinos realizados</p></StudentCard>
      <StudentCard><Flame className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{weeklyDays.size}</p><p className="mt-1 text-sm text-nac-muted">Dias de treino nesta semana</p></StudentCard>
      <StudentCard><Dumbbell className="text-nac-cyan" size={22} /><p className="mt-5 break-words text-lg font-black leading-tight sm:text-xl">{openDay?.name || active?.plan.title || "Sem ficha"}</p><p className="mt-1 text-sm text-nac-muted">{open ? "Treino em andamento" : "Ficha atual"}</p></StudentCard>
      <StudentCard><Activity className="text-nac-cyan" size={22} /><p className="mt-5 text-2xl font-black">{latestMetric?.weight_kg != null ? `${decimalBR(latestMetric.weight_kg)} kg` : "—"}</p><p className="mt-1 text-sm text-nac-muted">{latestMetric?.weight_kg != null ? "Último peso registrado" : "Sem peso registrado"}</p></StudentCard>
    </div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      {open ? <StudentCard className="border-nac-electric/40 bg-gradient-to-br from-nac-deep to-nac-navy"><p className="eyebrow">Continue de onde parou</p><h2 className="mt-2 text-2xl font-black">{openDay?.name || "Treino em andamento"}</h2><p className="mt-2 text-sm text-nac-muted">Iniciado em {dateBR(open.started_at)}. Seus registros estão salvos.</p><Link className="button-primary mt-6" href={`/aluno/treino/${open.id}`}><Play size={18} /> Continuar treino</Link></StudentCard> : active ? <StudentCard className="border-nac-electric/40 bg-gradient-to-br from-nac-deep to-nac-navy"><p className="eyebrow">Minha ficha</p><h2 className="mt-2 text-2xl font-black">{active.plan.title}</h2><p className="mt-2 text-sm text-nac-muted">{active.days.length} {active.days.length === 1 ? "divisão disponível" : "divisões disponíveis"}. Escolha uma divisão para começar.</p><Link className="button-primary mt-6" href="/aluno/treinos"><Dumbbell size={18} /> Ver minha ficha</Link></StudentCard> : <EmptyState title="Sua ficha ainda não está disponível" description="Quando um professor ativar sua ficha, os treinos aparecerão aqui." />}
      <StudentCard><h2 className="text-lg font-bold">Sua evolução</h2><p className="mt-3 text-sm leading-6 text-nac-muted">{metrics.length ? `${metrics.length} ${metrics.length === 1 ? "registro de medidas" : "registros de medidas"}. Última medição em ${dateBR(metrics[0].recorded_at)}.` : "Registre suas medidas para acompanhar as mudanças ao longo do tempo."}</p><Link className="mt-5 inline-flex items-center gap-2 font-bold text-nac-cyan hover:text-white" href="/aluno/evolucao">Ver evolução <ArrowRight size={16} /></Link>{completed[0] && <div className="mt-5 border-t border-white/10 pt-4 text-sm text-nac-muted">Último treino concluído: <span className="text-white">{dateBR(completed[0].finished_at ?? completed[0].started_at)}</span></div>}</StudentCard>
    </div>
  </>;
}
