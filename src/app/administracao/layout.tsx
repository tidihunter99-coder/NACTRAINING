import type { ReactNode } from "react";
import { Brand } from "@/components/shared/brand";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOutAction } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");
  return <div className="min-h-screen bg-nac-navy text-white"><header className="sticky top-0 z-20 border-b border-white/10 bg-nac-navy/95 backdrop-blur-lg"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"><Brand compact /><AdminNav /><form action={signOutAction}><button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-nac-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-nac-cyan" type="submit">Sair</button></form></div></header><main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 lg:pb-12">{children}</main><AdminNav mobile /></div>;
}
