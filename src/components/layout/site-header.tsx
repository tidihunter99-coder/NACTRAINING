import Link from "next/link";

import { Brand } from "@/components/shared/brand";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
      <Link href="/" className="rounded-xl focus:outline-none focus:ring-2 focus:ring-nac-cyan focus:ring-offset-2 focus:ring-offset-nac-navy">
        <Brand priority />
      </Link>
      <Link className="button-secondary px-3 sm:px-4" href="/entrar">
        Entrar
      </Link>
    </header>
  );
}
