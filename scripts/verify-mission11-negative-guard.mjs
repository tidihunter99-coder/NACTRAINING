import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sql } from './audit-catalog.mjs';

const database = 'nac_mission11_rehearsal';
const before = sql("select count(*) from storage.buckets where id='nac-exercise-media';", database).trim();
assert.equal(before, '1', 'Rehearsal must already be migrated');
let rejected = false;
try {
  sql(readFileSync('supabase/audit/mission11-incremental-candidate.sql', 'utf8'), database);
} catch (error) {
  rejected = /Catalog mismatch: remote\//.test(error.message);
  console.log(`SECOND_APPLICATION_REJECTED=${rejected}`);
}
assert.ok(rejected, 'Precondition must reject a repeated application');
const after = sql("select count(*) from storage.buckets where id='nac-exercise-media';", database).trim();
assert.equal(after, before, 'Rejected transaction changed bucket count');
console.log(`BUCKETS_BEFORE=${before} BUCKETS_AFTER=${after}`);
