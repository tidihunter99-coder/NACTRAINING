import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/supabase/env.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function config(env) {
  const module = { exports: {} };
  new Function("module", "exports", "process", compiled)(module, module.exports, { env });
  return module.exports.getSupabaseEnv();
}
const key = "sb_publishable_test_only";
assert.equal(config({}), null);
assert.ok(config({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }));
assert.equal(config({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_not_for_browser" }), null);
assert.equal(config({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/rest/v1", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }), null);
const remote = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
assert.equal(config(remote), null);
assert.equal(config({ ...remote, NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH: "true", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }), null);
assert.equal(config({ ...remote, NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH: "true", NEXT_PUBLIC_SITE_URL: "https://staging.example.com/entrar" }), null);
assert.equal(config({ ...remote, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/rest/v1", NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH: "true", NEXT_PUBLIC_SITE_URL: "https://staging.example.com" }), null);
assert.ok(config({ ...remote, NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH: "true", NEXT_PUBLIC_SITE_URL: "https://staging.example.com" }));
console.log("DEPLOYMENT_CONFIG_PASS: 9 verificações de URL, chave pública e autorização remota");
