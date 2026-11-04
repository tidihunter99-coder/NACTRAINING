import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BodyMetricRow, ExerciseRow, ProfileRow, WorkoutDayRow, WorkoutExerciseRow, WorkoutPlanRow, WorkoutSessionRow, WorkoutSetLogRow } from "@/types/database";

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase indisponível");
  return supabase;
}

function checked<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function getActivePlan(studentId: string) {
  const supabase = await client();
  const plan = checked((await supabase.from("workout_plans").select("*").eq("student_id", studentId).eq("status", "active").maybeSingle())) as WorkoutPlanRow | null;
  if (!plan) return null;
  return { plan, days: await getPlanDays(plan.id) };
}

export async function getPlanDays(planId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_days").select("*").eq("workout_plan_id", planId).order("display_order"))) as WorkoutDayRow[];
}

export async function getDayExercises(dayId: string) {
  const supabase = await client();
  const prescribed = checked((await supabase.from("workout_exercises").select("*").eq("workout_day_id", dayId).order("display_order"))) as WorkoutExerciseRow[];
  if (!prescribed.length) return [];
  const exercises = checked((await supabase.from("exercises").select("*").in("id", prescribed.map((item) => item.exercise_id)))) as ExerciseRow[];
  const byId = new Map(exercises.map((item) => [item.id, item]));
  return prescribed.map((prescription) => ({ prescription, exercise: byId.get(prescription.exercise_id) ?? null }));
}

export async function getOpenSession(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("status", "in_progress").maybeSingle())) as WorkoutSessionRow | null;
}

export async function getSession(studentId: string, sessionId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) return null;
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("id", sessionId).maybeSingle())) as WorkoutSessionRow | null;
}

export async function getSessions(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).limit(200))) as WorkoutSessionRow[];
}

export async function getCompletedCount(studentId: string) {
  const supabase = await client();
  const { count, error } = await supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("status", "completed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getLogs(sessionId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_set_logs").select("*").eq("workout_session_id", sessionId).order("set_number"))) as WorkoutSetLogRow[];
}

export async function getMetrics(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("body_metrics").select("*").eq("student_id", studentId).order("recorded_at", { ascending: false }).limit(100))) as BodyMetricRow[];
}

export async function getFullProfile(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("profiles").select("*").eq("id", studentId).single())) as ProfileRow;
}

export async function getPlan(planId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_plans").select("*").eq("id", planId).maybeSingle())) as WorkoutPlanRow | null;
}

export async function getDay(dayId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_days").select("*").eq("id", dayId).maybeSingle())) as WorkoutDayRow | null;
}
