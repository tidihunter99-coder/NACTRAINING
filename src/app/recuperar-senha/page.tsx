import { AuthFrame } from "@/components/auth/auth-frame";
import { AuthForm } from "@/components/auth/auth-form";

export default function RecoverPage() {
  return <AuthFrame title="RECUPERAR ACESSO" subtitle="Informe seu e-mail para receber as instruções."><AuthForm variant="recover" /></AuthFrame>;
}
