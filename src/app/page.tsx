import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpenCheck,
  ChartNoAxesCombined,
  CircleUserRound,
  ClipboardList,
  Dumbbell,
  ShieldCheck,
  UsersRound,
  Video,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WorkoutPreview } from "@/components/shared/workout-preview";
import { FeatureCard } from "@/components/ui/feature-card";
import { RoleCard } from "@/components/ui/role-card";
import { SectionHeader } from "@/components/ui/section-header";

const features = [
  { title: "TREINOS PERSONALIZADOS", description: "Fichas organizadas pelos professores da NAC Academia.", icon: Dumbbell },
  { title: "VÍDEOS DEMONSTRATIVOS", description: "Orientações visuais para auxiliar na execução dos exercícios.", icon: Video },
  { title: "REGISTRO DE CARGAS", description: "Acompanhamento dos pesos utilizados em cada exercício.", icon: ClipboardList },
  { title: "EVOLUÇÃO FÍSICA", description: "Gráficos e histórico de progresso para acompanhar sua jornada.", icon: ChartNoAxesCombined },
  { title: "HISTÓRICO DE TREINOS", description: "Registro das sessões concluídas com organização e clareza.", icon: BookOpenCheck },
  { title: "ACOMPANHAMENTO PROFISSIONAL", description: "Integração entre professores e alunos para orientar sua evolução.", icon: UsersRound },
];

const roles = [
  { title: "ALUNO", description: "Acompanhe seus treinos, registre resultados e visualize sua evolução.", icon: CircleUserRound },
  { title: "PROFESSOR", description: "Organize fichas personalizadas e acompanhe o desenvolvimento dos alunos.", icon: Dumbbell },
  { title: "ADMINISTRAÇÃO", description: "Gerencie os usuários e acompanhe as atividades da academia.", icon: ShieldCheck },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-nac-navy text-white">
      <SiteHeader />
      <section className="relative pb-20 pt-10 sm:pb-28 sm:pt-14">
        <div className="pointer-events-none absolute left-[8%] top-0 size-72 rounded-full bg-nac-electric/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-1/4 size-96 rounded-full bg-nac-cyan/10 blur-3xl" aria-hidden="true" />
        <PageContainer className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="intro-reveal">
            <p className="eyebrow">Aplicativo oficial da NAC Academia</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              EVOLUA A <span className="text-nac-cyan">CADA TREINO.</span>
            </h1>
            <p className="mt-5 text-xl font-semibold text-white sm:text-2xl">Seu treino. Sua evolução.</p>
            <p className="mt-5 max-w-xl text-base leading-7 text-nac-silver sm:text-lg">
              O aplicativo exclusivo da NAC Academia para acompanhar seus treinos, registrar resultados e evoluir com o acompanhamento dos professores.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="button-primary" href="/entrar">Acessar NAC Training <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className="button-secondary" href="#recursos">Conhecer o aplicativo <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <p className="mt-5 text-sm text-nac-muted">Uma experiência desenvolvida para a sua rotina.</p>
          </div>
          <div className="intro-reveal-delay relative mx-auto w-full max-w-md">
            <div className="absolute inset-8 rounded-full bg-nac-electric/20 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
              <p className="mb-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-nac-muted">Prévia do aplicativo · Demonstração</p>
              <WorkoutPreview />
            </div>
          </div>
        </PageContainer>
      </section>

      <section id="recursos" className="border-y border-white/[0.07] bg-nac-deep/45 py-20 sm:py-28">
        <PageContainer>
          <SectionHeader eyebrow="Uma plataforma, sua evolução" title="Treino organizado para manter o foco." description="Os recursos abaixo representam as experiências planejadas para o NAC TRAINING." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </PageContainer>
      </section>

      <section className="py-20 sm:py-28">
        <PageContainer>
          <SectionHeader align="center" eyebrow="Construído para a NAC" title="Cada pessoa, uma experiência preparada." description="O NAC TRAINING terá ambientes específicos para apoiar a rotina de toda a academia." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {roles.map((role) => <RoleCard key={role.title} {...role} />)}
          </div>
        </PageContainer>
      </section>
      <SiteFooter />
    </main>
  );
}
