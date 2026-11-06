import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuditEventRow, ExerciseRow, ProfileRow, StudentInstructorRow, WorkoutPlanRow, WorkoutSessionRow } from "@/types/database";
import { exerciseCoverage } from "@/lib/admin/exercise-coverage";

export const pageSize = 20;
export function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export function safePage(value?: string) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100000) : 1; }
export function safeSearch(value?: string) { return (value ?? "").trim().slice(0, 80).replace(/[%,()*]/g, ""); }
async function db() { const client = await createSupabaseServerClient(); if (!client) throw new Error("Supabase indisponível"); return client; }
function checked<T>(result: { data: T | null; error: { message: string } | null }): T { if (result.error) throw new Error(result.error.message); return result.data as T; }

export type AdminCounts = { students_total: number; students_active: number; students_inactive: number; instructors_total: number; instructors_active: number; students_linked: number; students_unlinked: number; plans_active: number; sessions_completed: number };
export async function getAdminCounts() {
  const since = new Date(); since.setDate(since.getDate() - 30);
  return checked((await (await db()).rpc("admin_dashboard_counts", { since_at: since.toISOString() }))) as AdminCounts;
}
export async function getAdminWeeklyActivity() {
  return checked(await (await db()).rpc("admin_completed_weekly")) as { week_start: string; total: number }[];
}
export async function getProfilesPage(role: "student" | "instructor", page: number, search = "", status = "") {
  const client = await db();
  let query = client.from("profiles").select("*", { count: "exact" }).eq("role", role).order("created_at", { ascending: false });
  if (search) query = query.ilike("full_name", `%${safeSearch(search)}%`);
  if (status === "active" || status === "inactive") query = query.eq("status", status);
  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  return { rows: checked(result) as ProfileRow[], count: result.count ?? 0 };
}
export async function getProfile(id: string, role?: "student" | "instructor") {
  if (!isUuid(id)) return null;
  let query = (await db()).from("profiles").select("*").eq("id", id);
  if (role) query = query.eq("role", role);
  return checked(await query.maybeSingle()) as ProfileRow | null;
}
export async function getProfileByEmail(email: string) {
  return checked(await (await db()).from("profiles").select("*").eq("email", email.trim().toLowerCase()).maybeSingle()) as ProfileRow | null;
}
export async function getStudentListExtras(studentIds: string[]) {
  if (!studentIds.length) return { links: [] as StudentInstructorRow[], teachers: [] as ProfileRow[], plans: [] as WorkoutPlanRow[] };
  const client = await db();
  const [linkResult, planResult] = await Promise.all([
    client.from("student_instructors").select("*").in("student_id", studentIds).eq("active", true),
    client.from("workout_plans").select("*").in("student_id", studentIds).eq("status", "active"),
  ]);
  const links = checked(linkResult) as StudentInstructorRow[];
  const teacherIds = [...new Set(links.map((row) => row.instructor_id))];
  const teachers = teacherIds.length ? checked(await client.from("profiles").select("*").in("id", teacherIds)) as ProfileRow[] : [];
  return { links, teachers, plans: checked(planResult) as WorkoutPlanRow[] };
}
export async function getInstructorCounts(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = checked(await (await db()).rpc("admin_instructor_link_counts", { target_ids: ids })) as { instructor_id: string; total: number }[];
  return new Map(rows.map((row) => [row.instructor_id, Number(row.total)]));
}
export async function getStudentDetail(id: string) {
  const profile = await getProfile(id, "student"); if (!profile) return null;
  const client = await db();
  const [linkResult, planResult, sessionResult] = await Promise.all([
    client.from("student_instructors").select("*").eq("student_id", id).order("assigned_at", { ascending: false }),
    client.from("workout_plans").select("*").eq("student_id", id).eq("status", "active").maybeSingle(),
    client.from("workout_sessions").select("*", { count: "exact" }).eq("student_id", id).eq("status", "completed").order("finished_at", { ascending: false }).limit(1),
  ]);
  const links = checked(linkResult) as StudentInstructorRow[];
  const teacherIds = [...new Set(links.map((row) => row.instructor_id))];
  const teachers = teacherIds.length ? checked(await client.from("profiles").select("*").in("id", teacherIds)) as ProfileRow[] : [];
  return { profile, links, teachers, plan: checked(planResult) as WorkoutPlanRow | null, lastSession: (checked(sessionResult) as WorkoutSessionRow[])[0] ?? null, completedCount: sessionResult.count ?? 0 };
}
export async function getInstructorDetail(id: string) {
  const profile = await getProfile(id, "instructor"); if (!profile) return null;
  const client = await db();
  const result = await client.from("student_instructors").select("*", { count: "exact" }).eq("instructor_id", id).order("assigned_at", { ascending: false }).limit(20);
  const links = checked(result) as StudentInstructorRow[];
  const students = links.length ? checked(await client.from("profiles").select("*").in("id", links.map((row) => row.student_id))) as ProfileRow[] : [];
  const activeResult = await client.from("student_instructors").select("id", { count: "exact", head: true }).eq("instructor_id", id).eq("active", true);
  if (activeResult.error) throw new Error(activeResult.error.message);
  return { profile, links, students, linkCount: result.count ?? 0, activeLinkCount: activeResult.count ?? 0 };
}
export async function getLinksPage(page: number, active = "") {
  const client = await db();
  let query = client.from("student_instructors").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (active === "active" || active === "inactive") query = query.eq("active", active === "active");
  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  const links = checked(result) as StudentInstructorRow[];
  const ids = [...new Set(links.flatMap((row) => [row.student_id, row.instructor_id]))];
  const profiles = ids.length ? checked(await client.from("profiles").select("*").in("id", ids)) as ProfileRow[] : [];
  return { links, profiles, count: result.count ?? 0 };
}
export async function getExercisesPage(page: number, search = "", muscle = "", state = "", coverage = "") {
  const client = await db();
  const query = () => {
    let result = client.from("exercises").select("*", { count: "exact" }).order("name").order("id");
    if (search) result = result.ilike("name", `%${safeSearch(search)}%`);
    if (muscle) result = result.eq("muscle_group", muscle);
    if (state === "active" || state === "inactive") result = result.eq("is_active", state === "active");
    return result;
  };
  if (!coverage) {
    const result = await query().range((page - 1) * pageSize, page * pageSize - 1);
    return { rows: checked(result) as ExerciseRow[], count: result.count ?? 0 };
  }
  const all: ExerciseRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const batch = checked(await query().range(offset, offset + 499)) as ExerciseRow[];
    all.push(...batch);
    if (batch.length < 500) break;
  }
  const filtered = all.filter((exercise) => {
    const item = exerciseCoverage(exercise);
    if (coverage === "complete") return item.complete;
    if (coverage === "no-image") return !item.image;
    if (coverage === "no-demo") return !item.demonstration;
    if (coverage === "review") return exercise.visual_review_status !== "approved";
    if (coverage === "problem") return item.invalidUrls > 0 || item.unsupportedDemonstration;
    return true;
  });
  return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), count: filtered.length };
}
export async function getExerciseMediaAudit() {
  const client = await db();
  const rows: ExerciseRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client.from("exercises").select("*").order("id").range(offset, offset + 499);
    const page = checked(result) as typeof rows;
    rows.push(...page);
    if (page.length < 500) break;
  }
  const status = rows.map(exerciseCoverage);
  return {
    total: rows.length,
    image: status.filter((item) => item.image).length,
    video: rows.filter((row, index) => status[index].demonstration && /\.(mp4|webm)(?:\?|$)/i.test(row.video_url!)).length,
    gif: rows.filter((row, index) => status[index].demonstration && /\.gif(?:\?|$)/i.test(row.video_url!)).length,
    anatomy: status.filter((item) => item.anatomy).length,
    complete: status.filter((item) => item.complete).length,
    awaitingReview: rows.filter((row) => row.visual_review_status !== "approved").length,
    withoutImage: status.filter((item) => !item.image).length,
    withoutDemonstration: status.filter((item) => !item.demonstration).length,
    withoutMedia: status.filter((item) => !item.image && !item.demonstration && !item.anatomy).length,
    invalidUrls: status.reduce((sum, item) => sum + item.invalidUrls + Number(item.unsupportedDemonstration), 0),
  };
}
export async function getExerciseDuplicateCounts(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = checked(await (await db()).rpc("admin_exercise_duplicate_counts", { target_ids: ids })) as { exercise_id: string; duplicate_count: number }[];
  return new Map(rows.map((row) => [row.exercise_id, Number(row.duplicate_count)]));
}
export async function getExercise(id: string) {
  if (!isUuid(id)) return null;
  const client = await db();
  const exercise = checked(await client.from("exercises").select("*").eq("id", id).maybeSingle()) as ExerciseRow | null;
  if (!exercise) return null;
  const references = await client.from("workout_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id);
  if (references.error) throw new Error(references.error.message);
  return { exercise, referenceCount: references.count ?? 0 };
}
export async function getAuditPage(page: number, action = "") {
  let query = (await db()).from("audit_events").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (action) query = query.eq("action", action);
  const result = await query.range((page - 1) * pageSize, page * pageSize - 1);
  const rows = checked(result) as AuditEventRow[];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => !!id))];
  const actors = actorIds.length ? checked(await (await db()).from("profiles").select("*").in("id", actorIds)) as ProfileRow[] : [];
  return { rows, actors, count: result.count ?? 0 };
}
