import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync('.env.local', 'utf8');
function envValue(name) {
  const line = raw.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
}
const url = new URL(envValue('NEXT_PUBLIC_SUPABASE_URL'));
const key = envValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
assert.equal(url.origin, 'https://ifczsjazqxfqimquozjy.supabase.co');
assert.equal(url.pathname, '/');
assert.ok(key?.startsWith('sb_publishable_'));

async function inspect(path) {
  const response = await fetch(new URL(path, url), {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, code: body.code ?? null, body };
}

const settings = await inspect('/auth/v1/settings');
console.log(JSON.stringify({ resource: 'auth_settings', status: settings.status,
  disable_signup: settings.body.disable_signup ?? null,
  mailer_autoconfirm: settings.body.mailer_autoconfirm ?? null }));
const tables = ['profiles', 'student_instructors', 'exercises', 'workout_plans', 'workout_days',
  'workout_exercises', 'workout_sessions', 'workout_set_logs', 'body_metrics', 'audit_events'];
const results = await Promise.all(tables.map(async (table) => {
  const result = await inspect(`/rest/v1/${table}?select=id&limit=0`);
  return { table, status: result.status, code: result.code };
}));
console.log(JSON.stringify({ resource: 'rest_tables', results }));
const storage = await inspect('/storage/v1/bucket/nac-exercise-media');
console.log(JSON.stringify({ resource: 'storage_bucket', status: storage.status, code: storage.code }));
