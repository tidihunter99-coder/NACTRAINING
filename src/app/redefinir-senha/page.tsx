import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { AuthForm } from "@/components/auth/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResetPage() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/entrar?estado=link-invalido");
  return <AuthFrame title="NOVA SENHA" subtitle="Escolha uma nova senha para sua conta."><AuthForm variant="reset" /></AuthFrame>;
}
