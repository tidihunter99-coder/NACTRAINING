"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExercise, getProfile, getProfileByEmail, isUuid } from "@/lib/admin/data";
import { muscleGroups } from "@/lib/instructor/labels";

function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function fail(path: string, code: string): never { redirect(`${path}${path.includes("?") ? "&" : "?"}erro=${code}`); }
function confirmed(form: FormData, path: string) { if (value(form, "confirm") !== "yes") fail(path, "confirmacao"); }
async function db() { const client = await createSupabaseServerClient(); if (!client) throw new Error("Supabase indisponível"); return client; }
function refresh() { for (const path of ["/administracao", "/administracao/alunos", "/administracao/professores", "/administracao/vinculos", "/administracao/exercicios", "/administracao/auditoria"]) revalidatePath(path); }

export async function setProfileStatusAction(form: FormData) {
  const admin = await requireRole("admin");
  const id = value(form, "profileId"); const status = value(form, "status");
  const path = status === "inactive" ? "/administracao/alunos" : "/administracao/professores";
  if (!isUuid(id) || !["active", "inactive"].includes(status)) fail(path, "dados");
  const profile = await getProfile(id);
  if (!profile || profile.id === admin.id || profile.role === "admin") fail(path, "permissao");
  const destination = profile.role === "student" ? `/administracao/alunos/${id}` : `/administracao/professores/${id}`;
  confirmed(form, destination);
  const { error } = await (await db()).rpc("admin_set_profile_status", { target_profile_id: id, target_status: status });
  if (error) fail(destination, "situacao");
  refresh(); revalidatePath(destination);
  redirect(`${destination}?salvo=1`);
}

export async function enableInstructorAction(form: FormData) {
  await requireRole("admin");
  const path = "/administracao/professores";
  confirmed(form, path);
  const email = value(form, "email").toLowerCase();
  if (!email.includes("@") || email.length > 254) fail(path, "email");
  const profile = await getProfileByEmail(email);
  if (!profile || profile.role !== "student" || profile.status !== "active") fail(path, "conta");
  const { error } = await (await db()).rpc("admin_assign_role", { target_profile_id: profile.id, target_role: "instructor" });
  if (error) fail(path, "papel");
  refresh();
  redirect(`/administracao/professores/${profile.id}?salvo=1`);
}

export async function setInstructorLinkAction(form: FormData) {
  await requireRole("admin");
  const path = "/administracao/vinculos";
  confirmed(form, path);
  const active = value(form, "active");
  if (active !== "true" && active !== "false") fail(path, "dados");
  const studentEmail = value(form, "studentEmail").toLowerCase();
  const teacherEmail = value(form, "instructorEmail").toLowerCase();
  const [student, instructor] = await Promise.all([getProfileByEmail(studentEmail), getProfileByEmail(teacherEmail)]);
  if (student?.role !== "student" || instructor?.role !== "instructor") fail(path, "contas");
  const { error } = await (await db()).rpc("admin_set_instructor_link", { target_student_id: student.id, target_instructor_id: instructor.id, target_active: active === "true" });
  if (error) fail(path, "vinculo");
  refresh(); revalidatePath(`/administracao/alunos/${student.id}`); revalidatePath(`/administracao/professores/${instructor.id}`);
  redirect(`${path}?salvo=1`);
}

function exerciseFields(form: FormData) {
  const name = value(form, "name"); const muscle = value(form, "muscleGroup");
  const description = value(form, "description"); const instructions = value(form, "instructions");
  if (name.length < 2 || name.length > 160 || !muscleGroups.some((item) => item.value === muscle) || description.length > 4000 || instructions.length > 4000) throw new Error("Dados inválidos");
  return { name, muscle_group: muscle, description: description || null, instructions: instructions || null };
}
export async function createAdminExerciseAction(form: FormData) {
  const admin = await requireRole("admin");
  const path = "/administracao/exercicios";
  let fields: ReturnType<typeof exerciseFields>;
  try { fields = exerciseFields(form); } catch { fail(path, "dados"); }
  const client = await db();
  const existing = await client.from("exercises").select("id").eq("visibility", "academy").ilike("name", fields.name).limit(1);
  if (existing.error) fail(path, "consulta");
  if (existing.data?.length) fail(path, "duplicado");
  const id = crypto.randomUUID();
  const { error } = await client.from("exercises").insert({ id, ...fields, visibility: "academy", created_by: admin.id, is_active: true });
  if (error) fail(path, "criar");
  refresh();
  redirect(`/administracao/exercicios/${id}?salvo=1`);
}
export async function updateAdminExerciseAction(form: FormData) {
  await requireRole("admin");
  const id = value(form, "exerciseId");
  if (!isUuid(id)) fail("/administracao/exercicios", "dados");
  const path = `/administracao/exercicios/${id}`;
  let fields: ReturnType<typeof exerciseFields>;
  try { fields = exerciseFields(form); } catch { fail(path, "dados"); }
  const current = await getExercise(id);
  if (!current || current.referenceCount) fail(path, "historico");
  const { error } = await (await db()).from("exercises").update(fields).eq("id", id);
  if (error) fail(path, "salvar");
  refresh(); revalidatePath(path);
  redirect(`${path}?salvo=1`);
}
export async function setAdminExerciseStatusAction(form: FormData) {
  await requireRole("admin");
  const id = value(form, "exerciseId");
  if (!isUuid(id)) fail("/administracao/exercicios", "dados");
  const path = `/administracao/exercicios/${id}`;
  confirmed(form, path);
  const current = await getExercise(id);
  if (!current) fail(path, "exercicio");
  const { error } = await (await db()).from("exercises").update({ is_active: !current.exercise.is_active }).eq("id", id);
  if (error) fail(path, "situacao");
  refresh(); revalidatePath(path);
  redirect(`${path}?salvo=1`);
}
