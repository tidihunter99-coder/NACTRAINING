import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { verifyResponsive } from "./student-browser-check.mjs";

const baseUrl = process.env.SUPABASE_LOCAL_URL;
const publicKey = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_LOCAL_SECRET_KEY;
const appUrl = process.env.NAC_LOCAL_APP_URL;
if (!baseUrl?.startsWith("http://127.0.0.1:") || !appUrl?.startsWith("http://localhost:") || !publicKey || !secretKey) throw new Error("Este teste exige apenas Supabase e Next.js locais.");

const admin = createClient(baseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = Date.now();
const password = "StudentFlowLocal2026!#";
const ids = { studentA: "", studentB: "", instructor: "", plan: "", day: "", exercise: "", prescribed: "", session: "" };
const emails = { studentA: `flow-a-${suffix}@example.test`, studentB: `flow-b-${suffix}@example.test`, instructor: `flow-instructor-${suffix}@example.test` };

function ok(result, label) { assert.ifError(result.error, label); return result.data; }
function cookie(jar) { return [...jar].map(([name, value]) => `${name}=${value}`).join("; "); }
function location(response) { return new URL(response.headers.get("location"), appUrl).pathname; }
function decode(value) { return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'"); }
function actionForm(html, marker, additions = {}) {
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]).find((item) => item.includes(marker));
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
  const request = (path, options = {}) => fetch(`${appUrl}${path}`, { redirect: "manual", ...options, headers: { ...(cookie(jar) ? { Cookie: cookie(jar) } : {}), ...(options.body ? { Origin: appUrl } : {}), ...options.headers } });
  return { client, request, cookies: () => [...jar] };
}

try {
  for (const key of ["studentA", "studentB", "instructor"]) {
    const created = ok(await admin.auth.admin.createUser({ email: emails[key], password, email_confirm: true, user_metadata: { full_name: key === "studentA" ? "Aluno Fluxo A" : key === "studentB" ? "Aluno Fluxo B" : "Professor Fluxo" } }), `Criar ${key}`);
    ids[key] = created.user.id;
  }
  ok(await admin.from("profiles").update({ role: "instructor" }).eq("id", ids.instructor), "Papel de professor local");
  ok(await admin.from("student_instructors").insert([{ student_id: ids.studentA, instructor_id: ids.instructor }, { student_id: ids.studentB, instructor_id: ids.instructor }]), "Vínculos locais");
  const exercise = ok(await admin.from("exercises").insert({ name: "Supino Teste Local", muscle_group: "chest", created_by: ids.instructor, visibility: "instructor_only", instructions: "Instrução cadastrada de teste" }).select("id").single(), "Exercício local");
  ids.exercise = exercise.id;
  const plan = ok(await admin.from("workout_plans").insert({ student_id: ids.studentA, instructor_id: ids.instructor, title: "Ficha Fluxo Local", status: "draft" }).select("id").single(), "Ficha local");
  ids.plan = plan.id;
  const day = ok(await admin.from("workout_days").insert({ workout_plan_id: ids.plan, name: "Treino A Local", display_order: 1 }).select("id").single(), "Divisão local");
  ids.day = day.id;
  const prescribed = ok(await admin.from("workout_exercises").insert({ workout_day_id: ids.day, exercise_id: ids.exercise, display_order: 1, sets: 2, repetitions: 12, suggested_load: 30, rest_seconds: 60 }).select("id").single(), "Prescrição local");
  ids.prescribed = prescribed.id;
  ok(await admin.from("workout_plans").update({ status: "active" }).eq("id", ids.plan), "Ativar ficha local");

  const a = sessionClient();
  const b = sessionClient();
  ok(await a.client.auth.signInWithPassword({ email: emails.studentA, password }), "Login aluno A");
  ok(await b.client.auth.signInWithPassword({ email: emails.studentB, password }), "Login aluno B");
  const homeA = await a.request("/aluno");
  assert.equal(homeA.status, 200);
  assert.match(await homeA.text(), /Ficha Fluxo Local/);
  const homeB = await b.request("/aluno");
  assert.equal(homeB.status, 200);
  assert.doesNotMatch(await homeB.text(), /Ficha Fluxo Local/);
  console.log("PASS login, dashboard real e isolamento da ficha");

  const planA = await a.request("/aluno/treinos");
  assert.equal(planA.status, 200);
  const planHtml = await planA.text();
  assert.match(planHtml, /Supino Teste Local/);
  assert.match(planHtml, /Instrução cadastrada de teste/);
  const planB = await b.request("/aluno/treinos");
  assert.doesNotMatch(await planB.text(), /Supino Teste Local/);
  console.log("PASS ficha e exercícios prescritos, estado vazio do aluno B");

  const startForm = actionForm(planHtml, 'name="dayId"');
  const started = await a.request("/aluno/treinos", { method: "POST", body: startForm });
  assert.equal(started.status, 303);
  const sessionPath = location(started);
  assert.match(sessionPath, /^\/aluno\/treino\/[0-9a-f-]+$/);
  ids.session = sessionPath.split("/").at(-1);
  const repeated = await a.request("/aluno/treinos", { method: "POST", body: startForm });
  assert.equal(location(repeated), sessionPath);
  const open = ok(await admin.from("workout_sessions").select("id").eq("student_id", ids.studentA).eq("status", "in_progress"), "Sessões abertas");
  assert.equal(open.length, 1);
  console.log("PASS início persistido, retomada e prevenção de sessão duplicada");

  const sessionPage = await a.request(sessionPath);
  assert.equal(sessionPage.status, 200);
  const setForm = actionForm(await sessionPage.text(), 'name="setNumber"', { repetitions: 12, load: 30 });
  const saved = await a.request(sessionPath, { method: "POST", body: setForm });
  assert.equal(saved.status, 303);
  const correctedForm = new FormData();
  for (const [key, value] of setForm) correctedForm.append(key, value);
  correctedForm.set("repetitions", "10");
  correctedForm.set("load", "32");
  const corrected = await a.request(sessionPath, { method: "POST", body: correctedForm });
  assert.equal(corrected.status, 303);
  const logs = ok(await admin.from("workout_set_logs").select("*").eq("workout_session_id", ids.session), "Séries persistidas");
  assert.equal(logs.length, 1);
  assert.equal(logs[0].repetitions_completed, 10);
  assert.equal(Number(logs[0].load_used), 32);
  const refreshed = await a.request(sessionPath);
  assert.equal(refreshed.status, 200);
  assert.match(await refreshed.text(), /Registrada/);
  console.log("PASS registro, correção, atualização da página e ausência de série duplicada");

  await verifyResponsive({ appUrl, cookies: a.cookies(), sessionPath });

  const deniedPage = await b.request(sessionPath);
  const deniedHtml = await deniedPage.text();
  assert.doesNotMatch(deniedHtml, /Supino Teste Local|Treino A Local|Instrução cadastrada de teste/);
  assert.match(deniedHtml, /404|could not be found|não encontrada/i);
  const ownB = ok(await b.client.from("workout_sessions").select("id").eq("id", ids.session), "Consulta API aluno B");
  assert.equal(ownB.length, 0);
  const crossWrite = await b.client.from("workout_set_logs").insert({ workout_session_id: ids.session, workout_exercise_id: ids.prescribed, set_number: 2, repetitions_completed: 12, completed: true, completed_at: new Date().toISOString() });
  assert.ok(crossWrite.error);
  console.log("PASS rota e Data API bloqueiam aluno B na sessão do aluno A");

  const metricPage = await a.request("/aluno/evolucao");
  assert.equal(metricPage.status, 200);
  const metricForm = actionForm(await metricPage.text(), 'name="weight_kg"', { weight_kg: 75.5, waist_cm: 82 });
  assert.equal((await a.request("/aluno/evolucao", { method: "POST", body: metricForm })).status, 303);
  const metrics = ok(await a.client.from("body_metrics").select("weight_kg,waist_cm"), "Medidas aluno A");
  assert.equal(metrics.length, 1);
  assert.equal(Number(metrics[0].weight_kg), 75.5);
  assert.equal((await b.client.from("body_metrics").select("id")).data.length, 0);
  console.log("PASS evolução e medidas persistidas, isoladas por aluno");

  const profilePage = await a.request("/aluno/perfil");
  const profileForm = actionForm(await profilePage.text(), 'name="fullName"', { fullName: "Aluno Fluxo Atualizado", phone: "11999999999" });
  assert.equal((await a.request("/aluno/perfil", { method: "POST", body: profileForm })).status, 303);
  const profile = ok(await a.client.from("profiles").select("full_name,phone,role").eq("id", ids.studentA).single(), "Perfil editado");
  assert.equal(profile.full_name, "Aluno Fluxo Atualizado");
  assert.equal(profile.role, "student");
  console.log("PASS perfil editável sem alteração de papel");

  const finishHtml = await (await a.request(sessionPath)).text();
  const finishForm = actionForm(finishHtml, "Confirmar e finalizar");
  const finished = await a.request(sessionPath, { method: "POST", body: finishForm });
  assert.equal(finished.status, 303);
  const finishedAgain = await a.request(sessionPath, { method: "POST", body: finishForm });
  assert.equal(finishedAgain.status, 303);
  const completed = ok(await admin.from("workout_sessions").select("status,finished_at").eq("id", ids.session).single(), "Conclusão");
  assert.equal(completed.status, "completed");
  assert.ok(completed.finished_at);
  const history = await a.request("/aluno/historico");
  assert.equal(history.status, 200);
  assert.match(await history.text(), /Treino A Local/);
  const tamper = await a.client.from("workout_set_logs").update({ repetitions_completed: 8 }).eq("workout_session_id", ids.session).select("id");
  assert.equal(tamper.data?.length ?? 0, 0);
  console.log("PASS conclusão idempotente, histórico e imutabilidade da série");

  ok(await admin.from("workout_plans").update({ status: "archived" }).eq("id", ids.plan), "Arquivar ficha local");
  const archivedDetail = await a.request(sessionPath);
  assert.equal(archivedDetail.status, 200);
  assert.match(await archivedDetail.text(), /Supino Teste Local/);
  console.log("PASS detalhes históricos continuam legíveis após arquivar a ficha");

  ok(await a.client.auth.signOut(), "Logout aluno A");
  assert.equal(location(await a.request("/aluno/historico")), "/entrar");
  ok(await a.client.auth.signInWithPassword({ email: emails.studentA, password }), "Novo login aluno A");
  assert.match(await (await a.request("/aluno/historico")).text(), /Treino A Local/);
  ok(await admin.from("profiles").update({ status: "inactive" }).eq("id", ids.studentB), "Inativar aluno B local");
  assert.equal(location(await b.request("/aluno")), "/entrar");
  assert.equal((await b.client.from("workout_plans").select("id")).data.length, 0);
  console.log("PASS histórico após novo login e bloqueio do aluno inativo");
} finally {
  const cleanupErrors = [];
  async function remove(label, operation) { const result = await operation; if (result.error) cleanupErrors.push(`${label}: ${result.error.message}`); }
  const linkRows = ids.studentA && ids.studentB ? await admin.from("student_instructors").select("id").in("student_id", [ids.studentA, ids.studentB]) : { data: [], error: null };
  if (linkRows.error) cleanupErrors.push(`vinculos: ${linkRows.error.message}`);
  if (ids.session) await remove("series", admin.from("workout_set_logs").delete().eq("workout_session_id", ids.session));
  if (ids.session) await remove("sessao", admin.from("workout_sessions").delete().eq("id", ids.session));
  if (ids.studentA) await remove("medidas", admin.from("body_metrics").delete().eq("student_id", ids.studentA));
  if (ids.prescribed) await remove("prescricao", admin.from("workout_exercises").delete().eq("id", ids.prescribed));
  if (ids.day) await remove("divisao", admin.from("workout_days").delete().eq("id", ids.day));
  if (ids.plan) await remove("ficha", admin.from("workout_plans").delete().eq("id", ids.plan));
  if (ids.exercise) await remove("exercicio", admin.from("exercises").delete().eq("id", ids.exercise));
  for (const key of ["studentA", "studentB"]) if (ids[key]) await remove(`vinculo ${key}`, admin.from("student_instructors").delete().eq("student_id", ids[key]));
  const auditIds = [...Object.values(ids), ...(linkRows.data ?? []).map((row) => row.id)].filter(Boolean);
  if (auditIds.length) await remove("auditoria", admin.from("audit_events").delete().in("entity_id", auditIds));
  for (const key of ["studentA", "studentB", "instructor"]) if (ids[key]) await remove(`perfil ${key}`, admin.from("profiles").delete().eq("id", ids[key]));
  for (const key of ["studentA", "studentB", "instructor"]) if (ids[key]) await remove(`usuario ${key}`, admin.auth.admin.deleteUser(ids[key]));
  if (cleanupErrors.length) throw new Error(`Falha ao limpar fixtures locais: ${cleanupErrors.join("; ")}`);
  console.log("PASS limpeza completa dos fixtures locais");
}
console.log("STUDENT_LOCAL_PASS");
