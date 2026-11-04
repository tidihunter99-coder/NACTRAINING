import type { ReactNode } from "react";

import { Brand } from "@/components/shared/brand";
import { signOutAction } from "@/lib/auth/actions";

export function PrivateShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return <main className="min-h-screen bg-nac-navy px-4 pb-16 pt-6 text-white sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><Brand priority /><form action={signOutAction}><button className="button-secondary" type="submit">Sair da conta</button></form></header>
      <section className="py-10 sm:py-14"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-lg text-nac-silver">{subtitle}</p></section>
      {children}
    </div>
  </main>;
}

export function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return <div className="card-surface p-6"><h2 className="text-lg font-extrabold">{title}</h2><p className="mt-3 leading-7 text-nac-silver">{description}</p></div>;
}
