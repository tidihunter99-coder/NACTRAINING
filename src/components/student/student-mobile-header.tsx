"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, Menu } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

export function StudentMobileHeader() {
  const path = usePathname();
  const library = path.startsWith("/aluno/exercicios");
  return <div className="student-mobile-header mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-center px-4 py-2 md:hidden">
    {library ? <Link aria-label="Voltar ao início" className="flex h-11 w-11 items-center justify-center" href="/aluno"><ArrowLeft size={27} /></Link> : <details className="student-mobile-menu relative justify-self-start"><summary aria-label="Abrir menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl text-white"><Menu size={25} /></summary><div className="absolute left-0 top-12 z-40 w-48 rounded-2xl border border-sky-500/35 bg-[#061b2c] p-2 shadow-2xl"><Link className="block rounded-lg px-3 py-2 text-sm" href="/aluno/historico">Histórico</Link><Link className="block rounded-lg px-3 py-2 text-sm" href="/aluno/treinos">Minha ficha</Link><Link className="block rounded-lg px-3 py-2 text-sm" href="/aluno/exercicios">Biblioteca</Link><form action={signOutAction}><button className="block w-full rounded-lg px-3 py-2 text-left text-sm" type="submit">Sair</button></form></div></details>}
    <Link className="student-mobile-logo flex flex-col items-center" href="/aluno"><Image alt="NAC — New Athletic Center" height={305} priority src="/logos/nac-header.webp" width={710} /><span>NAC TRAINING</span></Link>
    {!library && <Link aria-label="Ver histórico de treinos" className="justify-self-end text-white" href="/aluno/historico"><Bell size={25} /></Link>}
  </div>;
}
