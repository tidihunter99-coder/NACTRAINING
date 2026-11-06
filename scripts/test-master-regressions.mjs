import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { assertLocalOrigin } from './local-test-target.mjs';
for (const invalid of ['https://127.0.0.1:54321', 'http://127.0.0.1:54321@evil.example', 'http://localhost:54321',
  'http://127.0.0.1:54321/path', 'http://127.0.0.1:54321?key=x', 'http://127.0.0.1:54321#x', 'http://user:pass@127.0.0.1:54321']) {
  assert.throws(() => assertLocalOrigin(invalid, '127.0.0.1'));
}
assert.equal(assertLocalOrigin('http://127.0.0.1:54321', '127.0.0.1'), 'http://127.0.0.1:54321');
console.log('PASS test harness rejects misleading or remote origins');

let mode = 'ok'; let calls = 0;
const code = ts.transpileModule(readFileSync('src/lib/auth/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
const mockRequire = name => {
  if (name === '@/lib/supabase/server') return { createSupabaseServerClient: async () => mode === 'disabled' ? null : { auth: { resetPasswordForEmail: async () => {
    calls++;
    if (mode === 'network') throw Error('sensitive provider diagnostic');
    return { error: mode === 'error' ? { message: 'sensitive provider diagnostic' } : null };
  } } } };
  return {};
};
new Function('module', 'exports', 'require', 'process', code)(module, module.exports, mockRequire, { env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3003' } });
const form = new FormData(); form.set('email', 'invalid');
assert.equal((await module.exports.recoverAction({}, form)).success, false); assert.equal(calls, 0);
form.set('email', 'fictional@example.test');
for (mode of ['error', 'network', 'disabled']) {
  const result = await module.exports.recoverAction({}, form);
  assert.equal(result.success, false); assert.doesNotMatch(result.message, /sensitive|provider diagnostic/);
}
mode = 'ok';
const success = await module.exports.recoverAction({}, form);
assert.equal(success.success, true); assert.match(success.message, /Se houver uma conta/);
console.log('PASS recovery: validation, disabled config, provider error, network failure and generic success');
