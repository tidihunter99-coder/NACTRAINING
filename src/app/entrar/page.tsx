import { AuthFrame } from "@/components/auth/auth-frame";
import { AuthForm } from "@/components/auth/auth-form";

const notices: Record<string, string> = {
  saiu: "Você saiu da sua conta.",
  "senha-alterada": "Senha alterada. Entre novamente com sua nova senha.",
  sessao: "Entre para acessar essa área.",
  inativo: "Sua conta está inativa. Fale com a NAC Academia.",
  indisponivel: "Não foi possível verificar seu perfil. Tente novamente mais tarde.",
  "link-invalido": "O link é inválido ou expirou. Solicite outro e-mail.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  return <AuthFrame title="BEM-VINDO AO NAC TRAINING" subtitle="Seu treino. Sua evolução."><AuthForm notice={notices[estado || ""]} variant="login" /></AuthFrame>;
}
