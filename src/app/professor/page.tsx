import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarCheck, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import { EmptyState, PageHeading, StudentCard } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getLinkedSummary } from "@/lib/instructor/data";
import { dateBR, timeBR } from "@/lib/student/format";

export default async function InstructorPage() {
  const instructor = await requireRole("instructor");
  const { students, activePlans, recentSessions, completedCount } = await getLinkedSummary(instructor.id);
  const activeIds = new Set(activePlans.map((plan) => plan.student_id));
  const recentIds = new Set(recentSessions.filter((session) => session.finished_at && Date.now() - new Date(session.finished_at).getTime() <= 14 * 86400000).map((session) => session.student_id));
  const needsFollowUp = students.filter((item) => !activeIds.has(item.profile.id) || !recentIds.has(item.profile.id));
  const firstName = instructor.full_name?.trim().split(/\s+/)[0] || "professor(a)";
  return <>
    <PageHeading eyebrow="Painel do professor" title={`Olá, ${firstName}!`} description="Acompanhe os alunos vinculados, prepare fichas e consulte atividades registradas." action={<Link className="button-primary" href="/professor/alunos"><UsersRound size={17} /> Meus alunos</Link>} />
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StudentCard><UsersRound className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{students.length}</p><p className="mt-1 text-sm text-nac-muted">Alunos vinculados</p></StudentCard>
      <StudentCard><UserRoundCheck className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{activeIds.size}</p><p className="mt-1 text-sm text-nac-muted">Com ficha ativa</p></StudentCard>
      <StudentCard><UserRoundX className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{students.length - activeIds.size}</p><p className="mt-1 text-sm text-nac-muted">Sem ficha ativa</p></StudentCard>
      <StudentCard><CalendarCheck className="text-nac-cyan" size={22} /><p className="mt-5 text-3xl font-black">{completedCount}</p><p className="mt-1 text-sm text-nac-muted">Treinos concluídos</p></StudentCard>
    </div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]"><StudentCard><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Últimas atividades</h2><Link className="text-sm font-bold text-nac-cyan" href="/professor/alunos">Ver alunos <ArrowRight className="inline" size={15} /></Link></div>{recentSessions.length ? <ol className="mt-4 divide-y divide-white/10">{recentSessions.slice(0, 5).map((session) => { const student = students.find((item) => item.profile.id === session.student_id); return <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={session.id}><div><p className="font-semibold">{student?.profile.full_name || "Aluno"}</p><p className="text-xs text-nac-muted">{dateBR(session.finished_at ?? session.started_at)} · {timeBR(session.finished_at ?? session.started_at)}</p></div><Link className="text-sm font-bold text-nac-cyan" href={`/professor/alunos/${session.student_id}/sessoes/${session.id}`}>Detalhes</Link></li>; })}</ol> : <p className="mt-4 text-sm text-nac-muted">Nenhum treino concluído pelos alunos vinculados.</p>}</StudentCard><StudentCard><BookOpenText className="text-nac-cyan" size={23} /><h2 className="mt-3 text-lg font-black">Acompanhamento</h2><p className="mt-2 text-sm leading-6 text-nac-muted">{needsFollowUp.length} {needsFollowUp.length === 1 ? "aluno está" : "alunos estão"} sem ficha ativa ou sem treino concluído nos últimos 14 dias. Este é um filtro informativo, sem meta prescrita.</p><div className="mt-4 space-y-2">{needsFollowUp.slice(0, 4).map((item) => <Link className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-nac-cyan" href={`/professor/alunos/${item.profile.id}`} key={item.profile.id}>{item.profile.full_name || item.profile.email}<ArrowRight size={15} /></Link>)}</div>{students.length === 0 && <p className="mt-4 text-sm text-nac-muted">Os vínculos são gerenciados pela administração da academia.</p>}</StudentCard></div>
    {!students.length && <div className="mt-6"><EmptyState title="Nenhum aluno vinculado" description="Quando a administração estabelecer um vínculo ativo, você poderá acompanhar o aluno e criar suas fichas aqui." /></div>}
  </>;
}
