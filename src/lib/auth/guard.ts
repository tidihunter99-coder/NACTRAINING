import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseRole, ProfileRow } from "@/types/database";

const homeByRole: Record<DatabaseRole, string> = {
  student: "/aluno",
  instructor: "/professor",
  admin: "/administracao",
};

export function homeForRole(role: DatabaseRole) { return homeByRole[role]; }

export async function getVerifiedProfile(): Promise<{ profile: Pick<ProfileRow, "id" | "full_name" | "role" | "status"> | null; state: "ok" | "unauthenticated" | "unavailable" | "inactive" }> {
  const client = await createSupabaseServerClient();
  if (!client) return { profile: null, state: "unavailable" };
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) return { profile: null, state: [400, 401, 403].includes(userError.status || 0) ? "unauthenticated" : "unavailable" };
    if (!user) return { profile: null, state: "unauthenticated" };
    if (!user.email_confirmed_at) return { profile: null, state: "unauthenticated" };
    const { data, error } = await client.from("profiles").select("id, full_name, role, status").eq("id", user.id).single();
    if (error || !data || !["student", "instructor", "admin"].includes(data.role)) return { profile: null, state: "unavailable" };
    if (data.status !== "active") return { profile: data as ProfileRow, state: "inactive" };
    return { profile: data as ProfileRow, state: "ok" };
  } catch {
    return { profile: null, state: "unavailable" };
  }
}

export async function requireRole(role: DatabaseRole) {
  const result = await getVerifiedProfile();
  if (result.state === "unauthenticated") redirect("/entrar?estado=sessao");
  if (result.state === "inactive") redirect("/entrar?estado=inativo");
  if (result.state !== "ok" || !result.profile) redirect("/entrar?estado=indisponivel");
  if (result.profile.role !== role) redirect(homeForRole(result.profile.role));
  return result.profile;
}
