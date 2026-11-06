import type { ReactNode } from "react";
import { Brand } from "@/components/shared/brand";
import { InstructorNav } from "@/components/instructor/instructor-nav";
import { signOutAction } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/guard";

export default async function InstructorLayout({ children }: { children: ReactNode }) {
  await requireRole("instructor");
  return <div className="premium-app min-h-screen text-white"><header className="app-header sticky top-0 z-20 border-b backdrop-blur-lg"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6"><Brand compact /><InstructorNav /><form action={signOutAction}><button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-nac-muted transition hover:text-white focus:outline-none focus:ring-2 focus:ring-nac-cyan" type="submit">Sair</button></form></div></header><main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-6 md:pb-12">{children}</main><InstructorNav mobile /></div>;
}
