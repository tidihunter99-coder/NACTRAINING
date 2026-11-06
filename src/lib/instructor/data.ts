import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPages } from "@/lib/supabase/pagination";
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
  const links = await readPages<StudentInstructorRow>((from, to) => supabase.from("student_instructors").select("*").eq("instructor_id", instructorId).eq("active", true).order("id").range(from, to));
  if (!links.length) return [];
  const profiles: ProfileRow[] = [];
  for (let i = 0; i < links.length; i += 40) profiles.push(...checked(await supabase.from("profiles").select("*").in("id", links.slice(i, i + 40).map((link) => link.student_id)).eq("role", "student").eq("status", "active")) as ProfileRow[]);
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
  const activePlans: WorkoutPlanRow[] = [];
  const latestByStudent = new Map<string, WorkoutSessionRow>();
  let latestActivities: WorkoutSessionRow[] = [];
  let completedCount = 0;
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    const [plans, sessions] = await Promise.all([
      readPages<WorkoutPlanRow>((from, to) => supabase.from("workout_plans").select("*").in("student_id", batch).eq("status", "active").order("id").range(from, to)),
      readPages<WorkoutSessionRow>((from, to) => supabase.from("workout_sessions").select("*").in("student_id", batch).eq("status", "completed").order("finished_at", { ascending: false }).order("id").range(from, to)),
    ]);
    activePlans.push(...plans);
    completedCount += sessions.length;
    latestActivities = [...latestActivities, ...sessions.slice(0, 5)].sort((a, b) => (b.finished_at ?? b.started_at).localeCompare(a.finished_at ?? a.started_at)).slice(0, 5);
    for (const session of sessions) if (!latestByStudent.has(session.student_id)) latestByStudent.set(session.student_id, session);
  }
  const recentSessions = [...new Map([...latestByStudent.values(), ...latestActivities].map((session) => [session.id, session])).values()].sort((a, b) => (b.finished_at ?? b.started_at).localeCompare(a.finished_at ?? a.started_at));
  return { students, activePlans, recentSessions, completedCount };
}

export async function getPlansForStudent(studentId: string) {
  const supabase = await client();
  return readPages<WorkoutPlanRow>((from, to) => supabase.from("workout_plans").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).order("id").range(from, to));
}

export async function getOwnPlans(instructorId: string) {
  const supabase = await client();
  return readPages<WorkoutPlanRow>((from, to) => supabase.from("workout_plans").select("*").eq("instructor_id", instructorId).order("created_at", { ascending: false }).order("id").range(from, to));
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
  if (!isUuid(instructorId)) return [];
  return readPages<ExerciseRow>((from, to) => supabase.from("exercises").select("*").eq("is_active", true).or(`visibility.eq.academy,created_by.eq.${instructorId}`).order("name").order("id").range(from, to));
}

export async function getExerciseNames(ids: string[]) {
  if (!ids.length) return new Map<string, ExerciseRow>();
  const supabase = await client();
  const uniqueIds = [...new Set(ids)];
  const rows: ExerciseRow[] = [];
  for (let i = 0; i < uniqueIds.length; i += 40) rows.push(...checked(await supabase.from("exercises").select("*").in("id", uniqueIds.slice(i, i + 40))) as ExerciseRow[]);
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getStudentSessions(studentId: string) {
  const supabase = await client();
  return readPages<WorkoutSessionRow>((from, to) => supabase.from("workout_sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).order("id").range(from, to));
}

export async function getStudentMetrics(studentId: string) {
  const supabase = await client();
  return readPages<BodyMetricRow>((from, to) => supabase.from("body_metrics").select("*").eq("student_id", studentId).order("recorded_at", { ascending: false }).order("id").range(from, to));
}

export async function getSessionLogs(sessionIds: string[]) {
  if (!sessionIds.length) return [];
  const supabase = await client();
  const chunks = [] as WorkoutSetLogRow[];
  for (let index = 0; index < sessionIds.length; index += 40) {
    const part = await readPages<WorkoutSetLogRow>((from, to) => supabase.from("workout_set_logs").select("*").in("workout_session_id", sessionIds.slice(index, index + 40)).order("id").range(from, to), 1000);
    chunks.push(...part);
  }
  return chunks;
}

export async function getStudentSession(studentId: string, sessionId: string) {
  if (!isUuid(sessionId)) return null;
  const supabase = await client();
  return checked((await supabase.from("workout_sessions").select("*").eq("student_id", studentId).eq("id", sessionId).maybeSingle())) as WorkoutSessionRow | null;
}
