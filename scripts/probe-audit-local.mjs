import { sql } from './audit-catalog.mjs';
import { writeFileSync } from 'node:fs';
const output=sql("begin; set local role anon; select public.write_audit_event('master.local_probe','test','00000000-0000-4000-8000-000000000001'); reset role; select count(*) as forged_event_count from public.audit_events where action='master.local_probe'; rollback;");
writeFileSync('docs/evidence/master-audit-rpc-before.log',output);
console.log(output);
