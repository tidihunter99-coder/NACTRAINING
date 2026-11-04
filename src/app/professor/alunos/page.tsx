import Link from "next/link";
import { ArrowRight, Search, UserRound } from "lucide-react";
import { EmptyState, Notice, PageHeading, StudentCard } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getLinkedSummary } from "@/lib/instructor/data";
import { dateBR } from "@/lib/student/format";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ busca?: string; filtro?: string; erro?: string }> }) {
  const instructor = await requireRole("instructor");
  const { students, activePlans, recentSessions } = await getLinkedSummary(instructor.id);
  const params = await searchParams;
  const query = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const activeByStudent = new Map(activePlans.map((plan) => [plan.student_id, plan]));
  const lastByStudent = new Map<string, (typeof recentSessions)[number]>();
  for (const session of recentSessions) if (!lastByStudent.has(session.student_id)) lastByStudent.set(session.student_id, session);
  const filtered = students.filter(({ profile }) => {
    if (query && !`${profile.full_name ?? ""} ${profile.email}`.toLocaleLowerCase("pt-BR").includes(query)) return false;
    if (params.filtro === "com-ficha" && !activeByStudent.has(profile.id)) return false;
    if (params.filtro === "sem-ficha" && activeByStudent.has(profile.id)) return false;
    if (params.filtro === "sem-treino-14" && lastByStudent.get(profile.id)?.finished_at && Date.now() - new Date(lastByStudent.get(profile.id)!.finished_at!).getTime() <= 14 * 86400000) return false;
    return true;
  });
  return <>
    <PageHeading eyebrow="Vínculos ativos" title="Meus alunos" description="Veja somente os alunos vinculados à sua conta. Os vínculos são administrados pela NAC Academia." />
    {params.erro && <Notice>Não foi possível concluir a operação. Confira seu vínculo com o aluno e tente novamente.</Notice>}
    <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_230px_auto]"><label className="text-sm font-semibold">Buscar por nome ou e-mail<div className="relative mt-2"><Search className="pointer-events-none absolute left-4 top-4 text-nac-muted" size={18} /><input className="form-input pl-11" defaultValue={params.busca ?? ""} name="busca" placeholder="Nome do aluno" /></div></label><label className="text-sm font-semibold">Filtrar<select className="form-input mt-2" defaultValue={params.filtro ?? ""} name="filtro"><option value="">Todos</option><option value="com-ficha">Com ficha ativa</option><option value="sem-ficha">Sem ficha ativa</option><option value="sem-treino-14">Sem treino nos últimos 14 dias</option></select></label><button className="button-secondary self-end" type="submit">Aplicar</button></form>
    {!filtered.length ? <EmptyState title="Nenhum aluno encontrado" description={students.length ? "Ajuste a busca ou o filtro para ver seus alunos vinculados." : "Ainda não há alunos vinculados à sua conta."} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(({ link, profile }) => { const plan = activeByStudent.get(profile.id); const last = lastByStudent.get(profile.id); return <StudentCard key={profile.id}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nac-electric/15 text-nac-cyan"><UserRound size={20} /></div><div className="min-w-0"><h2 className="break-words text-lg font-black">{profile.full_name || "Aluno NAC"}</h2><p className="break-all text-xs text-nac-muted">{profile.email}</p></div></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm"><p><span className="text-nac-muted">Vínculo:</span> <span className="font-semibold text-green-300">Ativo desde {dateBR(link.assigned_at)}</span></p><p><span className="text-nac-muted">Ficha ativa:</span> <span className="font-semibold">{plan?.title ?? "Nenhuma"}</span></p><p><span className="text-nac-muted">Último treino:</span> <span className="font-semibold">{last ? dateBR(last.finished_at ?? last.started_at) : "Nenhum concluído"}</span></p></div><div className="mt-5 flex flex-wrap gap-2"><Link className="button-primary flex-1" href={`/professor/alunos/${profile.id}`}>Ver aluno <ArrowRight size={16} /></Link><Link className="button-secondary flex-1" href={`/professor/alunos/${profile.id}#historico`}>Histórico</Link></div></StudentCard>; })}</div>}
  </>;
}
