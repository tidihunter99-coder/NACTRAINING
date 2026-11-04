import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminMessage, ConfirmField, StatusBadge } from "@/components/admin/ui";
import { PageHeading, StudentCard } from "@/components/student/ui";
import { setProfileStatusAction } from "@/lib/admin/actions";
import { getInstructorDetail } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guard";
import { dateBR } from "@/lib/student/format";

export default async function AdminTeacherDetail({ params, searchParams }: { params: Promise<{ instructorId: string }>; searchParams: Promise<{ erro?: string; salvo?: string }> }) {
  await requireRole("admin");
  const { instructorId } = await params; const teacher = await getInstructorDetail(instructorId); if (!teacher) notFound();
  const state = await searchParams; const names = new Map(teacher.students.map((item) => [item.id, item.full_name || item.email]));
  return <><Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-nac-cyan" href="/administracao/professores"><ArrowLeft size={16} /> Professores</Link><PageHeading eyebrow="Equipe NAC" title={teacher.profile.full_name || "Professor NAC"} description="Dados administrativos e vínculos. O detalhe dos treinos pertence ao ambiente do professor autorizado." /><AdminMessage error={state.erro} saved={state.salvo} />
    <div className="grid gap-5 lg:grid-cols-2"><StudentCard><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Cadastro</h2><StatusBadge active={teacher.profile.status === "active"} /></div><p className="mt-4 break-all text-sm">{teacher.profile.email}</p><p className="mt-2 text-sm text-nac-muted">Cadastro: {dateBR(teacher.profile.created_at)}</p><form action={setProfileStatusAction} className="mt-6 space-y-3 border-t border-white/10 pt-4"><input name="profileId" type="hidden" value={teacher.profile.id} /><input name="status" type="hidden" value={teacher.profile.status === "active" ? "inactive" : "active"} /><ConfirmField label={teacher.profile.status === "active" ? "Confirmo a inativação. O professor perderá acesso aos alunos vinculados; o histórico será preservado." : "Confirmo a reativação deste professor."} /><button className="button-secondary" type="submit">{teacher.profile.status === "active" ? "Inativar professor" : "Reativar professor"}</button></form></StudentCard>
    <StudentCard><h2 className="text-lg font-black">Alunos vinculados</h2><p className="mt-2 text-sm text-nac-muted">{teacher.activeLinkCount} vínculos ativos · {teacher.linkCount} vínculos registrados. A lista mostra os 20 mais recentes.</p>{teacher.links.length ? <ul className="mt-4 divide-y divide-white/10">{teacher.links.map((link) => <li className="flex items-center justify-between gap-2 py-3 text-sm" key={link.id}><Link className="font-semibold text-nac-cyan" href={`/administracao/alunos/${link.student_id}`}>{names.get(link.student_id) || "Aluno"}</Link><StatusBadge active={link.active} /></li>)}</ul> : <p className="mt-4 text-sm text-nac-muted">Nenhum vínculo registrado.</p>}<Link className="button-primary mt-5" href="/administracao/vinculos">Gerenciar vínculos</Link></StudentCard></div>
  </>;
}
