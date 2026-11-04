import type { LucideIcon } from "lucide-react";

interface RoleCardProps {
  description: string;
  icon: LucideIcon;
  title: string;
}

export function RoleCard({ description, icon: Icon, title }: RoleCardProps) {
  return (
    <article className="card-surface p-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-nac-electric/20 to-nac-cyan/10 text-nac-cyan" aria-hidden="true">
        <Icon size={25} />
      </span>
      <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 leading-7 text-nac-silver">{description}</p>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-nac-muted">Ambiente previsto</p>
    </article>
  );
}
