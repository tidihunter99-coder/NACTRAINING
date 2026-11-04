import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { AdminMessage, Pagination, StatusBadge } from "@/components/admin/ui";
import { EmptyState, PageHeading, StudentCard } from "@/components/student/ui";
import { getProfilesPage, getStudentListExtras, safePage, safeSearch } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ pagina?: string; busca?: string; status?: string; erro?: string; salvo?: string }> }) {
  await requireRole("admin");
  const params = await searchParams; const page = safePage(params.pagina); const search = safeSearch(params.busca);
  const { rows, count } = await getProfilesPage("student", page, search, params.status);
  const { links, teachers, plans } = await getStudentListExtras(rows.map((row) => row.id));
  const teacherNames = new Map(teachers.map((row) => [row.id, row.full_name || row.email]));
  return <><PageHeading eyebrow="Gestão de pessoas" title="Alunos" description="Contas e vínculos autorizados. Nenhuma medida física ou série individual é exibida nesta área." /><AdminMessage error={params.erro} saved={params.salvo} />
    <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><label className="text-sm font-semibold">Buscar por nome<div className="relative mt-2"><Search className="pointer-events-none absolute left-4 top-4 text-nac-muted" size={18} /><input className="form-input pl-11" defaultValue={search} name="busca" placeholder="Nome do aluno" /></div></label><label className="text-sm font-semibold">Situação<select className="form-input mt-2" defaultValue={params.status || ""} name="status"><option value="">Todas</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label><button className="button-secondary self-end" type="submit">Aplicar</button></form>
    {!rows.length ? <EmptyState title="Nenhum aluno encontrado" description="Ajuste a busca ou aguarde o cadastro de alunos." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => { const assigned = links.filter((link) => link.student_id === row.id); const plan = plans.find((item) => item.student_id === row.id); return <StudentCard key={row.id}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-lg font-black">{row.full_name || "Aluno NAC"}</h2><p className="break-all text-xs text-nac-muted">{row.email}</p></div><StatusBadge active={row.status === "active"} /></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm"><p><span className="text-nac-muted">Professores:</span> {assigned.length ? assigned.map((link) => teacherNames.get(link.instructor_id) || "Professor").join(", ") : "Nenhum vínculo ativo"}</p><p><span className="text-nac-muted">Ficha ativa:</span> {plan?.title || "Nenhuma"}</p></div><Link className="button-secondary mt-5 w-full" href={`/administracao/alunos/${row.id}`}>Ver detalhes <ArrowRight size={16} /></Link></StudentCard>; })}</div>}
    <Pagination page={page} count={count} path="/administracao/alunos" params={{ busca: search, status: params.status }} />
  </>;
}
