import { assertLocalOrigin } from "./local-test-target.mjs";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { verifyResponsive } from "./student-browser-check.mjs";

const baseUrl = process.env.SUPABASE_LOCAL_URL;
const publicKey = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_LOCAL_SECRET_KEY;
const appUrl = process.env.NAC_LOCAL_APP_URL;
assertLocalOrigin(baseUrl, "127.0.0.1");
if (appUrl) assertLocalOrigin(appUrl, "localhost");
if (!baseUrl?.startsWith("http://127.0.0.1:") || !appUrl?.startsWith("http://localhost:") || !publicKey || !secretKey) throw new Error("Este teste exige apenas Supabase e Next.js locais.");

const admin = createClient(baseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = Date.now();
const password = "InstructorFlowLocal2026!#";
const emails = { studentA: `instructor-flow-student-a-${suffix}@example.test`, studentB: `instructor-flow-student-b-${suffix}@example.test`, instructorA: `instructor-flow-a-${suffix}@example.test`, instructorB: `instructor-flow-b-${suffix}@example.test` };
const ids = { studentA: "", studentB: "", instructorA: "", instructorB: "", academyExercise: "", ownExercise: "", oldPlan: "", oldDay: "", oldPrescription: "", secondPrescription: "", newPlan: "", newDay: "", newPrescription: "", session: "" };

function ok(result, label) { assert.ifError(result.error, label); return result.data; }
function location(response) { return new URL(response.headers.get("location"), appUrl).pathname; }
function decode(value) { return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'"); }
function actionForm(html, marker, additions = {}) {
  const markers = Array.isArray(marker) ? marker : [marker];
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]).find((item) => markers.every((part) => item.includes(part)));
  assert.ok(form, `Formulário ${marker} encontrado`);
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
  const page = await session.request(path);
  assert.equal(page.status, 200, `Abrir ${path}`);
  const form = actionForm(await page.text(), marker, additions);
  const response = await session.request(path, { method: "POST", body: form });
  assert.equal(response.status, 303, `Enviar ${marker}`);
  return response;
}

try {
  for (const key of ["studentA", "studentB", "instructorA", "instructorB"]) {
    const created = ok(await admin.auth.admin.createUser({ email: emails[key], password, email_confirm: true, user_metadata: { full_name: key === "studentA" ? "Aluno Professor A" : key === "studentB" ? "Aluno Professor B" : key === "instructorA" ? "Professor A Local" : "Professor B Local" } }), `Criar ${key}`);
    ids[key] = created.user.id;
  }
  for (const key of ["instructorA", "instructorB"]) ok(await admin.from("profiles").update({ role: "instructor" }).eq("id", ids[key]), `Papel ${key}`);
  ok(await admin.from("student_instructors").insert([{ student_id: ids.studentA, instructor_id: ids.instructorA }, { student_id: ids.studentB, instructor_id: ids.instructorB }]), "Vínculos locais");
  ids.academyExercise = ok(await admin.from("exercises").insert({ name: "Exercício Academia Local", muscle_group: "chest", visibility: "academy" }).select("id").single(), "Catálogo da academia").id;

  const teacherA = sessionClient();
  const teacherB = sessionClient();
  const studentA = sessionClient();
  ok(await teacherA.client.auth.signInWithPassword({ email: emails.instructorA, password }), "Login professor A");
  ok(await teacherB.client.auth.signInWithPassword({ email: emails.instructorB, password }), "Login professor B");
  ok(await studentA.client.auth.signInWithPassword({ email: emails.studentA, password }), "Login aluno A");
  const dashboard = await teacherA.request("/professor");
  assert.equal(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /Aluno Professor A/);
  assert.doesNotMatch(dashboardHtml, /Aluno Professor B/);
  assert.equal(location(await studentA.request("/professor")), "/aluno");
  console.log("PASS login do professor, painel real e bloqueio do aluno");

  const listA = await teacherA.request("/professor/alunos");
  assert.match(await listA.text(), /Aluno Professor A/);
  const listB = await teacherB.request("/professor/alunos");
  const listBHtml = await listB.text();
  assert.match(listBHtml, /Aluno Professor B/);
  assert.doesNotMatch(listBHtml, /Aluno Professor A/);
  const denied = await teacherB.request(`/professor/alunos/${ids.studentA}`);
  assert.doesNotMatch(await denied.text(), /Aluno Professor A/);
  console.log("PASS listagem e detalhe restritos ao vínculo");

  const forged = actionForm(await (await teacherB.request("/professor/fichas")).text(), "Criar rascunho", { studentId: ids.studentA, title: "Tentativa indevida" });
  const forgedResponse = await teacherB.request("/professor/fichas", { method: "POST", body: forged });
  assert.equal(location(forgedResponse), "/professor/alunos");
  assert.equal((await admin.from("workout_plans").select("id").eq("title", "Tentativa indevida")).data.length, 0);
  console.log("PASS professor não cria ficha para aluno não vinculado");

  const createdPlan = await submit(teacherA, "/professor/fichas", "Criar rascunho", { studentId: ids.studentA, title: "Ficha Antiga Local", objective: "Teste local" });
  const oldPath = location(createdPlan);
  if (!/^\/professor\/fichas\/[0-9a-f-]+$/.test(oldPath)) {
    const role = await teacherA.client.rpc("current_app_role");
    const linked = await teacherA.client.rpc("is_active_instructor_for", { target_student_id: ids.studentA });
    const probe = await teacherA.client.from("workout_plans").insert({ student_id: ids.studentA, instructor_id: ids.instructorA, title: "Diagnóstico Local", status: "draft" }).select("id").single();
    if (probe.data?.id) await admin.from("workout_plans").delete().eq("id", probe.data.id);
    throw new Error(`Falha ao criar ficha: ${createdPlan.headers.get("location")}; papel=${role.data}, vinculo=${linked.data}; Data API: ${probe.error?.message ?? "inserção direta permitida"}`);
  }
  assert.match(oldPath, /^\/professor\/fichas\/[0-9a-f-]+$/, createdPlan.headers.get("location"));
  ids.oldPlan = oldPath.split("/").at(-1);
  assert.equal(ok(await admin.from("workout_plans").select("status").eq("id", ids.oldPlan).single(), "Rascunho").status, "draft");
  const addedDay = await submit(teacherA, oldPath, "Criar divisão", { name: "Treino A Local", estimatedDuration: 45 });
  assert.equal(location(addedDay), oldPath);
  ids.oldDay = ok(await admin.from("workout_days").select("id").eq("workout_plan_id", ids.oldPlan).single(), "Divisão").id;
  const exerciseResponse = await submit(teacherA, "/professor/exercicios", "Salvar exercício", { name: "Supino do Professor A", muscleGroup: "chest", instructions: "Instrução de teste local" });
  assert.equal(location(exerciseResponse), "/professor/exercicios");
  ids.ownExercise = ok(await admin.from("exercises").select("id").eq("name", "Supino do Professor A").eq("created_by", ids.instructorA).single(), "Exercício próprio").id;
  const addedPrescription = await submit(teacherA, oldPath, "Adicionar à divisão", { exerciseId: ids.ownExercise, sets: 3, repetitions: 12, suggestedLoad: 30, restSeconds: 60, notes: "Cadência controlada" });
  assert.equal(location(addedPrescription), oldPath);
  ids.oldPrescription = ok(await admin.from("workout_exercises").select("id").eq("workout_day_id", ids.oldDay).eq("exercise_id", ids.ownExercise).single(), "Prescrição").id;
  const addedAcademy = await submit(teacherA, oldPath, "Adicionar à divisão", { exerciseId: ids.academyExercise, sets: 2, repetitions: 10 });
  assert.equal(location(addedAcademy), oldPath);
  ids.secondPrescription = ok(await admin.from("workout_exercises").select("id").eq("workout_day_id", ids.oldDay).eq("exercise_id", ids.academyExercise).single(), "Exercício da academia").id;
  console.log("PASS criação de ficha, divisão, exercício próprio e prescrição do catálogo");

  const updatePlan = await submit(teacherA, oldPath, "Salvar dados", { title: "Ficha ABC Atualizada", objective: "Condicionamento" });
  assert.equal(location(updatePlan), oldPath);
  const updateDay = await submit(teacherA, oldPath, "Salvar divisão", { name: "Treino A — Peito", estimatedDuration: 50 });
  assert.equal(location(updateDay), oldPath);
  const updatePrescription = await submit(teacherA, oldPath, "Salvar prescrição", { sets: 3, repetitions: 10, suggestedLoad: 32, restSeconds: 75 });
  assert.equal(location(updatePrescription), oldPath);
  const edited = ok(await admin.from("workout_exercises").select("repetitions,suggested_load").eq("id", ids.oldPrescription).single(), "Prescrição editada");
  assert.equal(edited.repetitions, 10);
  assert.equal(Number(edited.suggested_load), 32);
  console.log("PASS edição de ficha, divisão e séries em rascunho");

  await submit(teacherA, oldPath, "Criar divisão", { name: "Treino Extra Local" });
  const extraDay = ok(await admin.from("workout_days").select("id").eq("workout_plan_id", ids.oldPlan).eq("name", "Treino Extra Local").single(), "Divisão extra").id;
  await submit(teacherA, oldPath, "Subir Treino Extra Local");
  assert.equal(ok(await admin.from("workout_days").select("display_order").eq("id", extraDay).single(), "Ordem da divisão").display_order, 1);
  await submit(teacherA, oldPath, [`value="${extraDay}"`, "Confirmar remoção"]);
  assert.equal(ok(await admin.from("workout_days").select("id").eq("id", extraDay), "Remoção da divisão").length, 0);
  await submit(teacherA, oldPath, "Subir Exercício Academia Local");
  assert.equal(ok(await admin.from("workout_exercises").select("display_order").eq("id", ids.secondPrescription).single(), "Ordem do exercício").display_order, 1);
  await submit(teacherA, oldPath, [`value="${ids.secondPrescription}"`, "Confirmar remoção"]);
  assert.equal(ok(await admin.from("workout_exercises").select("id").eq("id", ids.secondPrescription), "Remoção do exercício").length, 0);
  console.log("PASS ordenação e remoção de divisões e exercícios apenas no rascunho");

  await verifyResponsive({ appUrl, cookies: teacherA.cookies(), paths: ["/professor", "/professor/alunos", `/professor/alunos/${ids.studentA}`, "/professor/fichas", oldPath, "/professor/exercicios"], screenshotPaths: ["/professor", oldPath], prefix: "mission-07" });

  const activated = await submit(teacherA, oldPath, "Confirmar ativação");
  assert.equal(location(activated), oldPath);
  assert.equal(ok(await admin.from("workout_plans").select("status").eq("id", ids.oldPlan).single(), "Ficha ativa").status, "active");
  assert.ok((await teacherA.client.from("workout_plans").update({ status: "draft" }).eq("id", ids.oldPlan)).error);
  const studentPlan = await studentA.request("/aluno/treinos");
  assert.match(await studentPlan.text(), /Ficha ABC Atualizada/);
  const start = await submit(studentA, "/aluno/treinos", "Iniciar treino");
  const sessionPath = location(start);
  assert.match(sessionPath, /^\/aluno\/treino\/[0-9a-f-]+$/);
  ids.session = sessionPath.split("/").at(-1);
  console.log("PASS ficha ativada e treino iniciado no painel do aluno");

  const secondPlan = await submit(teacherA, "/professor/fichas", "Criar rascunho", { studentId: ids.studentA, title: "Ficha Nova Local" });
  const newPath = location(secondPlan);
  ids.newPlan = newPath.split("/").at(-1);
  await submit(teacherA, newPath, "Criar divisão", { name: "Treino B Local" });
  ids.newDay = ok(await admin.from("workout_days").select("id").eq("workout_plan_id", ids.newPlan).single(), "Nova divisão").id;
  await submit(teacherA, newPath, "Adicionar à divisão", { exerciseId: ids.academyExercise, sets: 2, repetitions: 8 });
  ids.newPrescription = ok(await admin.from("workout_exercises").select("id").eq("workout_day_id", ids.newDay).single(), "Nova prescrição").id;
  const replacement = await submit(teacherA, newPath, "Confirmar ativação");
  assert.equal(location(replacement), newPath);
  const statuses = ok(await admin.from("workout_plans").select("id,status").in("id", [ids.oldPlan, ids.newPlan]), "Troca atômica");
  assert.equal(statuses.find((item) => item.id === ids.oldPlan).status, "archived");
  assert.equal(statuses.find((item) => item.id === ids.newPlan).status, "active");
  assert.ok((await teacherA.client.from("workout_plans").update({ title: "Alteração indevida" }).eq("id", ids.oldPlan)).error);
  assert.match(await (await studentA.request(sessionPath)).text(), /Supino do Professor A/);
  console.log("PASS substituição transacional sem perder treino em andamento");

  await submit(studentA, sessionPath, "Marcar série concluída", { repetitions: 9, load: 34 });
  const saved = ok(await admin.from("workout_set_logs").select("repetitions_completed,load_used").eq("workout_session_id", ids.session).single(), "Série do aluno");
  assert.equal(saved.repetitions_completed, 9);
  assert.equal(Number(saved.load_used), 34);
  await submit(studentA, sessionPath, "Confirmar e finalizar");
  assert.equal(ok(await admin.from("workout_sessions").select("status").eq("id", ids.session).single(), "Treino concluído").status, "completed");
  const detailPath = `/professor/alunos/${ids.studentA}/sessoes/${ids.session}`;
  const detail = await teacherA.request(detailPath);
  assert.equal(detail.status, 200);
  assert.match(await detail.text(), /Supino do Professor A/);
  const overview = await teacherA.request(`/professor/alunos/${ids.studentA}`);
  assert.match(await overview.text(), /Treino A — Peito/);
  console.log("PASS aluno registra e conclui; professor consulta séries, cargas e histórico arquivado");

  await submit(studentA, "/aluno/evolucao", 'name="weight_kg"', { weight_kg: 72.5 });
  assert.match(await (await teacherA.request(`/professor/alunos/${ids.studentA}`)).text(), /72,5/);
  const blockedSession = await teacherB.request(detailPath);
  assert.doesNotMatch(await blockedSession.text(), /Supino do Professor A/);
  const crossRead = ok(await teacherB.client.from("workout_sessions").select("id").eq("id", ids.session), "Consulta API outro professor");
  assert.equal(crossRead.length, 0);
  const crossEdit = await teacherB.client.from("workout_plans").update({ title: "Invasão" }).eq("id", ids.newPlan).select("id");
  assert.equal(crossEdit.data?.length ?? 0, 0);
  console.log("PASS evolução real e bloqueio de leitura/escrita entre professores");
  await verifyResponsive({ appUrl, cookies: teacherA.cookies(), paths: ["/professor", `/professor/alunos/${ids.studentA}`], screenshotPaths: ["/professor", `/professor/alunos/${ids.studentA}`], prefix: "mission-07-final" });
} finally {
  const errors = [];
  async function remove(label, operation) { const result = await operation; if (result.error) errors.push(`${label}: ${result.error.message}`); }
  const linkRows = ids.studentA && ids.studentB ? await admin.from("student_instructors").select("id").in("student_id", [ids.studentA, ids.studentB]) : { data: [], error: null };
  if (linkRows.error) errors.push(`vinculos: ${linkRows.error.message}`);
  if (ids.session) await remove("series", admin.from("workout_set_logs").delete().eq("workout_session_id", ids.session));
  if (ids.session) await remove("sessao", admin.from("workout_sessions").delete().eq("id", ids.session));
  if (ids.studentA) await remove("medidas", admin.from("body_metrics").delete().eq("student_id", ids.studentA));
  for (const key of ["oldPrescription", "secondPrescription", "newPrescription"]) if (ids[key]) await remove(key, admin.from("workout_exercises").delete().eq("id", ids[key]));
  for (const key of ["oldDay", "newDay"]) if (ids[key]) await remove(key, admin.from("workout_days").delete().eq("id", ids[key]));
  for (const key of ["oldPlan", "newPlan"]) if (ids[key]) await remove(key, admin.from("workout_plans").delete().eq("id", ids[key]));
  for (const key of ["ownExercise", "academyExercise"]) if (ids[key]) await remove(key, admin.from("exercises").delete().eq("id", ids[key]));
  for (const key of ["studentA", "studentB"]) if (ids[key]) await remove(`vinculo ${key}`, admin.from("student_instructors").delete().eq("student_id", ids[key]));
  const auditIds = [...Object.values(ids), ...(linkRows.data ?? []).map((row) => row.id)].filter(Boolean);
  if (auditIds.length) await remove("auditoria", admin.from("audit_events").delete().in("entity_id", auditIds));
  for (const key of ["studentA", "studentB", "instructorA", "instructorB"]) if (ids[key]) await remove(`perfil ${key}`, admin.from("profiles").delete().eq("id", ids[key]));
  for (const key of ["studentA", "studentB", "instructorA", "instructorB"]) if (ids[key]) await remove(`usuario ${key}`, admin.auth.admin.deleteUser(ids[key]));
  if (errors.length) throw new Error(`Falha na limpeza dos fixtures: ${errors.join("; ")}`);
  console.log("PASS limpeza completa dos fixtures locais");
}
console.log("INSTRUCTOR_LOCAL_PASS");
