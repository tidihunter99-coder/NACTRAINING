import { Pagination } from "@/components/ui/pagination";
import { pageNumber } from "@/lib/supabase/pagination";
import { Activity, Plus } from "lucide-react";
import { PageHeading, StudentCard, EmptyState, Notice } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { saveMetricAction } from "@/lib/student/actions";
import { getMetrics } from "@/lib/student/data";
import { dateBR, decimalBR } from "@/lib/student/format";
import type { BodyMetricRow } from "@/types/database";

const fields = [
  { key: "weight_kg", label: "Peso corporal", unit: "kg" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "chest_cm", label: "Peitoral", unit: "cm" },
  { key: "arm_cm", label: "Braço", unit: "cm" },
  { key: "thigh_cm", label: "Coxa", unit: "cm" },
  { key: "hip_cm", label: "Quadril", unit: "cm" },
] as const;
type MetricKey = (typeof fields)[number]["key"];

export default async function EvolutionPage({ searchParams }: { searchParams: Promise<{ medida?: string; erro?: string; salvo?: string; pagina?: string }> }) {
  const profile = await requireRole("student");
  const metrics = await getMetrics(profile.id);
  const params = await searchParams;
  const page = pageNumber(params.pagina);
  const selected = fields.find((item) => item.key === params.medida) ?? fields[0];
  const values = [...metrics].reverse().filter((item) => item[selected.key] != null).map((item) => ({ date: item.recorded_at, value: item[selected.key] as number }));
  const min = Math.min(...values.map((item) => item.value));
  const max = Math.max(...values.map((item) => item.value));
  const range = max - min || 1;
  const points = values.map((item, index) => `${values.length === 1 ? 50 : 8 + index / (values.length - 1) * 84},${78 - (item.value - min) / range * 58}`).join(" ");
  return <>
    <PageHeading eyebrow="Medidas" title="Minha evolução" description="Acompanhe somente as medidas registradas na sua conta. Mudanças são apresentadas sem classificá-las como boas ou ruins." />
    {params.erro && <Notice>Não foi possível salvar as medidas. Preencha ao menos um valor válido e tente novamente.</Notice>}
    {params.salvo && <Notice success>Medidas registradas com sucesso.</Notice>}
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]"><div className="space-y-5"><StudentCard><div className="flex flex-wrap items-center justify-between gap-3"><div><Activity className="text-nac-cyan" size={23} /><h2 className="mt-2 text-xl font-black">Evolução das medidas</h2></div><form><label className="text-xs font-semibold text-nac-muted">Medida<select className="form-input mt-1" defaultValue={selected.key} name="medida" onChange={undefined}>{fields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><button className="button-secondary mt-2 w-full" type="submit">Visualizar</button></form></div>{values.length ? <><div className="mt-6 grid grid-cols-3 gap-2 border-y border-white/10 py-4 text-sm"><div><p className="text-nac-muted">Primeira</p><p className="mt-1 font-bold">{decimalBR(values[0].value)} {selected.unit}</p></div><div><p className="text-nac-muted">Mais recente</p><p className="mt-1 font-bold">{decimalBR(values.at(-1)!.value)} {selected.unit}</p></div><div><p className="text-nac-muted">Diferença</p><p className="mt-1 font-bold">{values.length > 1 ? `${values.at(-1)!.value - values[0].value > 0 ? "+" : ""}${decimalBR(values.at(-1)!.value - values[0].value)} ${selected.unit}` : "—"}</p></div></div><svg aria-label={`Gráfico de ${selected.label.toLowerCase()} com ${values.length} registros`} className="mt-4 h-52 w-full" preserveAspectRatio="none" role="img" viewBox="0 0 100 100"><line stroke="#334155" strokeWidth="0.5" x1="0" x2="100" y1="78" y2="78" /><line stroke="#334155" strokeWidth="0.5" x1="0" x2="100" y1="49" y2="49" /><line stroke="#334155" strokeWidth="0.5" x1="0" x2="100" y1="20" y2="20" />{values.length > 1 && <polyline fill="none" points={points} stroke="#087CFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}{values.map((item, index) => <circle cx={values.length === 1 ? 50 : 8 + index / (values.length - 1) * 84} cy={78 - (item.value - min) / range * 58} fill="#00B8FF" key={`${item.date}-${index}`} r="1.8"><title>{dateBR(item.date)}: {decimalBR(item.value)} {selected.unit}</title></circle>)}</svg><div className="flex justify-between text-xs text-nac-muted"><span>{dateBR(values[0].date)}</span><span>{dateBR(values.at(-1)!.date)}</span></div></> : <p className="mt-5 text-sm text-nac-muted">Nenhuma medição de {selected.label.toLowerCase()} registrada.</p>}</StudentCard>{metrics.length ? <StudentCard><h2 className="text-lg font-bold">Histórico de medidas</h2><div className="mt-4 space-y-3">{metrics.slice((page - 1) * 20, page * 20).map((metric: BodyMetricRow) => <div className="rounded-xl border border-white/10 p-3" key={metric.id}><p className="text-xs font-bold text-nac-cyan">{dateBR(metric.recorded_at)}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-nac-muted">{fields.filter((field) => metric[field.key as MetricKey] != null).map((field) => <span key={field.key}>{field.label}: <strong className="text-white">{decimalBR(metric[field.key] as number)} {field.unit}</strong></span>)}</div>{metric.notes && <p className="mt-2 text-sm text-nac-muted">{metric.notes}</p>}</div>)}</div></StudentCard> : <EmptyState title="Sem medidas registradas" description="Seu histórico de evolução aparecerá aqui após o primeiro registro." />}</div><StudentCard className="h-fit"><Plus className="text-nac-cyan" size={23} /><h2 className="mt-2 text-xl font-black">Registrar medidas</h2><p className="mt-2 text-sm text-nac-muted">Preencha apenas as medidas que deseja registrar. O registro fica na sua conta.</p><form action={saveMetricAction} className="mt-5 space-y-4">{fields.map((field) => <label className="block text-sm font-semibold" key={field.key}>{field.label} ({field.unit})<input className="form-input mt-2" max="500" min="1" name={field.key} step="0.01" type="number" /></label>)}<label className="block text-sm font-semibold">Observações (opcional)<textarea className="form-input mt-2 min-h-24 py-3" maxLength={500} name="notes" /></label><button className="button-primary w-full" type="submit">Salvar medidas</button></form></StudentCard></div>
    <Pagination page={page} total={metrics.length} pathname="/aluno/evolucao" filters={{ medida: params.medida }} />
  </>;
}
