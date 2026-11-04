"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";

import { InputField } from "@/components/ui/input-field";
import { recoverAction, resetAction, signInAction, signUpAction, type AuthActionState } from "@/lib/auth/actions";

const initialAuthState: AuthActionState = { message: "", success: false };

type Variant = "login" | "signup" | "recover" | "reset";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button-primary w-full" disabled={pending} type="submit">{pending ? "Aguarde..." : label}</button>;
}

function PasswordField({ confirm = false, autoComplete }: { confirm?: boolean; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  const id = confirm ? "confirmPassword" : "password";
  return <div><label className="form-label" htmlFor={id}>{confirm ? "Confirmar senha" : "Senha"}</label><div className="relative">
    <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nac-muted" size={19} aria-hidden="true" />
    <input autoComplete={autoComplete} className="form-input pl-11 pr-12" id={id} minLength={confirm ? undefined : 8} name={id} required type={visible ? "text" : "password"} />
    <button aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-nac-silver focus:outline-none focus:ring-2 focus:ring-nac-cyan" onClick={() => setVisible(!visible)} type="button">{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
  </div></div>;
}

export function AuthForm({ variant, notice }: { variant: Variant; notice?: string }) {
  const action = variant === "login" ? signInAction : variant === "signup" ? signUpAction : variant === "recover" ? recoverAction : resetAction;
  const [state, formAction] = useActionState(action, initialAuthState);
  return <form action={formAction} className="mt-7 space-y-5">
    {notice && <p className="rounded-xl border border-nac-cyan/25 bg-nac-electric/10 p-4 text-sm text-nac-silver" role="status">{notice}</p>}
    {variant === "signup" && <InputField autoComplete="name" icon={UserRound} id="fullName" label="Nome completo" maxLength={160} minLength={2} name="fullName" required />}
    {variant !== "reset" && <InputField autoComplete="email" icon={Mail} id="email" label="E-mail" name="email" required type="email" />}
    {(variant === "login" || variant === "signup" || variant === "reset") && <PasswordField autoComplete={variant === "login" ? "current-password" : "new-password"} />}
    {(variant === "signup" || variant === "reset") && <PasswordField autoComplete="new-password" confirm />}
    {variant === "signup" && <label className="flex gap-3 text-sm leading-6 text-nac-silver"><input className="mt-1.5 h-4 w-4 accent-nac-electric" name="accept" required type="checkbox" /><span>Li os <Link className="text-nac-cyan underline" href="/termos">termos de utilização</Link> e estou ciente da <Link className="text-nac-cyan underline" href="/privacidade">política de privacidade</Link>.</span></label>}
    {state.message && <p aria-live="polite" className={`rounded-xl border p-4 text-sm ${state.success ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-red-400/40 bg-red-500/10 text-red-100"}`} role="status">{state.message}</p>}
    <SubmitButton label={{ login: "ENTRAR", signup: "CRIAR MINHA CONTA", recover: "ENVIAR INSTRUÇÕES", reset: "SALVAR NOVA SENHA" }[variant]} />
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold text-nac-cyan">
      {variant === "login" && <><Link href="/recuperar-senha">Esqueci minha senha</Link><Link href="/cadastro">Criar minha conta</Link></>}
      {variant !== "login" && <Link href="/entrar">Voltar ao login</Link>}
    </div>
  </form>;
}
