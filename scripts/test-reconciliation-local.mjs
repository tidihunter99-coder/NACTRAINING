import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { sql, capture, compare, container } from './audit-catalog.mjs';

const database='nac_master_remote_v2';
// This script never accepts a connection URL or a remote target.
const resume=process.argv.includes('--resume-before');
if(!resume) {
assert.equal(sql(`select count(*) from pg_database where datname='${database}';`).trim(),'0','Local rehearsal database already exists; preserve it and inspect before rerunning');
sql(`CREATE DATABASE ${database};`);
const authSchema=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-privileges','--schema=auth'],{encoding:'utf8',maxBuffer:16*1024*1024});
sql('CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;',database);
// The NAC auth trigger is created by migration 1 after its public function exists.
sql(authSchema.replace(/CREATE TRIGGER on_auth_user_created[^;]+;/g,''),database);
sql('GRANT USAGE ON SCHEMA auth,public,extensions TO anon,authenticated,service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;',database);
const migrations=readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort();
for(const name of migrations.slice(0,2)) sql(readFileSync('supabase/migrations/'+name,'utf8'),database);
// Replace function bodies with actual captured remote definitions, including formatting.
const functions=JSON.parse(readFileSync('supabase/audit/remote-functions.json','utf8'));
sql(functions.map(f=>f.definition+';').join('\n'),database);
}
// Reproduce managed Supabase defaults; a plain CREATE DATABASE does not inherit these.
sql('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;',database);
const tableGrants=JSON.parse(readFileSync('supabase/audit/remote-table-grants.json','utf8'));
sql(tableGrants.map(g=>`GRANT ${g.privileges} ON public.${g.table_name} TO ${g.grantee};`).join('\n'),database);
const functionGrants=JSON.parse(readFileSync('supabase/audit/remote-function-grants.json','utf8'));
sql(functionGrants.map(g=>`${g.can_execute?'GRANT':'REVOKE'} EXECUTE ON FUNCTION ${g.schema_name}.${g.function_name}(${g.arguments}) ${g.can_execute?'TO':'FROM'} ${g.grantee};`).join('\n'),database);
capture('rehearsal-before',database);
const before=compare('remote','rehearsal-before').filter(r=>r.status!=='equal');
writeFileSync('supabase/audit/rehearsal-before-diff.json',JSON.stringify(before,null,2));
assert.equal(before.length,0,'Reconstructed domain must match every captured remote field');
console.log('PASS: local rehearsal matches all captured remote domain definitions');
const candidate=readFileSync('supabase/audit/reconciliation-candidate.sql','utf8');
sql(candidate,database);
capture('rehearsal-after',database);
const after=compare('local','rehearsal-after').filter(r=>r.status!=='equal');
writeFileSync('supabase/audit/rehearsal-after-diff.json',JSON.stringify(after,null,2));
assert.equal(after.length,0,'Reconciled domain must match the final 15-migration catalog');
console.log('PASS: incremental candidate matches the complete expected domain catalog');
let total=0;
for(const name of readdirSync('supabase/tests').filter(n=>n.endsWith('.sql')).sort()) {
  const result=sql("set search_path=public,extensions;\n"+readFileSync('supabase/tests/'+name,'utf8'),database);
  writeFileSync('docs/evidence/master-reconciled-'+name.replace('.sql','.log'),result);
  assert.doesNotMatch(result,/^not ok|Looks like you failed|Looks like you planned/m,name);
  const count=(result.match(/^ok \d+/gm)||[]).length;
  assert.ok(count>0,name+' must execute pgTAP assertions'); total+=count;
  console.log(`PASS ${name}: ${count} assertions`);
}
console.log(`PASS RECONCILIATION: ${total} pgTAP assertions; only local database ${database}`);
