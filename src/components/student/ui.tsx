import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"><div className="min-w-0"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-nac-muted">{description}</p>}</div>{action}</header>;
}
export function StudentCard({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`card-surface p-4 sm:p-6 ${className}`}>{children}</section>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <StudentCard className="text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-nac-electric/15 text-nac-cyan"><AlertCircle size={22} /></div><h2 className="text-lg font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-nac-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</StudentCard>; }
export function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) { return <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${success ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>{children}</p>; }
