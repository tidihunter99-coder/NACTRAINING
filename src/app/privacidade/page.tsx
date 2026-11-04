import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto max-w-2xl px-5 py-12"><Link className="text-nac-cyan" href="/cadastro">← Voltar ao cadastro</Link><h1 className="mt-8 text-3xl font-bold">Política de privacidade</h1><p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-nac-silver">Documento provisório. A NAC Academia deve revisar e publicar a política completa antes de liberar cadastros reais.</p><p className="mt-5 leading-7 text-nac-silver">O cadastro inicial solicita nome, e-mail e senha para criar e proteger o acesso. A senha é tratada pelo Supabase Auth. Detalhes sobre finalidade, retenção, direitos e contato serão definidos na versão revisada.</p></main>;
}
