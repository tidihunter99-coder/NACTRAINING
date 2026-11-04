import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Brand } from "@/components/shared/brand";

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-nac-navy px-4 py-8 text-white sm:px-6">
    <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-nac-electric/15 blur-3xl" aria-hidden="true" />
    <section className="relative w-full max-w-[27rem] rounded-[1.75rem] border border-white/10 bg-nac-deep/80 p-6 shadow-card backdrop-blur sm:p-8">
      <Link href="/" className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-nac-silver transition hover:text-white focus:outline-none focus:ring-2 focus:ring-nac-cyan"><ArrowLeft size={17} aria-hidden="true" /> Página inicial</Link>
      <div className="mt-8 flex justify-center"><Brand compact priority /></div>
      <div className="mt-7 text-center"><p className="eyebrow">Acesso NAC</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}</h1><p className="mt-3 leading-7 text-nac-silver">{subtitle}</p></div>
      {children}
    </section>
  </main>;
}
