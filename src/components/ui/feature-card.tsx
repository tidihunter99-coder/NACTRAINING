import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  description: string;
  icon: LucideIcon;
  planned?: boolean;
  title: string;
}

export function FeatureCard({ description, icon: Icon, planned = true, title }: FeatureCardProps) {
  return (
    <article className="card-surface group relative overflow-hidden p-5 sm:p-6">
      <span className="mb-5 grid size-11 place-items-center rounded-xl border border-nac-electric/15 bg-nac-electric/10 text-nac-cyan transition duration-200 group-hover:scale-105" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h3 className="text-base font-bold tracking-wide text-white">{title}</h3>
      <p className="mt-2.5 text-sm leading-6 text-nac-silver">{description}</p>
      {planned && <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-nac-muted">Planejado</p>}
    </article>
  );
}
