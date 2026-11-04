"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Dumbbell, House, UserRound } from "lucide-react";

const tabs = [
  { href: "/aluno", label: "Início", icon: House },
  { href: "/aluno/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/aluno/historico", label: "Histórico", icon: CalendarDays },
  { href: "/aluno/evolucao", label: "Evolução", icon: Activity },
  { href: "/aluno/perfil", label: "Perfil", icon: UserRound },
];

export function StudentNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação do aluno" className={mobile ? "fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-nac-navy/95 px-1 pt-2 backdrop-blur-lg md:hidden" : "hidden items-center gap-1 md:flex"} style={mobile ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}>
    {tabs.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href === "/aluno/treinos" && pathname.startsWith("/aluno/treino/")) || (href !== "/aluno" && pathname.startsWith(`${href}/`));
      return <Link aria-current={active ? "page" : undefined} className={`${mobile ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px]" : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"} ${active ? "bg-nac-electric/20 font-bold text-white" : "text-nac-muted hover:bg-white/5 hover:text-white"} focus:outline-none focus:ring-2 focus:ring-nac-cyan`} href={href} key={href}><Icon aria-hidden="true" size={mobile ? 20 : 17} /><span>{label}</span></Link>;
    })}
  </nav>;
}
