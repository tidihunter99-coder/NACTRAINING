import { Activity, ChevronRight, Clock3, Dumbbell, TrendingUp } from "lucide-react";

import { MobileBottomNavigation } from "@/components/ui/mobile-bottom-navigation";

export function WorkoutPreview() {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2.55rem] border-[7px] border-[#1d344f] bg-[#07172B] p-4 shadow-card ring-1 ring-white/10 sm:max-w-[336px]">
      <div className="mx-auto h-1.5 w-20 rounded-full bg-white/20" aria-hidden="true" />
      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-nac-cyan">NAC TRAINING</p>
          <h3 className="mt-1 text-lg font-bold text-white">Bora treinar hoje? <span aria-hidden="true">💪</span></h3>
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-nac-electric/15 text-nac-cyan" aria-hidden="true"><Dumbbell size={16} /></span>
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-nac-electric to-[#0564d4] p-4 shadow-lg shadow-nac-electric/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/70">Seu treino de hoje</p>
            <h4 className="mt-2 text-xl font-extrabold text-white">Treino A</h4>
            <p className="mt-1 text-sm text-white/85">Peito e Tríceps</p>
          </div>
          <ChevronRight className="mt-2 text-white" size={18} aria-hidden="true" />
        </div>
        <div className="mt-5 flex items-center gap-4 text-[0.68rem] font-semibold text-white/85">
          <span className="flex items-center gap-1"><Dumbbell size={13} />6 exercícios</span>
          <span className="flex items-center gap-1"><Clock3 size={13} />55 min</span>
        </div>
        <button className="mt-5 flex min-h-10 w-full items-center justify-center rounded-xl bg-white px-3 text-[0.68rem] font-extrabold tracking-[0.08em] text-nac-navy" type="button" disabled>
          INICIAR TREINO
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <PreviewMetric icon={Activity} label="Frequência" value="3/4" />
        <PreviewMetric icon={TrendingUp} label="Cargas" value="+12%" />
        <PreviewMetric icon={Dumbbell} label="Treinos" value="18" />
      </div>
      <p className="mt-3 text-center text-[0.55rem] text-nac-muted">Dados exclusivamente ilustrativos</p>
      <MobileBottomNavigation />
    </div>
  );
}

function PreviewMetric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-2.5">
      <Icon className="text-nac-cyan" size={13} aria-hidden="true" />
      <p className="mt-2 text-sm font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[0.53rem] font-semibold text-nac-muted">{label}</p>
    </div>
  );
}
