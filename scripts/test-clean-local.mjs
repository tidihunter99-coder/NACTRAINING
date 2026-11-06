import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { sql, capture, compare, container } from './audit-catalog.mjs';
const database = 'nac_master_clean';
assert.equal(sql(`select count(*) from pg_database where datname='${database}';`).trim(), '0', 'Preserve an existing clean rehearsal; inspect before another run');
sql(`CREATE DATABASE ${database};`);
const auth = execFileSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--no-owner', '--no-privileges', '--schema=auth'], { encoding: 'utf8' });
sql('CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;', database);
sql(auth.replace(/CREATE TRIGGER on_auth_user_created[^;]+;/g, ''), database);
sql('GRANT USAGE ON SCHEMA auth,public,extensions TO anon,authenticated,service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;', database);
for (const name of readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) {
  sql(readFileSync('supabase/migrations/' + name, 'utf8'), database);
  console.log('APPLIED LOCAL', name);
}
capture('clean', database);
const diff = compare('local', 'clean').filter(r => r.status !== 'equal');
writeFileSync('supabase/audit/clean-diff.json', JSON.stringify(diff, null, 2));
assert.equal(diff.length, 0, 'Clean installation must equal the expected catalog');
let total = 0;
for (const name of readdirSync('supabase/tests').filter(n => n.endsWith('.sql')).sort()) {
  const output = sql('set search_path=public,extensions;\n' + readFileSync('supabase/tests/' + name, 'utf8'), database);
  writeFileSync('docs/evidence/master-clean-' + name.replace('.sql', '.log'), output);
  assert.doesNotMatch(output, /^not ok|Looks like you failed|Looks like you planned/m, name);
  const count = (output.match(/^ok \d+/gm) || []).length;
  assert.ok(count > 0); total += count;
}
console.log(`CLEAN_LOCAL_PASS: 15 migrations, ${total} assertions, zero captured catalog differences`);
