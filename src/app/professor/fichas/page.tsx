import { Pagination } from "@/components/ui/pagination";
import { pageNumber } from "@/lib/supabase/pagination";
import Link from "next/link";
import { ArrowRight, BookOpenText, Plus } from "lucide-react";
import { EmptyState, Notice, PageHeading, StudentCard } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { createPlanAction } from "@/lib/instructor/actions";
import { getLinkedStudents, getOwnPlans } from "@/lib/instructor/data";
import { dateBR } from "@/lib/student/format";

const statusLabel = { draft: "Em elaboração", active: "Ativa", archived: "Arquivada" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ aluno?: string; erro?: string; pagina?: string }> }) {
  const instructor = await requireRole("instructor");
  const [students, plans] = await Promise.all([getLinkedStudents(instructor.id), getOwnPlans(instructor.id)]);
  const params = await searchParams;
  const page = pageNumber(params.pagina);
  const byId = new Map(students.map((item) => [item.profile.id, item.profile]));
  return <><PageHeading eyebrow="Planejamento" title="Minhas fichas" description="Crie uma ficha em rascunho, organize as divisões e ative quando estiver pronta." />{params.erro && <Notice>Não foi possível concluir a operação. Confirme seu vínculo e os dados informados.</Notice>}
    <StudentCard className="mb-7"><div className="flex items-center gap-2"><Plus className="text-nac-cyan" size={20} /><h2 className="text-lg font-black">Nova ficha</h2></div><p className="mt-2 text-sm text-nac-muted">A ficha começa em elaboração e só aparecerá para o aluno após a ativação.</p>{students.length ? <form action={createPlanAction} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Aluno vinculado<select className="form-input mt-2" defaultValue={params.aluno ?? ""} name="studentId" required><option disabled value="">Selecione um aluno</option>{students.map(({ profile }) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</select></label><label className="text-sm font-semibold">Nome da ficha<input className="form-input mt-2" maxLength={160} minLength={2} name="title" placeholder="Ex.: Treinamento ABC" required /></label><label className="text-sm font-semibold">Objetivo (opcional)<input className="form-input mt-2" maxLength={1000} name="objective" /></label><label className="text-sm font-semibold">Descrição (opcional)<input className="form-input mt-2" maxLength={4000} name="description" /></label><button className="button-primary md:col-span-2 md:w-fit" type="submit">Criar rascunho <ArrowRight size={16} /></button></form> : <p className="mt-4 text-sm text-nac-muted">Você precisa de um vínculo ativo criado pela administração para prescrever treinos.</p>}</StudentCard>
    <h2 className="mb-4 text-xl font-black">Fichas criadas por você</h2>{!plans.length ? <EmptyState title="Nenhuma ficha criada" description="Selecione um aluno vinculado para começar a primeira ficha." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.slice((page - 1) * 20, page * 20).map((plan) => <StudentCard key={plan.id}><BookOpenText className="text-nac-cyan" size={22} /><p className="eyebrow mt-4">{statusLabel[plan.status]}</p><h3 className="mt-2 break-words text-xl font-black">{plan.title}</h3><p className="mt-2 text-sm text-nac-muted">Aluno: {byId.get(plan.student_id)?.full_name ?? "Vínculo não disponível"}</p><p className="mt-1 text-xs text-nac-muted">Criada em {dateBR(plan.created_at)}</p><Link className="button-secondary mt-5 w-full" href={`/professor/fichas/${plan.id}`}>{plan.status === "draft" ? "Editar ficha" : "Consultar ficha"} <ArrowRight size={16} /></Link></StudentCard>)}</div>}
    <Pagination page={page} total={plans.length} pathname="/professor/fichas" filters={{ aluno: params.aluno }} />
  </>;
}
