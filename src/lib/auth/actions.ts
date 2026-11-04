"use server";

import { redirect } from "next/navigation";

import { getVerifiedProfile, homeForRole } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = { message: string; success: boolean };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function signInAction(_: AuthActionState, form: FormData): Promise<AuthActionState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!emailPattern.test(email) || !password) return { message: "Informe e-mail e senha válidos.", success: false };
  const client = await createSupabaseServerClient();
  if (!client) return { message: "Acesso temporariamente indisponível.", success: false };
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { message: "Não foi possível entrar. Confira seus dados e a confirmação do e-mail.", success: false };
  const result = await getVerifiedProfile();
  if (result.state === "inactive") { await client.auth.signOut(); return { message: "Sua conta está inativa. Fale com a NAC Academia.", success: false }; }
  if (result.state !== "ok" || !result.profile) { await client.auth.signOut(); return { message: "Seu perfil está indisponível. Tente novamente mais tarde.", success: false }; }
  redirect(homeForRole(result.profile.role));
}

export async function signUpAction(_: AuthActionState, form: FormData): Promise<AuthActionState> {
  const fullName = String(form.get("fullName") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (fullName.length < 2 || fullName.length > 160 || !emailPattern.test(email) || password.length < 8 || password !== form.get("confirmPassword") || form.get("accept") !== "on") {
    return { message: "Revise os campos, confirme a senha e aceite os documentos.", success: false };
  }
  const client = await createSupabaseServerClient();
  if (!client) return { message: "Cadastro temporariamente indisponível.", success: false };
  const { error } = await client.auth.signUp({ email, password, options: {
    data: { full_name: fullName },
    emailRedirectTo: `${siteUrl()}/auth/confirm?destino=aluno`,
  } });
  if (error) return { message: "Não foi possível processar o cadastro agora. Tente novamente mais tarde.", success: false };
  return { message: "Se o cadastro puder ser concluído, você receberá um e-mail de confirmação.", success: true };
}

export async function recoverAction(_: AuthActionState, form: FormData): Promise<AuthActionState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!emailPattern.test(email)) return { message: "Informe um e-mail válido.", success: false };
  const client = await createSupabaseServerClient();
  if (!client) return { message: "Recuperação temporariamente indisponível.", success: false };
  await client.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?destino=redefinir-senha` });
  return { message: "Se houver uma conta com este e-mail, enviaremos as instruções de recuperação.", success: true };
}

export async function resetAction(_: AuthActionState, form: FormData): Promise<AuthActionState> {
  const password = String(form.get("password") || "");
  if (password.length < 8 || password !== form.get("confirmPassword")) return { message: "Use pelo menos 8 caracteres e confirme a mesma senha.", success: false };
  const client = await createSupabaseServerClient();
  if (!client) return { message: "Redefinição temporariamente indisponível.", success: false };
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { message: "Link inválido ou expirado. Solicite outro e-mail.", success: false };
  const { error } = await client.auth.updateUser({ password });
  if (error) return { message: "Não foi possível redefinir a senha. Solicite outro link.", success: false };
  await client.auth.signOut();
  redirect("/entrar?estado=senha-alterada");
}

export async function signOutAction() {
  const client = await createSupabaseServerClient();
  if (client) await client.auth.signOut();
  redirect("/entrar?estado=saiu");
}
