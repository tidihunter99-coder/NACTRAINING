import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChartNoAxesCombined, Dumbbell, Ruler, Target } from "lucide-react";
import type { ReactNode } from "react";

const features = [
  { label: "Treino", icon: Dumbbell },
  { label: "Evolução", icon: ChartNoAxesCombined },
  { label: "Medidas", icon: Ruler },
  { label: "Metas", icon: Target },
];

export function AuthFrame({ title, subtitle, children, login = false }: { title: string; subtitle: string; children: ReactNode; login?: boolean }) {
  return <main className={`auth-backdrop min-h-screen text-white ${login ? "auth-login-page" : "auth-secondary-page"}`}>
    <div className={`auth-stage ${login ? "auth-stage-login" : "auth-stage-secondary"}`}>
      {login && <div className="auth-hero">
        <Image alt="Atleta NAC em uma academia iluminada em azul, com a marca New Athletic Center e o lema Seu treino. Sua evolução." className="auth-hero-image" fill priority sizes="(min-width: 900px) 50vw, 100vw" src="/images/nac-login-hero.webp" />
        <h1 className="sr-only">{title}</h1>
      </div>}
      <section className="auth-card">
        <Link href="/" className="auth-home-link"><ArrowLeft size={22} aria-hidden="true" /> Página inicial</Link>
        {!login && <div className="auth-secondary-heading">
          <Image alt="Logo oficial NAC — New Athletic Center" className="auth-secondary-logo" height={305} priority src="/logos/nac-header.webp" width={710} />
          <p className="eyebrow">Acesso NAC</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>}
        {children}
        {login && <div className="auth-features">
          {features.map(({ label, icon: Icon }) => <div className="auth-feature" key={label}><Icon aria-hidden="true" size={27} strokeWidth={1.8} /><span>{label}</span></div>)}
        </div>}
      </section>
    </div>
  </main>;
}
