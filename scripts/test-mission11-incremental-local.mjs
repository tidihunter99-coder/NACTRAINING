import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { sql, capture, compare, container } from './audit-catalog.mjs';

// Intentionally fixed local Docker database. No URL, project ref or CLI link.
const database = 'nac_mission11_rehearsal';
assert.equal(sql(`select count(*) from pg_database where datname='${database}';`).trim(), '0',
  'Dedicated rehearsal database already exists; inspect it before another run');
sql(`CREATE DATABASE ${database};`);
console.log(`CREATED_LOCAL_DATABASE=${database}`);

const authSchema = execFileSync('docker', [
  'exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres',
  '--schema-only', '--no-owner', '--no-privileges', '--schema=auth',
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
sql('CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;', database);
sql(authSchema.replace(/CREATE TRIGGER on_auth_user_created[^;]+;/g, ''), database);
sql('GRANT USAGE ON SCHEMA auth, public, extensions TO anon, authenticated, service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;', database);

// Storage service schema is emulated only to exercise migration DDL/policies.
// This is not a full Supabase Storage end-to-end test.
sql(`CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text NOT NULL, name text NOT NULL);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets, storage.objects TO authenticated, service_role;`, database);

const migrations = readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql')).sort();
assert.equal(migrations.length, 20);
for (const name of migrations.slice(0, 2)) sql(readFileSync(`supabase/migrations/${name}`, 'utf8'), database);
const remoteFunctions = JSON.parse(readFileSync('supabase/audit/remote-functions.json', 'utf8'));
sql(remoteFunctions.map((item) => `${item.definition};`).join('\n'), database);
sql('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;', database);
const tableGrants = JSON.parse(readFileSync('supabase/audit/remote-table-grants.json', 'utf8'));
sql(tableGrants.map((grant) => `GRANT ${grant.privileges} ON public.${grant.table_name} TO ${grant.grantee};`).join('\n'), database);
const functionGrants = JSON.parse(readFileSync('supabase/audit/remote-function-grants.json', 'utf8'));
sql(functionGrants.map((grant) => `${grant.can_execute ? 'GRANT' : 'REVOKE'} EXECUTE ON FUNCTION ${grant.schema_name}.${grant.function_name}(${grant.arguments}) ${grant.can_execute ? 'TO' : 'FROM'} ${grant.grantee};`).join('\n'), database);

capture('mission11-rehearsal-before', database);
const before = compare('remote', 'mission11-rehearsal-before').filter((item) => item.status !== 'equal');
writeFileSync('supabase/audit/mission11-rehearsal-before-diff.json', JSON.stringify(before, null, 2));
assert.equal(before.length, 0, 'Rehearsal must match all ten observed remote catalogs');
console.log('REMOTE_BASELINE_CATALOGS=10/10 MATCH');

sql(readFileSync('supabase/audit/mission11-incremental-candidate.sql', 'utf8'), database);
capture('mission11-rehearsal-after', database);
const after = compare('mission11-target', 'mission11-rehearsal-after').filter((item) => item.status !== 'equal');
writeFileSync('supabase/audit/mission11-rehearsal-after-diff.json', JSON.stringify(after, null, 2));
assert.equal(after.length, 0, 'Rehearsal must match all ten 20-migration target catalogs');
console.log('TARGET_CATALOGS=10/10 MATCH');

const storage = sql(`select (select count(*) from storage.buckets where id='nac-exercise-media')::text || '|' ||
  (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'nac_exercise_media_%')::text || '|' ||
  has_function_privilege('anon','public.write_audit_event(text,text,uuid)','EXECUTE')::text;`, database).trim();
assert.equal(storage, '1|3|false');
console.log('STORAGE_BUCKET=1 POLICIES=3 AUDIT_ANON_EXECUTE=false');

let total = 0;
for (const name of readdirSync('supabase/tests').filter((item) => item.endsWith('.sql')).sort()) {
  const result = sql(`set search_path=public,extensions;\n${readFileSync(`supabase/tests/${name}`, 'utf8')}`, database);
  writeFileSync(`docs/evidence/mission11-rehearsal-${name.replace('.sql', '.log')}`, result);
  assert.doesNotMatch(result, /^not ok|Looks like you failed|Looks like you planned/m, name);
  const count = (result.match(/^ok \d+/gm) || []).length;
  assert.ok(count > 0, name);
  total += count;
  console.log(`PASS ${name}: ${count}`);
}
assert.equal(total, 134);
const media = sql(`set search_path=public,extensions;\n${readFileSync('supabase/tests-extra/nac_visual_media_test.sql', 'utf8')}`, database);
writeFileSync('docs/evidence/mission11-rehearsal-visual-media.log', media);
assert.doesNotMatch(media, /^not ok|Looks like you failed|Looks like you planned/m);
const mediaCount = (media.match(/^ok \d+/gm) || []).length;
assert.equal(mediaCount, 12);
console.log(`PGTAP_ORIGINAL=${total}/134 PGTAP_MEDIA=${mediaCount}/12`);
console.log('MISSION11_REHEARSAL_PASS');
