import Link from "next/link";

export default function TermsPage() {
  return <main className="mx-auto max-w-2xl px-5 py-12"><Link className="text-nac-cyan" href="/cadastro">← Voltar ao cadastro</Link><h1 className="mt-8 text-3xl font-bold">Termos de utilização</h1><p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-nac-silver">Documento provisório. A NAC Academia deve revisar e publicar os termos completos antes de liberar cadastros reais.</p><p className="mt-5 leading-7 text-nac-silver">Nesta etapa de testes, o acesso ao NAC TRAINING é destinado somente à validação local das funcionalidades. As condições de uso, responsabilidades e canais de atendimento serão detalhados após revisão pela academia.</p></main>;
}
