import { Pagination as ListPagination } from "@/components/ui/pagination";
import { Notice } from "@/components/student/ui";

export function AdminMessage({ error, saved }: { error?: string; saved?: string }) {
  if (error) return <Notice>Não foi possível concluir a operação ({error}). Confira os dados e as permissões antes de tentar novamente.</Notice>;
  if (saved) return <Notice success>Alteração salva e registrada.</Notice>;
  return null;
}
export function ConfirmField({ label }: { label: string }) {
  return <label className="flex items-start gap-2 text-xs leading-5 text-nac-muted"><input className="mt-1 accent-nac-electric" name="confirm" required type="checkbox" value="yes" /><span>{label}</span></label>;
}
export function Pagination({ page, count, path, params = {} }: { page: number; count: number; path: string; params?: Record<string, string | undefined> }) {
  return <ListPagination page={page} total={count} pathname={path} filters={params} />;
}
export function StatusBadge({ active, activeLabel = "Ativo", inactiveLabel = "Inativo" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${active ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>{active ? activeLabel : inactiveLabel}</span>;
}
