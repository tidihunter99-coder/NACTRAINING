import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { AdminMessage, ConfirmField, Pagination, StatusBadge } from "@/components/admin/ui";
import { EmptyState, PageHeading, StudentCard } from "@/components/student/ui";
import { enableInstructorAction } from "@/lib/admin/actions";
import { getInstructorCounts, getProfilesPage, safePage, safeSearch } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminTeachersPage({ searchParams }: { searchParams: Promise<{ pagina?: string; busca?: string; status?: string; erro?: string; salvo?: string }> }) {
  await requireRole("admin");
  const params = await searchParams; const page = safePage(params.pagina); const search = safeSearch(params.busca);
  const { rows, count } = await getProfilesPage("instructor", page, search, params.status);
  const counts = await getInstructorCounts(rows.map((row) => row.id));
  return <><PageHeading eyebrow="Gestão de equipe" title="Professores" description="Habilite contas confirmadas e acompanhe a situação e os vínculos da equipe." /><AdminMessage error={params.erro} saved={params.salvo} />
    <StudentCard className="mb-6"><h2 className="text-lg font-black">Habilitar professor</h2><p className="mt-2 text-sm text-nac-muted">A pessoa cria e confirma a própria conta. A administração informa o e-mail exato para atribuir o papel de professor. Contas com histórico de aluno não podem mudar de papel.</p><form action={enableInstructorAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-sm font-semibold">E-mail confirmado<input className="form-input mt-2" name="email" required type="email" /></label><div className="space-y-3 sm:self-end"><ConfirmField label="Confirmo a autorização para o papel de professor." /><button className="button-primary w-full" type="submit">Habilitar professor</button></div></form></StudentCard>
    <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px_auto]"><label className="text-sm font-semibold">Buscar por nome<div className="relative mt-2"><Search className="pointer-events-none absolute left-4 top-4 text-nac-muted" size={18} /><input className="form-input pl-11" defaultValue={search} name="busca" placeholder="Nome do professor" /></div></label><label className="text-sm font-semibold">Situação<select className="form-input mt-2" defaultValue={params.status || ""} name="status"><option value="">Todas</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label><button className="button-secondary self-end" type="submit">Aplicar</button></form>
    {!rows.length ? <EmptyState title="Nenhum professor encontrado" description="Ajuste a busca ou habilite uma conta confirmada." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <StudentCard key={row.id}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-lg font-black">{row.full_name || "Professor NAC"}</h2><p className="break-all text-xs text-nac-muted">{row.email}</p></div><StatusBadge active={row.status === "active"} /></div><p className="mt-5 border-t border-white/10 pt-4 text-sm"><span className="text-nac-muted">Alunos vinculados:</span> <strong>{counts.get(row.id) ?? 0}</strong></p><Link className="button-secondary mt-5 w-full" href={`/administracao/professores/${row.id}`}>Ver detalhes <ArrowRight size={16} /></Link></StudentCard>)}</div>}
    <Pagination page={page} count={count} path="/administracao/professores" params={{ busca: search, status: params.status }} />
  </>;
}
