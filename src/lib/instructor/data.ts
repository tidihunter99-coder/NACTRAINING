import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BodyMetricRow, ExerciseRow, ProfileRow, StudentInstructorRow, WorkoutDayRow, WorkoutExerciseRow, WorkoutPlanRow, WorkoutSessionRow, WorkoutSetLogRow } from "@/types/database";

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase indisponível");
  return supabase;
}
function checked<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
export function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

export async function getLinkedStudents(instructorId: string) {
  const supabase = await client();
  const links = checked((await supabase.from("student_instructors").select("*").eq("instructor_id", instructorId).eq("active", true))) as StudentInstructorRow[];
  if (!links.length) return [];
  const profiles = checked((await supabase.from("profiles").select("*").in("id", links.map((link) => link.student_id)).eq("role", "student").eq("status", "active"))) as ProfileRow[];
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return links.flatMap((link) => { const profile = byId.get(link.student_id); return profile ? [{ link, profile }] : []; });
}

export async function getLinkedStudent(instructorId: string, studentId: string) {
  if (!isUuid(studentId)) return null;
  const supabase = await client();
  const link = checked((await supabase.from("student_instructors").select("*").eq("instructor_id", instructorId).eq("student_id", studentId).eq("active", true).maybeSingle())) as StudentInstructorRow | null;
  if (!link) return null;
  const profile = checked((await supabase.from("profiles").select("*").eq("id", studentId).eq("role", "student").eq("status", "active").maybeSingle())) as ProfileRow | null;
  return profile ? { link, profile } : null;
}

export async function getLinkedSummary(instructorId: string) {
  const students = await getLinkedStudents(instructorId);
  if (!students.length) return { students, activePlans: [] as WorkoutPlanRow[], recentSessions: [] as WorkoutSessionRow[], completedCount: 0 };
  const ids = students.map((item) => item.profile.id);
  const supabase = await client();
  const [planResult, sessionResult, countResult] = await Promise.all([
    supabase.from("workout_plans").select("*").in("student_id", ids).eq("status", "active"),
    supabase.from("workout_sessions").select("*").in("student_id", ids).eq("status", "completed").order("finished_at", { ascending: false }).limit(200),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).in("student_id", ids).eq("status", "completed"),
  ]);
  if (countResult.error) throw new Error(countResult.error.message);
  return { students, activePlans: checked(planResult) as WorkoutPlanRow[], recentSessions: checked(sessionResult) as WorkoutSessionRow[], completedCount: countResult.count ?? 0 };
}

export async function getPlansForStudent(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_plans").select("*").eq("student_id", studentId).order("created_at", { ascending: false }))) as WorkoutPlanRow[];
}

export async function getOwnPlans(instructorId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_plans").select("*").eq("instructor_id", instructorId).order("created_at", { ascending: false }))) as WorkoutPlanRow[];
}

export async function getManagedPlan(instructorId: string, planId: string) {
  if (!isUuid(planId)) return null;
  const supabase = await client();
  return checked((await supabase.from("workout_plans").select("*").eq("id", planId).eq("instructor_id", instructorId).maybeSingle())) as WorkoutPlanRow | null;
}

export async function getPlanDays(planId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_days").select("*").eq("workout_plan_id", planId).order("display_order"))) as WorkoutDayRow[];
}

export async function getPrescriptions(dayIds: string[]) {
  if (!dayIds.length) return [];
  const supabase = await client();
  return checked((await supabase.from("workout_exercises").select("*").in("workout_day_id", dayIds).order("display_order"))) as WorkoutExerciseRow[];
}

export async function getPrescriptionsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await client();
  const rows: WorkoutExerciseRow[] = [];
  for (let index = 0; index < ids.length; index += 40) {
    rows.push(...checked((await supabase.from("workout_exercises").select("*").in("id", ids.slice(index, index + 40))) as { data: WorkoutExerciseRow[] | null; error: { message: string } | null }));
  }
  return rows;
}

export async function getDaysByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await client();
  const rows: WorkoutDayRow[] = [];
  for (let index = 0; index < ids.length; index += 40) {
    rows.push(...checked((await supabase.from("workout_days").select("*").in("id", ids.slice(index, index + 40))) as { data: WorkoutDayRow[] | null; error: { message: string } | null }));
  }
  return rows;
}

export async function getCatalog(instructorId: string) {
  const supabase = await client();
  const rows = checked((await supabase.from("exercises").select("*").eq("is_active", true).order("name").limit(500))) as ExerciseRow[];
  return rows.filter((item) => item.visibility === "academy" || item.created_by === instructorId);
}

export async function getExerciseNames(ids: string[]) {
  if (!ids.length) return new Map<string, ExerciseRow>();
  const supabase = await client();
  const rows = checked((await supabase.from("exercises").select("*").in("id", [...new Set(ids)]))) as ExerciseRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getStudentSessions(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).limit(200))) as WorkoutSessionRow[];
}

export async function getStudentMetrics(studentId: string) {
  const supabase = await client();
  return checked((await supabase.from("body_metrics").select("*").eq("student_id", studentId).order("recorded_at", { ascending: false }).limit(100))) as BodyMetricRow[];
}

export async function getSessionLogs(sessionIds: string[]) {
  if (!sessionIds.length) return [];
  const supabase = await client();
  const chunks = [] as WorkoutSetLogRow[];
  for (let index = 0; index < sessionIds.length; index += 40) {
    const part = checked((await supabase.from("workout_set_logs").select("*").in("workout_session_id", sessionIds.slice(index, index + 40)))) as WorkoutSetLogRow[];
    chunks.push(...part);
  }
  return chunks;
}

export async function getStudentSession(studentId: string, sessionId: string) {
  if (!isUuid(sessionId)) return null;
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("id", sessionId).maybeSingle())) as WorkoutSessionRow | null;
}
