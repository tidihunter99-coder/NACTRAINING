import { AdminMessage, Pagination } from "@/components/admin/ui";
import { EmptyState, PageHeading, StudentCard } from "@/components/student/ui";
import { getAuditPage, safePage } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guard";
import { dateBR, timeBR } from "@/lib/student/format";

const labels: Record<string, string> = {
  "admin.bootstrap": "Primeiro administrador provisionado",
  "profile.role_changed": "Papel alterado", "profile.status_changed": "Situação alterada",
  "student_instructor.insert": "Vínculo criado", "student_instructor.update": "Vínculo atualizado", "student_instructor.delete": "Vínculo removido",
  "workout_plan.status_changed": "Situação da ficha alterada", "exercise.created": "Exercício criado", "exercise.updated": "Exercício atualizado",
};
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ pagina?: string; acao?: string; erro?: string }> }) {
  await requireRole("admin"); const params = await searchParams; const page = safePage(params.pagina);
  const action = labels[params.acao || ""] ? params.acao || "" : "";
  const { rows, actors, count } = await getAuditPage(page, action);
  const byId = new Map(actors.map((actor) => [actor.id, actor.full_name || actor.email]));
  return <><PageHeading eyebrow="Rastreabilidade" title="Auditoria" description="Eventos administrativos e alterações relevantes. Os registros não contêm senhas, tokens nem detalhes de saúde." /><AdminMessage error={params.erro} />
    <form className="mb-5 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Tipo de evento<select className="form-input mt-2 min-w-56" defaultValue={action} name="acao"><option value="">Todos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="button-secondary" type="submit">Filtrar</button></form>
    {!rows.length ? <EmptyState title="Nenhum evento encontrado" description="Os eventos de alteração aparecerão aqui após ações registradas no banco." /> : <StudentCard><div className="divide-y divide-white/10">{rows.map((row) => <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_1fr_auto]" key={row.id}><div><p className="font-bold">{labels[row.action] || row.action}</p><p className="mt-1 break-all text-xs text-nac-muted">{row.entity_type} · {row.entity_id}</p></div><div><p>{row.actor_id ? byId.get(row.actor_id) || "Conta removida" : "Sistema"}</p><p className="mt-1 break-all text-xs text-nac-muted">{row.operator_reference ? `Referência operacional: ${row.operator_reference}` : row.actor_id || "Sem ator autenticado"}</p></div><time className="text-xs text-nac-muted" dateTime={row.created_at}>{dateBR(row.created_at)} · {timeBR(row.created_at)}</time></div>)}</div></StudentCard>}
    <Pagination page={page} count={count} path="/administracao/auditoria" params={{ acao: action }} />
  </>;
}
