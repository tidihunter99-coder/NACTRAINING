"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDayExercises, getOpenSession, getSession } from "@/lib/student/data";

function field(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function numberField(form: FormData, name: string, max: number) {
  const raw = field(form, name);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > max) throw new Error("Número inválido");
  return value;
}
function fail(path: string, code: string): never { redirect(`${path}?erro=${code}`); }

export async function startWorkoutAction(form: FormData) {
  const profile = await requireRole("student");
  const dayId = field(form, "dayId");
  if (!isUuid(dayId)) fail("/aluno/treinos", "ficha");
  const open = await getOpenSession(profile.id);
  if (open) redirect(`/aluno/treino/${open.id}`);
  const supabase = await createSupabaseServerClient();
  if (!supabase) fail("/aluno/treinos", "conexao");
  const { data: day } = await supabase.from("workout_days").select("id, workout_plan_id").eq("id", dayId).maybeSingle();
  if (!day) fail("/aluno/treinos", "ficha");
  const { data: plan } = await supabase.from("workout_plans").select("id").eq("id", day.workout_plan_id).eq("student_id", profile.id).eq("status", "active").maybeSingle();
  if (!plan) fail("/aluno/treinos", "ficha");
  const { data, error } = await supabase.from("workout_sessions").insert({ student_id: profile.id, workout_plan_id: plan.id, workout_day_id: day.id, status: "in_progress" }).select("id").single();
  if (error) {
    const concurrent = await getOpenSession(profile.id);
    if (concurrent) redirect(`/aluno/treino/${concurrent.id}`);
    fail("/aluno/treinos", "inicio");
  }
  revalidatePath("/aluno");
  redirect(`/aluno/treino/${data.id}`);
}

export async function saveSetAction(form: FormData) {
  const profile = await requireRole("student");
  const sessionId = field(form, "sessionId");
  if (!isUuid(sessionId)) fail("/aluno/treinos", "sessao");
  const path = `/aluno/treino/${sessionId}`;
  const session = await getSession(profile.id, sessionId);
  if (!session || session.status !== "in_progress") fail("/aluno/treinos", "sessao");
  const exerciseId = field(form, "exerciseId");
  const prescription = (await getDayExercises(session.workout_day_id)).find((item) => item.prescription.id === exerciseId)?.prescription;
  const setNumber = Number(field(form, "setNumber"));
  if (!prescription || !Number.isInteger(setNumber) || setNumber < 1 || setNumber > prescription.sets) fail(path, "serie");
  let repetitions: number | null;
  let load: number | null;
  try {
    repetitions = numberField(form, "repetitions", 100);
    load = numberField(form, "load", 1000);
  } catch { fail(path, "numero"); }
  if (repetitions === null || !Number.isInteger(repetitions)) fail(path, "repeticoes");
  const supabase = await createSupabaseServerClient();
  if (!supabase) fail(path, "conexao");
  const { error } = await supabase.from("workout_set_logs").upsert({ workout_session_id: session.id, workout_exercise_id: exerciseId, set_number: setNumber, repetitions_completed: repetitions, load_used: load, completed: true, completed_at: new Date().toISOString() }, { onConflict: "workout_session_id,workout_exercise_id,set_number" });
  if (error) fail(path, "salvar");
  revalidatePath(path);
  revalidatePath("/aluno");
  redirect(`${path}#exercicio-${exerciseId}`);
}

export async function finishWorkoutAction(form: FormData) {
  const profile = await requireRole("student");
  const sessionId = field(form, "sessionId");
  if (!isUuid(sessionId)) fail("/aluno/treinos", "sessao");
  const session = await getSession(profile.id, sessionId);
  if (!session) fail("/aluno/treinos", "sessao");
  if (session.status === "completed") redirect(`/aluno/treino/${session.id}`);
  if (session.status !== "in_progress") fail("/aluno/treinos", "sessao");
  const supabase = await createSupabaseServerClient();
  if (!supabase) fail(`/aluno/treino/${sessionId}`, "conexao");
  const finishedAt = new Date();
  const duration = Math.floor((finishedAt.getTime() - new Date(session.started_at).getTime()) / 1000);
  const { data, error } = await supabase.from("workout_sessions").update({ status: "completed", finished_at: finishedAt.toISOString(), duration_seconds: duration >= 0 && duration <= 86400 ? duration : null }).eq("id", sessionId).eq("student_id", profile.id).eq("status", "in_progress").select("id").maybeSingle();
  if (error) fail(`/aluno/treino/${sessionId}`, "finalizar");
  if (!data) {
    const latest = await getSession(profile.id, sessionId);
    if (latest?.status !== "completed") fail(`/aluno/treino/${sessionId}`, "finalizar");
  }
  revalidatePath("/aluno");
  revalidatePath("/aluno/historico");
  redirect(`/aluno/treino/${sessionId}`);
}

export async function saveMetricAction(form: FormData) {
  const profile = await requireRole("student");
  const values: Record<string, number | null> = {};
  try {
    for (const name of ["weight_kg", "waist_cm", "chest_cm", "arm_cm", "thigh_cm", "hip_cm"]) {
      values[name] = numberField(form, name, 500);
      if (values[name] !== null && values[name]! < 1) throw new Error("Medida inválida");
    }
  } catch { fail("/aluno/evolucao", "numero"); }
  if (Object.values(values).every((value) => value === null)) fail("/aluno/evolucao", "medida");
  const supabase = await createSupabaseServerClient();
  if (!supabase) fail("/aluno/evolucao", "conexao");
  const { error } = await supabase.from("body_metrics").insert({ student_id: profile.id, ...values, notes: field(form, "notes").slice(0, 500) || null });
  if (error) fail("/aluno/evolucao", "salvar");
  revalidatePath("/aluno/evolucao");
  revalidatePath("/aluno");
  redirect("/aluno/evolucao?salvo=1");
}

export async function saveProfileAction(form: FormData) {
  const profile = await requireRole("student");
  const name = field(form, "fullName");
  const phone = field(form, "phone");
  if (!name || name.length > 120 || phone.length > 30) fail("/aluno/perfil", "dados");
  const supabase = await createSupabaseServerClient();
  if (!supabase) fail("/aluno/perfil", "conexao");
  const { error } = await supabase.from("profiles").update({ full_name: name, phone: phone || null }).eq("id", profile.id);
  if (error) fail("/aluno/perfil", "salvar");
  revalidatePath("/aluno/perfil");
  revalidatePath("/aluno");
  redirect("/aluno/perfil?salvo=1");
}
