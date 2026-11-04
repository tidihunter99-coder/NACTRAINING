import Link from "next/link";
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
  const total = Math.max(1, Math.ceil(count / 20));
  const url = (number: number) => { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); query.set("pagina", String(number)); return `${path}?${query}`; };
  return <nav aria-label="Paginação" className="mt-6 flex items-center justify-between gap-3 text-sm"><span className="text-nac-muted">Página {page} de {total} · {count} registros</span><div className="flex gap-2">{page > 1 && <Link className="button-secondary" href={url(page - 1)}>Anterior</Link>}{page < total && <Link className="button-secondary" href={url(page + 1)}>Próxima</Link>}</div></nav>;
}
export function StatusBadge({ active, activeLabel = "Ativo", inactiveLabel = "Inativo" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${active ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>{active ? activeLabel : inactiveLabel}</span>;
}
