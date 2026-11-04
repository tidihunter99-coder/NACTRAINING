/**
 * Hand-maintained mirror of the Mission 03 migration.
 * Replace this file with `supabase gen types typescript` after an authorized
 * migration has been applied to the dedicated NAC Supabase project.
 */

export type DatabaseRole = "student" | "instructor" | "admin";
export type ProfileStatus = "active" | "inactive";
export type ExerciseVisibility = "academy" | "instructor_only";
export type WorkoutPlanStatus = "draft" | "active" | "archived";
export type WorkoutSessionStatus = "in_progress" | "completed" | "cancelled";
export type IsoTimestamp = string;
export type DatabaseId = string;

export interface ProfileRow {
  id: DatabaseId;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: DatabaseRole;
  status: ProfileStatus;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface StudentInstructorRow {
  id: DatabaseId;
  student_id: DatabaseId;
  instructor_id: DatabaseId;
  active: boolean;
  assigned_at: IsoTimestamp;
  created_at: IsoTimestamp;
}

export interface ExerciseRow {
  id: DatabaseId;
  name: string;
  description: string | null;
  muscle_group: string;
  secondary_muscles: string[];
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  instructions: string | null;
  video_url: string | null;
  image_url: string | null;
  created_by: DatabaseId | null;
  visibility: ExerciseVisibility;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WorkoutPlanRow {
  id: DatabaseId;
  student_id: DatabaseId;
  instructor_id: DatabaseId;
  title: string;
  description: string | null;
  objective: string | null;
  status: WorkoutPlanStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WorkoutDayRow {
  id: DatabaseId;
  workout_plan_id: DatabaseId;
  name: string;
  description: string | null;
  display_order: number;
  estimated_duration: number | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WorkoutExerciseRow {
  id: DatabaseId;
  workout_day_id: DatabaseId;
  exercise_id: DatabaseId;
  display_order: number;
  sets: number;
  repetitions: number;
  suggested_load: number | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WorkoutSessionRow {
  id: DatabaseId;
  student_id: DatabaseId;
  workout_plan_id: DatabaseId;
  workout_day_id: DatabaseId;
  started_at: IsoTimestamp;
  finished_at: IsoTimestamp | null;
  status: WorkoutSessionStatus;
  duration_seconds: number | null;
  notes: string | null;
  created_at: IsoTimestamp;
}

export interface WorkoutSetLogRow {
  id: DatabaseId;
  workout_session_id: DatabaseId;
  workout_exercise_id: DatabaseId;
  set_number: number;
  repetitions_completed: number | null;
  load_used: number | null;
  completed: boolean;
  completed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
}

export interface BodyMetricRow {
  id: DatabaseId;
  student_id: DatabaseId;
  recorded_at: IsoTimestamp;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hip_cm: number | null;
  notes: string | null;
  created_at: IsoTimestamp;
}

export interface AuditEventRow {
  id: DatabaseId;
  actor_id: DatabaseId | null;
  action: string;
  entity_type: string;
  entity_id: DatabaseId;
  operator_reference: string | null;
  created_at: IsoTimestamp;
}
