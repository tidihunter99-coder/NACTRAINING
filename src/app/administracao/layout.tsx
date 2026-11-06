import type { ReactNode } from "react";
import { Brand } from "@/components/shared/brand";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOutAction } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");
  return <div className="premium-app min-h-screen text-white lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="admin-sidebar hidden min-h-screen p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"><Brand compact /><p className="mb-5 mt-8 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-[0.2em] text-nac-yellow">Central administrativa</p><AdminNav /><form action={signOutAction} className="mt-auto pt-6"><button className="button-secondary w-full" type="submit">Sair da conta</button></form></aside>
    <div className="min-w-0"><header className="app-header sticky top-0 z-20 border-b backdrop-blur-lg lg:hidden"><div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6"><Brand compact /><form action={signOutAction}><button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-nac-muted" type="submit">Sair</button></form></div></header><main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:pb-12">{children}</main></div><AdminNav mobile />
  </div>;
}
