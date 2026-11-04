import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { PageHeading, StudentCard, Notice } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { saveProfileAction } from "@/lib/student/actions";
import { getFullProfile } from "@/lib/student/data";
import { dateBR } from "@/lib/student/format";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string }> }) {
  const authProfile = await requireRole("student");
  const profile = await getFullProfile(authProfile.id);
  const params = await searchParams;
  return <><PageHeading eyebrow="Conta" title="Meu perfil" description="Confira seus dados e atualize suas informações de contato." />{params.erro && <Notice>Não foi possível salvar o perfil. Confira os campos e tente novamente.</Notice>}{params.salvo && <Notice success>Perfil atualizado com sucesso.</Notice>}<div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><StudentCard className="h-fit"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-nac-electric/20 text-nac-cyan"><UserRound size={28} /></div><h2 className="mt-4 text-2xl font-black">{profile.full_name || "Aluno NAC"}</h2><p className="mt-1 flex items-center gap-2 text-sm text-nac-muted"><Mail size={15} /> {profile.email}</p><div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm"><p className="flex items-center gap-2"><ShieldCheck className="text-green-400" size={16} /> Conta {profile.status === "active" ? "ativa" : "inativa"}</p><p className="text-nac-muted">Cadastro em {dateBR(profile.created_at)}</p></div></StudentCard><StudentCard><h2 className="text-xl font-black">Editar informações</h2><p className="mt-2 text-sm text-nac-muted">Nome e telefone são os campos disponíveis para edição.</p><form action={saveProfileAction} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Nome completo<input className="form-input mt-2" defaultValue={profile.full_name ?? ""} maxLength={120} name="fullName" required /></label><label className="block text-sm font-semibold">Telefone<input className="form-input mt-2" defaultValue={profile.phone ?? ""} maxLength={30} name="phone" type="tel" /></label><button className="button-primary w-full sm:w-auto" type="submit">Salvar alterações</button></form></StudentCard></div></>;
}
