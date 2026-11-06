import Link from "next/link";

export function Pagination({ page, total, pageSize = 20, pathname, filters = {} }: {
  page: number; total: number; pageSize?: number; pathname: string; filters?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    params.set("pagina", String(next));
    return `${pathname}?${params}`;
  };
  return <nav aria-label="Paginação" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
    {page > 1 ? <Link className="button-secondary" href={href(page - 1)}>Anterior</Link> : <span />}
    <span className="text-nac-muted">Página {page} de {pages} · {total} registros</span>
    {page < pages && <Link className="button-secondary" href={href(page + 1)}>Próxima</Link>}
  </nav>;
}
