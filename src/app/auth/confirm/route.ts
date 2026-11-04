import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const destination = url.searchParams.get("destino") === "redefinir-senha" ? "/redefinir-senha" : "/aluno";
  const client = await createSupabaseServerClient();
  if (!client) return NextResponse.redirect(new URL("/entrar?estado=indisponivel", url.origin));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let error = true;
  try {
    if (code) {
      const result = await client.auth.exchangeCodeForSession(code);
      error = !!result.error;
    } else if (tokenHash && (type === "email" || type === "recovery")) {
      const result = await client.auth.verifyOtp({ token_hash: tokenHash, type });
      error = !!result.error;
    }
  } catch {
    error = true;
  }
  const target = error ? "/entrar?estado=link-invalido" : destination;
  const response = NextResponse.redirect(new URL(target, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
