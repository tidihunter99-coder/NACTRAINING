import { readFileSync } from 'node:fs';
import { queries, sql } from './audit-catalog.mjs';

// Read-only comparison aid. The SQL printed for the remote contains SELECT only.
// Do not treat matching fingerprints as proof about data rows or unqueried schemas.
const orderBy = {
  columns: 'q.table_name,q.ordinal_position',
  constraints: 'q.table_name,q.conname',
  indexes: 'q.tablename,q.indexname',
  triggers: 'q.schema_name,q.table_name,q.trigger_name',
  functions: 'q.schema_name,q.function_name,q.arguments',
  policies: 'q.tablename,q.policyname',
  'table-grants': 'q.table_name,q.grantee',
  'function-grants': 'q.schema_name,q.function_name,q.arguments,q.grantee',
  tables: 'q.table_name',
  enums: 'q.type_name,q.sort_order',
};

for (const [name, query] of Object.entries(queries)) {
  const historical = JSON.parse(readFileSync(`supabase/audit/remote-${name}.json`, 'utf8'));
  const literal = JSON.stringify(historical);
  if (literal.includes('$mission11$')) throw new Error('Unsafe delimiter in historical snapshot');
  const expected = sql(`select md5($mission11$${literal}$mission11$::jsonb::text);`).trim();
  const remoteQuery = `select '${name}' as category, md5(coalesce(jsonb_agg(q order by ${orderBy[name]}),'[]'::jsonb)::text) as fingerprint from (${query}) q;`;
  console.log(JSON.stringify({ category: name, expected, remoteQuery }));
}
