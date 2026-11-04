"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenText, Dumbbell, House, Link2, UsersRound } from "lucide-react";

const tabs = [
  { href: "/administracao", label: "Início", Icon: House },
  { href: "/administracao/alunos", label: "Alunos", Icon: UsersRound },
  { href: "/administracao/professores", label: "Professores", Icon: BookOpenText },
  { href: "/administracao/vinculos", label: "Vínculos", Icon: Link2 },
  { href: "/administracao/exercicios", label: "Exercícios", Icon: Dumbbell },
  { href: "/administracao/auditoria", label: "Auditoria", Icon: Activity },
];
export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação administrativa" className={mobile ? "fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-white/10 bg-nac-navy/95 px-1 pt-2 backdrop-blur-lg lg:hidden" : "hidden items-center gap-1 lg:flex"} style={mobile ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}>
    {tabs.map(({ href, label, Icon }) => { const active = pathname === href || (href !== "/administracao" && pathname.startsWith(`${href}/`)); return <Link aria-current={active ? "page" : undefined} className={`${mobile ? "flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] sm:text-[10px]" : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"} ${active ? "bg-nac-electric/20 font-bold text-white" : "text-nac-muted hover:bg-white/5 hover:text-white"} focus:outline-none focus:ring-2 focus:ring-nac-cyan`} href={href} key={href}><Icon aria-hidden="true" size={mobile ? 18 : 16} /><span className="truncate">{label}</span></Link>; })}
  </nav>;
}
