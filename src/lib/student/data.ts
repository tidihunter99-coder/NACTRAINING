import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readPages } from "@/lib/supabase/pagination";
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

/**
 * Content that has not passed the technical/media review is deliberately not
 * sent to student client components.  The UI also checks the review status,
 * but this projection prevents pending instructions or media metadata from
 * being embedded in the React Server Component payload.
 */
function studentVisibleExercise(exercise: ExerciseRow): ExerciseRow {
  if (exercise.visual_review_status === "approved") return exercise;
  return {
    ...exercise,
    description: null,
    secondary_muscles: [],
    equipment: null,
    difficulty: null,
    instructions: null,
    video_url: null,
    image_url: null,
    anatomy_image_url: null,
    coaching_tip: null,
    common_mistakes: null,
    media_rights_note: null,
    technical_reviewer: null,
    visual_reviewed_by: null,
    visual_reviewed_at: null
  };
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
  return prescribed.map((prescription) => {
    const exercise = byId.get(prescription.exercise_id);
    return { prescription, exercise: exercise ? studentVisibleExercise(exercise) : null };
  });
}

export async function getAcademyExercises() {
  const supabase = await client();
  const exercises = await readPages<ExerciseRow>((from, to) => supabase.from("exercises").select("*").eq("visibility", "academy").eq("is_active", true).order("name").order("id").range(from, to));
  return exercises.map(studentVisibleExercise);
}

export async function getExercise(exerciseId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId)) return null;
  const supabase = await client();
  const exercise = checked((await supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle())) as ExerciseRow | null;
  return exercise ? studentVisibleExercise(exercise) : null;
}

export async function getFavoriteIds(studentId: string) {
  const supabase = await client();
  const rows = await readPages<{ exercise_id: string }>((from, to) => supabase.from("student_exercise_favorites").select("exercise_id").eq("student_id", studentId).order("exercise_id").range(from, to));
  return new Set(rows.map((row) => row.exercise_id));
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
  return readPages<WorkoutSessionRow>((from, to) => supabase.from("workout_sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).order("id").range(from, to));
}

export async function getHistoryPage(studentId: string, page: number, period?: string, day?: string) {
  const supabase = await client();
  let query = supabase.from("workout_sessions").select("*", { count: "exact" }).eq("student_id", studentId).eq("status", "completed");
  if (period && ["7", "30", "90"].includes(period)) query = query.gte("finished_at", new Date(Date.now() - Number(period) * 86400000).toISOString());
  if (day) query = query.eq("workout_day_id", /^[0-9a-f-]{36}$/i.test(day) ? day : "00000000-0000-0000-0000-000000000000");
  const result = await query.order("finished_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20 - 1);
  return { sessions: checked(result) as WorkoutSessionRow[], count: result.count ?? 0 };
}

export async function getHistoryDays(studentId: string) {
  const supabase = await client();
  const rows = await readPages<{ workout_day_id: string }>((from, to) => supabase.from("workout_sessions").select("workout_day_id").eq("student_id", studentId).eq("status", "completed").order("id").range(from, to));
  const ids = [...new Set(rows.map((row) => row.workout_day_id))];
  const days: WorkoutDayRow[] = [];
  for (let i = 0; i < ids.length; i += 40) days.push(...checked(await supabase.from("workout_days").select("*").in("id", ids.slice(i, i + 40))) as WorkoutDayRow[]);
  return days;
}

export async function getCompletedCount(studentId: string) {
  const supabase = await client();
  const { count, error } = await supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("status", "completed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getLogs(sessionId: string) {
  const supabase = await client();
  return readPages<WorkoutSetLogRow>((from, to) => supabase.from("workout_set_logs").select("*").eq("workout_session_id", sessionId).order("set_number").order("id").range(from, to));
}

export async function getMetrics(studentId: string) {
  const supabase = await client();
  return readPages<BodyMetricRow>((from, to) => supabase.from("body_metrics").select("*").eq("student_id", studentId).order("recorded_at", { ascending: false }).order("id").range(from, to));
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
