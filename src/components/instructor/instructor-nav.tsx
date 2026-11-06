"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Dumbbell, House, UsersRound } from "lucide-react";

const tabs = [
  { href: "/professor", label: "Início", icon: House },
  { href: "/professor/alunos", label: "Alunos", icon: UsersRound },
  { href: "/professor/fichas", label: "Fichas", icon: BookOpenText },
  { href: "/professor/exercicios", label: "Exercícios", icon: Dumbbell },
];

export function InstructorNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação do professor" className={mobile ? "app-bottom-nav fixed inset-x-0 bottom-0 z-30 flex items-center border-t px-2 pt-2 backdrop-blur-lg md:hidden" : "hidden items-center gap-1 md:flex"} style={mobile ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}>
    {tabs.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href !== "/professor" && pathname.startsWith(`${href}/`));
      return <Link aria-current={active ? "page" : undefined} className={`app-nav-link ${mobile ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px]" : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"} ${active ? "bg-nac-electric/20 font-bold text-white" : "text-nac-muted hover:bg-white/5 hover:text-white"} focus:outline-none focus:ring-2 focus:ring-nac-cyan`} href={href} key={href}><Icon aria-hidden="true" size={mobile ? 20 : 17} /><span>{label}</span></Link>;
    })}
  </nav>;
}
