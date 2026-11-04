import { BarChart3, Clock3, Dumbbell, House, UserRound } from "lucide-react";

const items = [
  { icon: House, label: "Início" },
  { icon: Dumbbell, label: "Treinos" },
  { icon: BarChart3, label: "Evolução" },
  { icon: Clock3, label: "Histórico" },
  { icon: UserRound, label: "Perfil" },
];

export function MobileBottomNavigation() {
  return (
    <nav aria-label="Navegação demonstrativa do aplicativo" className="mt-4 grid grid-cols-5 border-t border-white/10 pt-3">
      {items.map(({ icon: Icon, label }, index) => (
        <span key={label} className={`flex flex-col items-center gap-1 text-[0.52rem] font-semibold ${index === 0 ? "text-nac-cyan" : "text-nac-muted"}`}>
          <Icon size={15} strokeWidth={index === 0 ? 2.5 : 2} aria-hidden="true" />
          {label}
        </span>
      ))}
    </nav>
  );
}
