import { AuthFrame } from "@/components/auth/auth-frame";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return <AuthFrame title="COMECE SUA EVOLUÇÃO" subtitle="Crie sua conta de aluno e confirme seu e-mail para entrar."><AuthForm variant="signup" /></AuthFrame>;
}
