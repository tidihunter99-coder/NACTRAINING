import Link from "next/link";
import { Activity, ArrowRight, BookOpenText, Dumbbell, Link2, UsersRound } from "lucide-react";
import { PageHeading, StudentCard } from "@/components/student/ui";
import { getAdminCounts, getAdminWeeklyActivity } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminPage() {
  await requireRole("admin");
  const [counts, weekly] = await Promise.all([getAdminCounts(), getAdminWeeklyActivity()]);
  const cards = [
    ["Alunos cadastrados", counts.students_total, "/administracao/alunos"],
    ["Alunos ativos", counts.students_active, "/administracao/alunos?status=active"],
    ["Alunos inativos", counts.students_inactive, "/administracao/alunos?status=inactive"],
    ["Professores", counts.instructors_total, "/administracao/professores"],
    ["Professores ativos", counts.instructors_active, "/administracao/professores?status=active"],
    ["Alunos vinculados", counts.students_linked, "/administracao/vinculos?status=active"],
    ["Alunos sem professor", counts.students_unlinked, "/administracao/alunos"],
    ["Fichas ativas", counts.plans_active, "/administracao/alunos"],
    ["Treinos concluídos · 30 dias", counts.sessions_completed, "/administracao/alunos"],
  ] as const;
  const links = [
    ["Alunos", "/administracao/alunos", UsersRound],
    ["Professores", "/administracao/professores", BookOpenText],
    ["Vínculos", "/administracao/vinculos", Link2],
    ["Catálogo", "/administracao/exercicios", Dumbbell],
  ] as const;
  const peak = Math.max(1, ...weekly.map((item) => Number(item.total)));
  return <>
    <PageHeading eyebrow="Central administrativa" title="Administração NAC" description="Gerencie contas, vínculos e catálogo. Os indicadores refletem o banco e respeitam as permissões administrativas." />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{cards.map(([label, number, href]) => <Link className="card-surface min-w-0 p-4 transition hover:border-nac-cyan/50 sm:p-5" href={href} key={label}><p className="text-3xl font-black text-white">{number}</p><p className="mt-2 text-xs leading-5 text-nac-muted">{label}</p></Link>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><StudentCard><div className="flex items-center gap-2"><Activity className="text-nac-cyan" size={20} /><h2 className="text-lg font-black">Treinos concluídos por semana</h2></div>{weekly.filter((row) => Number(row.total) > 0).length >= 2 ? <div className="mt-6 flex h-44 items-end gap-3" role="img" aria-label="Treinos concluídos por semana nas últimas oito semanas">{weekly.map((row) => <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.week_start}><span className="text-xs font-bold">{row.total}</span><div className="w-full max-w-20 rounded-t-lg bg-nac-electric" style={{ height: `${Math.max(8, Number(row.total) / peak * 110)}px` }} /><span className="truncate text-[10px] text-nac-muted">{new Date(`${row.week_start}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span></div>)}</div> : <p className="mt-4 text-sm text-nac-muted">O gráfico aparecerá quando houver treinos concluídos em pelo menos duas semanas.</p>}</StudentCard><StudentCard><h2 className="text-lg font-black">Acesso rápido</h2><div className="mt-4 space-y-2">{links.map(([label, href, Icon]) => <Link className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold hover:border-nac-cyan/50" href={href} key={href}><Icon className="text-nac-cyan" size={18} />{label}<ArrowRight className="ml-auto" size={16} /></Link>)}</div></StudentCard></div>
  </>;
}
