"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCatalog, getLinkedStudent, getManagedPlan, getPlanDays, getPrescriptions, isUuid } from "@/lib/instructor/data";

function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function fail(path: string, code: string): never { redirect(`${path}${path.includes("?") ? "&" : "?"}erro=${code}`); }
function boundedText(form: FormData, name: string, max: number, min = 0) {
  const text = value(form, name);
  if (text.length < min || text.length > max) throw new Error("Texto inválido");
  return text || null;
}
function boundedNumber(form: FormData, name: string, min: number, max: number, required = true) {
  const raw = value(form, name);
  if (!raw && !required) return null;
  const number = Number(raw.replace(",", "."));
  if (!Number.isFinite(number) || number < min || number > max) throw new Error("Número inválido");
  return number;
}
async function supabase() {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Supabase indisponível");
  return client;
}
async function draftFor(instructorId: string, planId: string) {
  const plan = await getManagedPlan(instructorId, planId);
  if (!plan || plan.status !== "draft" || !(await getLinkedStudent(instructorId, plan.student_id))) fail("/professor/fichas", "permissao");
  return plan;
}

export async function createPlanAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const studentId = value(form, "studentId");
  if (!isUuid(studentId) || !(await getLinkedStudent(instructor.id, studentId))) fail("/professor/alunos", "vinculo");
  let title: string | null, description: string | null, objective: string | null;
  try {
    title = boundedText(form, "title", 160, 2);
    description = boundedText(form, "description", 4000);
    objective = boundedText(form, "objective", 1000);
  } catch { fail(`/professor/alunos/${studentId}`, "dados"); }
  const db = await supabase();
  const planId = crypto.randomUUID();
  const { error } = await db.from("workout_plans").insert({ id: planId, student_id: studentId, instructor_id: instructor.id, title: title!, description, objective, status: "draft" });
  if (error) fail(`/professor/alunos/${studentId}`, "criar");
  revalidatePath("/professor");
  revalidatePath(`/professor/alunos/${studentId}`);
  redirect(`/professor/fichas/${planId}?salvo=1`);
}

export async function updatePlanAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  if (!isUuid(planId)) fail("/professor/fichas", "ficha");
  await draftFor(instructor.id, planId);
  let title: string | null, description: string | null, objective: string | null;
  try {
    title = boundedText(form, "title", 160, 2);
    description = boundedText(form, "description", 4000);
    objective = boundedText(form, "objective", 1000);
  } catch { fail(`/professor/fichas/${planId}`, "dados"); }
  const db = await supabase();
  const { error } = await db.from("workout_plans").update({ title: title!, description, objective }).eq("id", planId).eq("instructor_id", instructor.id).eq("status", "draft");
  if (error) fail(`/professor/fichas/${planId}`, "salvar");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1`);
}

export async function addDayAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  if (!isUuid(planId)) fail("/professor/fichas", "ficha");
  await draftFor(instructor.id, planId);
  let name: string | null, description: string | null, duration: number | null;
  try {
    name = boundedText(form, "name", 100, 1);
    description = boundedText(form, "description", 4000);
    duration = boundedNumber(form, "estimatedDuration", 1, 600, false);
    if (duration !== null && !Number.isInteger(duration)) throw new Error("Duração inválida");
  } catch { fail(`/professor/fichas/${planId}`, "dados"); }
  const days = await getPlanDays(planId);
  if (days.some((day) => day.name.toLocaleLowerCase("pt-BR") === name!.toLocaleLowerCase("pt-BR"))) redirect(`/professor/fichas/${planId}`);
  const displayOrder = Math.max(0, ...days.map((day) => day.display_order)) + 1;
  const db = await supabase();
  const { error } = await db.from("workout_days").insert({ workout_plan_id: planId, name: name!, description, estimated_duration: duration, display_order: displayOrder });
  if (error) fail(`/professor/fichas/${planId}`, "divisao");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1`);
}

export async function updateDayAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  if (!isUuid(planId) || !isUuid(dayId)) fail("/professor/fichas", "ficha");
  await draftFor(instructor.id, planId);
  let name: string | null, description: string | null, duration: number | null;
  try {
    name = boundedText(form, "name", 100, 1);
    description = boundedText(form, "description", 4000);
    duration = boundedNumber(form, "estimatedDuration", 1, 600, false);
    if (duration !== null && !Number.isInteger(duration)) throw new Error("Duração inválida");
  } catch { fail(`/professor/fichas/${planId}`, "dados"); }
  const db = await supabase();
  const { data, error } = await db.from("workout_days").update({ name: name!, description, estimated_duration: duration }).eq("id", dayId).eq("workout_plan_id", planId).select("id").maybeSingle();
  if (error || !data) fail(`/professor/fichas/${planId}`, "divisao");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}

export async function addPrescriptionAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  const exerciseId = value(form, "exerciseId");
  if (!isUuid(planId) || !isUuid(dayId) || !isUuid(exerciseId)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  const days = await getPlanDays(planId);
  if (!days.some((day) => day.id === dayId)) fail(`/professor/fichas/${planId}`, "divisao");
  const catalog = await getCatalog(instructor.id);
  if (!catalog.some((exercise) => exercise.id === exerciseId)) fail(`/professor/fichas/${planId}`, "exercicio");
  let sets: number | null, repetitions: number | null, load: number | null, rest: number | null, notes: string | null;
  try {
    sets = boundedNumber(form, "sets", 1, 100);
    repetitions = boundedNumber(form, "repetitions", 1, 100);
    load = boundedNumber(form, "suggestedLoad", 0, 1000, false);
    rest = boundedNumber(form, "restSeconds", 0, 3600, false);
    notes = boundedText(form, "notes", 4000);
    if (![sets, repetitions, rest].every((item) => item === null || Number.isInteger(item))) throw new Error("Número inteiro necessário");
  } catch { fail(`/professor/fichas/${planId}`, "dados"); }
  const existing = await getPrescriptions([dayId]);
  if (existing.some((item) => item.exercise_id === exerciseId)) fail(`/professor/fichas/${planId}`, "duplicado");
  const displayOrder = Math.max(0, ...existing.map((item) => item.display_order)) + 1;
  const db = await supabase();
  const { error } = await db.from("workout_exercises").insert({ workout_day_id: dayId, exercise_id: exerciseId, display_order: displayOrder, sets: sets!, repetitions: repetitions!, suggested_load: load, rest_seconds: rest, notes });
  if (error) fail(`/professor/fichas/${planId}`, "exercicio");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}

export async function updatePrescriptionAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  const prescriptionId = value(form, "prescriptionId");
  if (!isUuid(planId) || !isUuid(dayId) || !isUuid(prescriptionId)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  if (!(await getPlanDays(planId)).some((day) => day.id === dayId)) fail(`/professor/fichas/${planId}`, "divisao");
  let sets: number | null, repetitions: number | null, load: number | null, rest: number | null, notes: string | null;
  try {
    sets = boundedNumber(form, "sets", 1, 100);
    repetitions = boundedNumber(form, "repetitions", 1, 100);
    load = boundedNumber(form, "suggestedLoad", 0, 1000, false);
    rest = boundedNumber(form, "restSeconds", 0, 3600, false);
    notes = boundedText(form, "notes", 4000);
    if (![sets, repetitions, rest].every((item) => item === null || Number.isInteger(item))) throw new Error("Número inteiro necessário");
  } catch { fail(`/professor/fichas/${planId}`, "dados"); }
  const db = await supabase();
  const { data, error } = await db.from("workout_exercises").update({ sets: sets!, repetitions: repetitions!, suggested_load: load, rest_seconds: rest, notes }).eq("id", prescriptionId).eq("workout_day_id", dayId).select("id").maybeSingle();
  if (error || !data) fail(`/professor/fichas/${planId}`, "exercicio");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}

export async function activatePlanAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  if (!isUuid(planId)) fail("/professor/fichas", "ficha");
  const plan = await getManagedPlan(instructor.id, planId);
  if (!plan || !(await getLinkedStudent(instructor.id, plan.student_id))) fail("/professor/fichas", "permissao");
  const db = await supabase();
  const { error } = await db.rpc("activate_instructor_workout_plan", { target_plan_id: planId });
  if (error) fail(`/professor/fichas/${planId}`, error.message.includes("another instructor") ? "outra-ficha" : "ativacao");
  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath(`/professor/alunos/${plan.student_id}`);
  revalidatePath("/aluno/treinos");
  redirect(`/professor/fichas/${planId}?ativado=1`);
}

export async function archivePlanAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  if (!isUuid(planId)) fail("/professor/fichas", "ficha");
  const plan = await getManagedPlan(instructor.id, planId);
  if (!plan || plan.status !== "active" || !(await getLinkedStudent(instructor.id, plan.student_id))) fail("/professor/fichas", "permissao");
  const db = await supabase();
  const { data, error } = await db.from("workout_plans").update({ status: "archived" }).eq("id", planId).eq("instructor_id", instructor.id).eq("status", "active").select("id").maybeSingle();
  if (error || !data) fail(`/professor/fichas/${planId}`, "arquivar");
  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath(`/professor/alunos/${plan.student_id}`);
  revalidatePath("/aluno/treinos");
  redirect(`/professor/fichas/${planId}?arquivado=1`);
}

export async function createExerciseAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const groups = ["chest", "back", "shoulders", "biceps", "triceps", "quadriceps", "hamstrings", "glutes", "calves", "abdomen", "core", "full_body"];
  const group = value(form, "muscleGroup");
  let name: string | null, description: string | null, instructions: string | null;
  try {
    name = boundedText(form, "name", 160, 2);
    description = boundedText(form, "description", 4000);
    instructions = boundedText(form, "instructions", 4000);
    if (["imageUrl", "videoUrl", "anatomyImageUrl"].some((field) => value(form, field))) throw new Error("A associação de mídia requer administrador");
    if (!groups.includes(group)) throw new Error("Grupo inválido");
  } catch { fail("/professor/exercicios", "dados"); }
  const db = await supabase();
  const { data: matching } = await db.from("exercises").select("id,name").ilike("name", name!).eq("muscle_group", group).limit(20);
  if (matching?.some((exercise) => exercise.name.toLocaleLowerCase("pt-BR") === name!.toLocaleLowerCase("pt-BR"))) fail("/professor/exercicios", "duplicado");
  const { error } = await db.from("exercises").insert({ name: name!, muscle_group: group, description, instructions, created_by: instructor.id, visibility: "instructor_only", is_active: true });
  if (error) fail("/professor/exercicios", "salvar");
  revalidatePath("/professor/exercicios");
  redirect("/professor/exercicios?salvo=1");
}

export async function removeDayAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  if (!isUuid(planId) || !isUuid(dayId)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  if (!(await getPlanDays(planId)).some((day) => day.id === dayId)) fail(`/professor/fichas/${planId}`, "divisao");
  const db = await supabase();
  const { error } = await db.rpc("remove_draft_workout_day", { target_day_id: dayId });
  if (error) fail(`/professor/fichas/${planId}`, "remover");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1`);
}

export async function removePrescriptionAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  const prescriptionId = value(form, "prescriptionId");
  if (!isUuid(planId) || !isUuid(dayId) || !isUuid(prescriptionId)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  if (!(await getPlanDays(planId)).some((day) => day.id === dayId)) fail(`/professor/fichas/${planId}`, "divisao");
  const db = await supabase();
  const { data, error } = await db.from("workout_exercises").delete().eq("id", prescriptionId).eq("workout_day_id", dayId).select("id").maybeSingle();
  if (error || !data) fail(`/professor/fichas/${planId}`, "remover");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}

export async function moveDayAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  const direction = Number(value(form, "direction"));
  if (!isUuid(planId) || !isUuid(dayId) || ![-1, 1].includes(direction)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  if (!(await getPlanDays(planId)).some((day) => day.id === dayId)) fail(`/professor/fichas/${planId}`, "divisao");
  const db = await supabase();
  const { error } = await db.rpc("move_draft_workout_day", { target_day_id: dayId, direction });
  if (error) fail(`/professor/fichas/${planId}`, "ordem");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}

export async function movePrescriptionAction(form: FormData) {
  const instructor = await requireRole("instructor");
  const planId = value(form, "planId");
  const dayId = value(form, "dayId");
  const prescriptionId = value(form, "prescriptionId");
  const direction = Number(value(form, "direction"));
  if (!isUuid(planId) || !isUuid(dayId) || !isUuid(prescriptionId) || ![-1, 1].includes(direction)) fail("/professor/fichas", "dados");
  await draftFor(instructor.id, planId);
  if (!(await getPrescriptions([dayId])).some((item) => item.id === prescriptionId)) fail(`/professor/fichas/${planId}`, "exercicio");
  const db = await supabase();
  const { error } = await db.rpc("move_draft_workout_exercise", { target_prescription_id: prescriptionId, direction });
  if (error) fail(`/professor/fichas/${planId}`, "ordem");
  revalidatePath(`/professor/fichas/${planId}`);
  redirect(`/professor/fichas/${planId}?salvo=1#divisao-${dayId}`);
}
