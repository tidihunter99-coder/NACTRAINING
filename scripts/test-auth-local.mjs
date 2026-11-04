import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baseUrl = process.env.SUPABASE_LOCAL_URL;
const key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_LOCAL_SECRET_KEY;
const appUrl = process.env.NAC_LOCAL_APP_URL;
if (!baseUrl?.startsWith("http://127.0.0.1:") || !key) throw new Error("Defina somente credenciais do Supabase local.");
if (appUrl && (!appUrl.startsWith("http://localhost:") || !secret)) throw new Error("Testes do app exigem origem e chave de serviço locais.");

const email = `nac-local-${Date.now()}@example.test`;
const cleanupEmails = [email];
const oldPassword = "LocalTest2026!#";
const newPassword = "NewLocalTest2026!#";
const storage = new Map();
const client = createClient(baseUrl, key, { auth: {
  flowType: "pkce",
  autoRefreshToken: false,
  detectSessionInUrl: false,
  storage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
} });

async function mailLink(after, recipient = email, subject = "") {
  for (let attempt = 0; attempt < 25; attempt++) {
    const list = await (await fetch("http://127.0.0.1:54324/api/v1/messages")).json();
    const message = list.messages?.find(m => m.To?.some(t => t.Address === recipient) && m.Subject?.includes(subject) && new Date(m.Created).getTime() >= after - 2000);
    if (message) {
      const detail = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)).json();
      const source = `${detail.Text ?? ""} ${detail.HTML ?? ""}`.replaceAll("&amp;", "&");
      const link = source.match(/https?:\/\/[^\s<>"']+\/auth\/v1\/verify\?[^\s<>"']+/)?.[0];
      if (link) return link;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("E-mail de teste não encontrado no Mailpit local.");
}

async function confirm(link) {
  const response = await fetch(link, { redirect: "manual" });
  const location = response.headers.get("location");
  assert.ok(location, "Auth deve responder com redirecionamento");
  const parsed = new URL(location);
  assert.equal(parsed.origin, "http://localhost:3000");
  const code = parsed.searchParams.get("code");
  assert.ok(code, "Auth deve fornecer código PKCE");
  const { error } = await client.auth.exchangeCodeForSession(code);
  assert.ifError(error);
}

const signupAt = Date.now();
const signup = await client.auth.signUp({ email, password: oldPassword, options: {
  data: { full_name: "Aluno Local", role: "admin", status: "active" },
  emailRedirectTo: "http://localhost:3000/auth/confirm?destino=aluno",
} });
assert.ifError(signup.error);
assert.equal(signup.data.session, null, "cadastro requer confirmação");
console.log("PASS cadastro sem sessão antes da confirmação");

const preLogin = await client.auth.signInWithPassword({ email, password: oldPassword });
assert.ok(preLogin.error, "login deve falhar antes da confirmação");
console.log("PASS login bloqueado antes da confirmação");

await confirm(await mailLink(signupAt));
const user = await client.auth.getUser();
assert.ifError(user.error);
assert.ok(user.data.user?.email_confirmed_at);
console.log("PASS confirmação de e-mail PKCE");

const profile = await client.from("profiles").select("role,status,full_name").eq("id", user.data.user.id).single();
assert.ifError(profile.error);
assert.equal(profile.data.role, "student", "metadata não pode promover papel");
assert.equal(profile.data.status, "active");
console.log("PASS perfil student criado pelo banco, apesar de metadata maliciosa");

const roleChange = await client.from("profiles").update({ role: "admin" }).eq("id", user.data.user.id);
assert.ok(roleChange.error);
console.log("PASS aluno não altera o próprio papel");

assert.ifError((await client.auth.signOut()).error);
assert.ok((await client.auth.getUser()).error);
console.log("PASS logout");

assert.ok((await client.auth.signInWithPassword({ email, password: "WrongPassword2026!" })).error);
assert.ifError((await client.auth.signInWithPassword({ email, password: oldPassword })).error);
assert.ok((await client.auth.getUser()).data.user);
console.log("PASS login correto, login incorreto e sessão persistida");

const recoverAt = Date.now();
assert.ifError((await client.auth.resetPasswordForEmail(email, { redirectTo: "http://localhost:3000/auth/confirm?destino=redefinir-senha" })).error);
await confirm(await mailLink(recoverAt));
assert.ifError((await client.auth.updateUser({ password: newPassword })).error);
assert.ifError((await client.auth.signOut()).error);
assert.ok((await client.auth.signInWithPassword({ email, password: oldPassword })).error);
assert.ifError((await client.auth.signInWithPassword({ email, password: newPassword })).error);
console.log("PASS recuperação, redefinição, senha antiga rejeitada e nova aceita");

if (appUrl) {
  const jar = new Map();
  const serverClient = createServerClient(baseUrl, key, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
  } });
  const privileged = createClient(baseUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const request = async (path, withSession = true) => {
    const cookie = withSession ? [...jar].map(([name, value]) => `${name}=${value}`).join("; ") : "";
    return fetch(`${appUrl}${path}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
  };
  const location = response => new URL(response.headers.get("location"), appUrl).pathname;
  assert.equal(location(await request("/aluno", false)), "/entrar");
  assert.ifError((await serverClient.auth.signInWithPassword({ email, password: newPassword })).error);
  const studentPage = await request("/aluno");
  assert.equal(studentPage.status, 200);
  assert.match(await studentPage.text(), /(Bom dia|Boa tarde|Boa noite), Aluno!/);
  assert.equal(location(await request("/professor")), "/aluno");
  assert.equal(location(await request("/administracao")), "/aluno");
  assert.equal((await request("/aluno")).status, 200, "sessão persiste em nova requisição");
  console.log("PASS aluno autorizado, rotas de professor/admin bloqueadas e sessão persistida");

  const authCookieNames = [...jar.keys()].filter(name => name.includes("-auth-token"));
  assert.ok(authCookieNames.length > 0);
  authCookieNames.sort((a, b) => a.localeCompare(b));
  const authCookieName = authCookieNames[0].replace(/\.\d+$/, "");
  const encodedSession = authCookieNames.map(name => jar.get(name)).join("");
  assert.ok(encodedSession.startsWith("base64-"));
  const expiredSession = JSON.parse(Buffer.from(encodedSession.slice(7), "base64").toString("utf8"));
  expiredSession.expires_at = 1;
  expiredSession.expires_in = 0;
  expiredSession.access_token = "expired";
  expiredSession.refresh_token = "expired";
  const expiredValue = `base64-${Buffer.from(JSON.stringify(expiredSession)).toString("base64")}`;
  const expiredResponse = await fetch(`${appUrl}/aluno`, { redirect: "manual", headers: { Cookie: `${authCookieName}=${expiredValue}` } });
  assert.equal(location(expiredResponse), "/entrar");
  console.log("PASS sessão vencida com refresh inválido é rejeitada");

  assert.ifError((await privileged.from("profiles").update({ status: "inactive" }).eq("id", user.data.user.id)).error);
  assert.equal(location(await request("/aluno")), "/entrar");
  assert.ifError((await privileged.from("profiles").update({ status: "active", role: "instructor" }).eq("id", user.data.user.id)).error);
  assert.equal((await request("/professor")).status, 200);
  assert.equal(location(await request("/administracao")), "/professor");
  console.log("PASS inativo bloqueado e professor sem acesso administrativo");

  assert.ifError((await privileged.from("profiles").update({ role: "admin" }).eq("id", user.data.user.id)).error);
  assert.equal((await request("/administracao")).status, 200);
  assert.equal(location(await request("/aluno")), "/administracao");
  assert.ifError((await privileged.from("profiles").update({ role: "student" }).eq("id", user.data.user.id)).error);
  console.log("PASS administrador local isolado por papel; perfil fictício restaurado para aluno");

  assert.ifError((await serverClient.auth.signOut()).error);
  assert.equal(location(await request("/aluno")), "/entrar");
  console.log("PASS logout da sessão SSR");

  const callbackEmail = `nac-callback-${Date.now()}@example.test`;
  cleanupEmails.push(callbackEmail);
  const callbackJar = new Map();
  const callbackClient = createServerClient(baseUrl, key, { cookies: {
    getAll: () => [...callbackJar].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => callbackJar.set(name, value)),
  } });
  const callbackStart = Date.now();
  const callbackSignup = await callbackClient.auth.signUp({ email: callbackEmail, password: oldPassword, options: {
    data: { full_name: "Callback Local" }, emailRedirectTo: `${appUrl}/auth/confirm?destino=aluno`,
  } });
  assert.ifError(callbackSignup.error);
  assert.equal(callbackSignup.data.session, null);
  const verification = await fetch(await mailLink(callbackStart, callbackEmail), { redirect: "manual" });
  const callbackUrl = verification.headers.get("location");
  assert.ok(callbackUrl);
  assert.equal(new URL(callbackUrl).origin, appUrl);
  const callbackCookie = [...callbackJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const callbackResponse = await fetch(callbackUrl, { redirect: "manual", headers: { Cookie: callbackCookie } });
  assert.equal(location(callbackResponse), "/aluno");
  for (const item of callbackResponse.headers.getSetCookie()) {
    const [name, value] = item.split(";", 1)[0].split("=", 2);
    callbackJar.set(name, value);
  }
  const authenticatedCookie = [...callbackJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const callbackPanel = await fetch(`${appUrl}/aluno`, { redirect: "manual", headers: { Cookie: authenticatedCookie } });
  assert.equal(callbackPanel.status, 200, "callback deve estabelecer sessão SSR");
  assert.match(await callbackPanel.text(), /(Bom dia|Boa tarde|Boa noite), Callback!/);
  console.log("PASS callback Next.js confirma e-mail e estabelece sessão SSR");

  const callbackRecoverAt = Date.now();
  assert.ifError((await callbackClient.auth.resetPasswordForEmail(callbackEmail, { redirectTo: `${appUrl}/auth/confirm?destino=redefinir-senha` })).error);
  const resetVerification = await fetch(await mailLink(callbackRecoverAt, callbackEmail, "Reset"), { redirect: "manual" });
  const resetUrl = resetVerification.headers.get("location");
  assert.ok(resetUrl);
  const resetCookie = [...callbackJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const resetResponse = await fetch(resetUrl, { redirect: "manual", headers: { Cookie: resetCookie } });
  assert.equal(location(resetResponse), "/redefinir-senha");
  for (const item of resetResponse.headers.getSetCookie()) {
    const [name, value] = item.split(";", 1)[0].split("=", 2);
    callbackJar.set(name, value);
  }
  const resetPageCookie = [...callbackJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const resetPage = await fetch(`${appUrl}/redefinir-senha`, { redirect: "manual", headers: { Cookie: resetPageCookie } });
  assert.equal(resetPage.status, 200);
  console.log("PASS callback Next.js de recuperação abre a página de nova senha");

  const resetHtml = await resetPage.text();
  const resetForm = new FormData();
  for (const match of resetHtml.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\s*\/>/g)) {
    resetForm.append(match[1], (match[2] ?? "").replaceAll("&amp;", "&").replaceAll("&quot;", '"'));
  }
  assert.ok([...resetForm.keys()].some(name => name.startsWith("$ACTION_REF_")));
  const callbackNewPassword = "CallbackNewLocal2026!#";
  resetForm.append("password", callbackNewPassword);
  resetForm.append("confirmPassword", callbackNewPassword);
  const actionResponse = await fetch(`${appUrl}/redefinir-senha`, { method: "POST", redirect: "manual", headers: { Cookie: resetPageCookie, Origin: appUrl }, body: resetForm });
  assert.equal(actionResponse.status, 303);
  assert.equal(new URL(actionResponse.headers.get("location"), appUrl).searchParams.get("estado"), "senha-alterada");
  const credentialCheck = createClient(baseUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });
  assert.ok((await credentialCheck.auth.signInWithPassword({ email: callbackEmail, password: oldPassword })).error);
  assert.ifError((await credentialCheck.auth.signInWithPassword({ email: callbackEmail, password: callbackNewPassword })).error);
  console.log("PASS Server Action redefine senha e invalida a senha anterior");

  const formEmail = `nac-form-${Date.now()}@example.test`;
  cleanupEmails.push(formEmail);
  const formPage = await fetch(`${appUrl}/cadastro`);
  assert.equal(formPage.status, 200);
  const formHtml = await formPage.text();
  const signupForm = new FormData();
  for (const match of formHtml.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\s*\/>/g)) {
    signupForm.append(match[1], (match[2] ?? "").replaceAll("&amp;", "&").replaceAll("&quot;", '"'));
  }
  assert.ok([...signupForm.keys()].some(name => name.startsWith("$ACTION_REF_")));
  signupForm.append("fullName", "Formulario Local");
  signupForm.append("email", formEmail);
  signupForm.append("password", oldPassword);
  signupForm.append("confirmPassword", oldPassword);
  signupForm.append("accept", "on");
  signupForm.append("role", "admin");
  const formSignupAt = Date.now();
  const formResponse = await fetch(`${appUrl}/cadastro`, { method: "POST", redirect: "manual", headers: { Origin: appUrl }, body: signupForm });
  assert.equal(formResponse.status, 200);
  assert.match(await formResponse.text(), /e-mail de confirmação/);
  const formJar = new Map();
  for (const item of formResponse.headers.getSetCookie()) {
    const [name, value] = item.split(";", 1)[0].split("=", 2);
    formJar.set(name, value);
  }
  const formVerification = await fetch(await mailLink(formSignupAt, formEmail), { redirect: "manual" });
  const formCallback = formVerification.headers.get("location");
  assert.ok(formCallback);
  const formCookie = [...formJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const formConfirmation = await fetch(formCallback, { redirect: "manual", headers: { Cookie: formCookie } });
  assert.equal(location(formConfirmation), "/aluno");
  for (const item of formConfirmation.headers.getSetCookie()) {
    const [name, value] = item.split(";", 1)[0].split("=", 2);
    formJar.set(name, value);
  }
  const formSessionCookie = [...formJar].map(([name, value]) => `${name}=${value}`).join("; ");
  const formPanel = await fetch(`${appUrl}/aluno`, { redirect: "manual", headers: { Cookie: formSessionCookie } });
  assert.equal(formPanel.status, 200);
  assert.match(await formPanel.text(), /(Bom dia|Boa tarde|Boa noite), Formulario!/);
  const formProfile = await privileged.from("profiles").select("role").eq("email", formEmail).single();
  assert.ifError(formProfile.error);
  assert.equal(formProfile.data.role, "student");
  console.log("PASS formulário de cadastro, confirmação e papel student imposto pelo banco");
}

await client.auth.signOut();
if (secret) {
  const localService = createClient(baseUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  for (const testEmail of cleanupEmails) {
    const profile = await localService.from("profiles").select("id").eq("email", testEmail).maybeSingle();
    assert.ifError(profile.error);
    if (!profile.data) continue;
    const id = profile.data.id;
    assert.ifError((await localService.from("audit_events").delete().eq("entity_id", id)).error);
    assert.ifError((await localService.from("profiles").delete().eq("id", id)).error);
    assert.ifError((await localService.auth.admin.deleteUser(id)).error);
  }
  console.log("PASS limpeza das contas fictícias de autenticação local");
}
console.log("AUTH_LOCAL_PASS");
