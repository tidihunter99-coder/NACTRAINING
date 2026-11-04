import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { verifyResponsive } from "./student-browser-check.mjs";

const baseUrl = process.env.SUPABASE_LOCAL_URL;
const publicKey = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_LOCAL_SECRET_KEY;
const appUrl = process.env.NAC_LOCAL_APP_URL;
if (!baseUrl?.startsWith("http://127.0.0.1:") || !appUrl?.startsWith("http://localhost:") || !publicKey || !secretKey) throw new Error("Este teste exige apenas Supabase e Next.js locais.");
const service = createClient(baseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = Date.now(); const password = "AdminFlowLocal2026!#";
const emails = { admin: `admin-flow-admin-${suffix}@example.test`, teacher: `admin-flow-teacher-${suffix}@example.test`, student: `admin-flow-student-${suffix}@example.test`, other: `admin-flow-other-${suffix}@example.test` };
const ids = { admin: "", teacher: "", student: "", other: "", exercise: "", duplicate: "", plan: "", day: "", prescription: "", session: "", link: "" };
function ok(result, label) { assert.ifError(result.error, label); return result.data; }
function location(response) { return new URL(response.headers.get("location"), appUrl).pathname; }
function decode(value) { return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'"); }
function actionForm(html, marker, additions = {}) {
  const markers = Array.isArray(marker) ? marker : [marker];
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]).find((item) => markers.every((part) => item.includes(part)));
  assert.ok(form, `Formulário ${marker} encontrado; conteúdo: ${html.replace(/<script\b[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(-900)}`);
  const data = new FormData();
  for (const input of form.match(/<input\b[^>]*>/g) ?? []) {
    const attrs = Object.fromEntries([...input.matchAll(/([\w$-]+)="([^"]*)"/g)].map((match) => [match[1], decode(match[2])]));
    if (attrs.type === "hidden" && attrs.name) data.append(attrs.name, attrs.value ?? "");
  }
  assert.ok([...data.keys()].some((key) => key.startsWith("$ACTION_")), `Server Action para ${marker}`);
  for (const [key, value] of Object.entries(additions)) data.set(key, String(value));
  return data;
}
function sessionClient() {
  const jar = new Map();
  const client = createServerClient(baseUrl, publicKey, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)) } });
  const request = (path, options = {}) => fetch(`${appUrl}${path}`, { redirect: "manual", ...options, headers: { ...(jar.size ? { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") } : {}), ...(options.body ? { Origin: appUrl } : {}), ...options.headers } });
  return { client, request, cookies: () => [...jar] };
}
async function submit(session, path, marker, additions = {}) {
  const page = await session.request(path); assert.equal(page.status, 200, `Abrir ${path}`);
  const form = actionForm(await page.text(), marker, additions);
  const response = await session.request(path, { method: "POST", body: form });
  assert.equal(response.status, 303, `Enviar ${marker}`);
  return response;
}
try {
  for (const key of Object.keys(emails)) {
    const name = { admin: "Administrador Local", teacher: "Professor Admin Local", student: "Aluno Admin Local", other: "Aluno Sem Vínculo" }[key];
    ids[key] = ok(await service.auth.admin.createUser({ email: emails[key], password, email_confirm: true, user_metadata: { full_name: name } }), `Criar ${key}`).user.id;
  }
  // Bootstrap is local-only; production administrator provisioning remains outside the public app.
  ok(await service.from("profiles").update({ role: "admin" }).eq("id", ids.admin), "Administrador local");
  const admin = sessionClient(); const teacher = sessionClient(); const student = sessionClient(); const other = sessionClient();
  ok(await admin.client.auth.signInWithPassword({ email: emails.admin, password }), "Login administrador");
  ok(await teacher.client.auth.signInWithPassword({ email: emails.teacher, password }), "Login candidato");
  ok(await student.client.auth.signInWithPassword({ email: emails.student, password }), "Login aluno");
  ok(await other.client.auth.signInWithPassword({ email: emails.other, password }), "Login outro aluno");
  assert.equal(location(await teacher.request("/administracao")), "/aluno");
  assert.equal(location(await student.request("/administracao")), "/aluno");
  assert.equal((await admin.request("/administracao")).status, 200);
  console.log("PASS autenticação administrativa e bloqueio de usuários comuns");

  const teacherEnabled = await submit(admin, "/administracao/professores", "Habilitar professor", { email: emails.teacher, confirm: "yes" });
  assert.equal(location(teacherEnabled), `/administracao/professores/${ids.teacher}`);
  assert.equal(ok(await service.from("profiles").select("role").eq("id", ids.teacher).single(), "Papel professor").role, "instructor");
  assert.equal((await teacher.request("/professor")).status, 200);
  const forgedRole = await student.client.rpc("admin_assign_role", { target_profile_id: ids.student, target_role: "admin" });
  assert.ok(forgedRole.error);
  console.log("PASS habilitação segura de professor e bloqueio de autopromoção");

  const linked = await submit(admin, "/administracao/vinculos", "Salvar vínculo", { studentEmail: emails.student, instructorEmail: emails.teacher, confirm: "yes" });
  assert.equal(location(linked), "/administracao/vinculos");
  ids.link = ok(await service.from("student_instructors").select("id").eq("student_id", ids.student).eq("instructor_id", ids.teacher).single(), "Vínculo").id;
  await submit(admin, "/administracao/vinculos", "Salvar vínculo", { studentEmail: emails.student, instructorEmail: emails.teacher, confirm: "yes" });
  assert.equal(ok(await service.from("student_instructors").select("id").eq("student_id", ids.student), "Sem duplicata").length, 1);
  assert.ok((await other.client.rpc("admin_set_instructor_link", { target_student_id: ids.other, target_instructor_id: ids.teacher, target_active: true })).error);
  console.log("PASS vínculo autorizado, idempotência e bloqueio da Data API");

  const created = await submit(admin, "/administracao/exercicios", "Salvar exercício", { name: "Exercício Admin Local", muscleGroup: "chest" });
  const exercisePath = location(created); ids.exercise = exercisePath.split("/").at(-1);
  assert.match(exercisePath, /^\/administracao\/exercicios\/[0-9a-f-]+$/);
  assert.equal(ok(await service.from("exercises").select("visibility").eq("id", ids.exercise).single(), "Catálogo").visibility, "academy");
  ids.duplicate = ok(await service.from("exercises").insert({ name: " exercício admin local ", muscle_group: "chest", visibility: "academy" }).select("id").single(), "Duplicata fictícia").id;
  assert.match(await (await admin.request("/administracao/exercicios?busca=Exerc%C3%ADcio%20Admin%20Local")).text(), /Possível duplicata/);
  console.log("PASS catálogo central e identificação de duplicatas");

  const planResponse = await submit(teacher, "/professor/fichas", "Criar rascunho", { studentId: ids.student, title: "Ficha Administrativa Local" });
  const planPath = location(planResponse); ids.plan = planPath.split("/").at(-1);
  assert.match(planPath, /^\/professor\/fichas\/[0-9a-f-]+$/);
  await submit(teacher, planPath, "Criar divisão", { name: "Treino Admin A" });
  ids.day = ok(await service.from("workout_days").select("id").eq("workout_plan_id", ids.plan).single(), "Divisão").id;
  await submit(teacher, planPath, "Adicionar à divisão", { exerciseId: ids.exercise, sets: 2, repetitions: 10, suggestedLoad: 20 });
  ids.prescription = ok(await service.from("workout_exercises").select("id").eq("workout_day_id", ids.day).single(), "Prescrição").id;
  await submit(teacher, planPath, "Confirmar ativação");
  assert.match(await (await student.request("/aluno/treinos")).text(), /Ficha Administrativa Local/);
  console.log("PASS professor cria e ativa ficha; aluno visualiza");

  const start = await submit(student, "/aluno/treinos", "Iniciar treino");
  const sessionPath = location(start); ids.session = sessionPath.split("/").at(-1);
  await submit(student, sessionPath, "Marcar série concluída", { repetitions: 9, load: 22 });
  await submit(student, sessionPath, "Confirmar e finalizar");
  const set = ok(await service.from("workout_set_logs").select("repetitions_completed,load_used").eq("workout_session_id", ids.session).single(), "Série");
  assert.equal(set.repetitions_completed, 9); assert.equal(Number(set.load_used), 22);
  assert.match(await (await teacher.request(`/professor/alunos/${ids.student}/sessoes/${ids.session}`)).text(), /Exercício Admin Local/);
  const dashboard = await admin.request("/administracao"); const html = await dashboard.text();
  assert.match(html, /Treinos concluídos · 30 dias/);
  const count = ok(await admin.client.rpc("admin_dashboard_counts", { since_at: new Date(Date.now() - 30 * 86400000).toISOString() }), "Indicadores");
  assert.ok(Number(count.sessions_completed) >= 1); assert.ok(Number(count.plans_active) >= 1);
  console.log("PASS treino concluído, resultado do professor e indicadores administrativos reais");
  await verifyResponsive({ appUrl, cookies: admin.cookies(), paths: ["/administracao", `/administracao/alunos/${ids.student}`], screenshotPaths: ["/administracao", `/administracao/alunos/${ids.student}`], prefix: "mission-08-active" });

  const studentProbe = await admin.client.from("profiles").select("id,role,status").eq("id", ids.student).eq("role", "student").maybeSingle();
  assert.ifError(studentProbe.error);
  assert.equal(studentProbe.data?.id, ids.student, "Admin lê o perfil do aluno antes do detalhe");
  const inactive = await submit(admin, `/administracao/alunos/${ids.student}`, "Inativar aluno", { confirm: "yes" });
  assert.equal(location(inactive), `/administracao/alunos/${ids.student}`);
  assert.equal(location(await student.request("/aluno")), "/entrar");
  assert.equal(ok(await student.client.from("workout_sessions").select("id").eq("id", ids.session), "RLS inativo").length, 0);
  await submit(admin, `/administracao/alunos/${ids.student}`, "Reativar aluno", { confirm: "yes" });
  assert.equal((await student.request("/aluno")).status, 200);
  assert.match(await (await student.request("/aluno/historico")).text(), /Treino Admin A/);
  console.log("PASS inativação, bloqueio por rota e Data API, reativação e histórico preservado");

  const exerciseDetail = await admin.request(exercisePath);
  assert.match(await exerciseDetail.text(), /campos de conteúdo estão bloqueados/);
  assert.ok((await admin.client.from("exercises").update({ name: "Alteração proibida" }).eq("id", ids.exercise)).error);
  await submit(admin, exercisePath, "Arquivar exercício", { confirm: "yes" });
  assert.equal(ok(await service.from("exercises").select("is_active").eq("id", ids.exercise).single(), "Exercício arquivado").is_active, false);
  const removeLink = await submit(admin, "/administracao/vinculos", "Retirar vínculo", { confirm: "yes" });
  assert.equal(location(removeLink), "/administracao/vinculos");
  assert.equal(ok(await service.from("workout_plans").select("status").eq("id", ids.plan).single(), "Ficha histórica").status, "archived");
  assert.equal(ok(await service.from("student_instructors").select("active").eq("id", ids.link).single(), "Vínculo inativo").active, false);
  const blockedStudentPage = await teacher.request(`/professor/alunos/${ids.student}`);
  assert.doesNotMatch(await blockedStudentPage.text(), /Aluno Admin Local/);
  assert.equal(ok(await student.client.from("workout_sessions").select("id").eq("id", ids.session), "Histórico após vínculo").length, 1);
  assert.ok((await admin.client.from("audit_events").insert({ action: "forged", entity_type: "profiles", entity_id: ids.student })).error);
  console.log("PASS arquivamento, transferência de acesso, histórico e auditoria protegida");

  await verifyResponsive({ appUrl, cookies: admin.cookies(), paths: ["/administracao", "/administracao/alunos", `/administracao/alunos/${ids.student}`, "/administracao/professores", `/administracao/professores/${ids.teacher}`, "/administracao/vinculos", "/administracao/exercicios", exercisePath, "/administracao/auditoria"], screenshotPaths: ["/administracao", `/administracao/alunos/${ids.student}`], prefix: "mission-08" });
} finally {
  const errors = [];
  async function remove(label, operation) { const result = await operation; if (result.error) errors.push(`${label}: ${result.error.message}`); }
  if (ids.session) await remove("séries", service.from("workout_set_logs").delete().eq("workout_session_id", ids.session));
  if (ids.session) await remove("sessão", service.from("workout_sessions").delete().eq("id", ids.session));
  if (ids.prescription) await remove("prescrição", service.from("workout_exercises").delete().eq("id", ids.prescription));
  if (ids.day) await remove("divisão", service.from("workout_days").delete().eq("id", ids.day));
  if (ids.plan) await remove("ficha", service.from("workout_plans").delete().eq("id", ids.plan));
  if (ids.duplicate) await remove("duplicata", service.from("exercises").delete().eq("id", ids.duplicate));
  if (ids.exercise) await remove("exercício", service.from("exercises").delete().eq("id", ids.exercise));
  if (ids.link) await remove("vínculo", service.from("student_instructors").delete().eq("id", ids.link));
  const entities = Object.values(ids).filter(Boolean);
  if (entities.length) await remove("auditoria", service.from("audit_events").delete().in("entity_id", entities));
  for (const key of Object.keys(emails)) if (ids[key]) await remove(`perfil ${key}`, service.from("profiles").delete().eq("id", ids[key]));
  for (const key of Object.keys(emails)) if (ids[key]) await remove(`usuário ${key}`, service.auth.admin.deleteUser(ids[key]));
  if (errors.length) throw new Error(`Limpeza local: ${errors.join("; ")}`);
  console.log("PASS limpeza completa dos fixtures administrativos locais");
}
console.log("ADMIN_LOCAL_PASS");
