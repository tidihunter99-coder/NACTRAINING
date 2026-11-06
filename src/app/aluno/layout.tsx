import type { ReactNode } from "react";
import { Brand } from "@/components/shared/brand";
import { StudentNav } from "@/components/student/student-nav";
import { StudentMobileHeader } from "@/components/student/student-mobile-header";
import { signOutAction } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/guard";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireRole("student");
  return <div className="premium-app student-app min-h-screen text-white"><header className="student-header sticky top-0 z-20 backdrop-blur-lg"><div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 md:flex"><Brand compact /><StudentNav /><form action={signOutAction}><button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-nac-muted transition hover:text-white focus:outline-none focus:ring-2 focus:ring-nac-cyan" type="submit">Sair</button></form></div><StudentMobileHeader /></header><main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6 md:pb-12">{children}</main><StudentNav mobile /></div>;
}
