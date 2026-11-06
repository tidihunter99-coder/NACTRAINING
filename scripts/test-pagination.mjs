import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('src/lib/supabase/pagination.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', code)(module, module.exports);
const { readPages, pageNumber } = module.exports;
const sourceRows = Array.from({ length: 1205 }, (_, id) => ({ id }));
let calls = 0;
const rows = await readPages(async (from, to) => {
  calls++; assert.ok(to - from < 250);
  // A gateway configured below our page size must not silently truncate data.
  return { data: sourceRows.slice(from, Math.min(to + 1, from + 73)), error: null };
});
assert.deepEqual(rows, sourceRows); assert.equal(calls, 18);
let largeCalls = 0;
assert.deepEqual(await readPages(async (from, to) => { largeCalls++; return { data: sourceRows.slice(from, to + 1), error: null }; }, 1000), sourceRows);
assert.equal(largeCalls, 3);
await assert.rejects(readPages(async () => ({ data: [], error: null }), 1001), /Invalid page size/);
assert.deepEqual(await readPages(async () => ({ data: [], error: null })), []);
await assert.rejects(readPages(async () => ({ data: null, error: { message: 'provider unavailable' } })), /provider unavailable/);
for (const invalid of [undefined, '', '-1', 'NaN', 'Infinity', '1.5', '100001']) assert.equal(pageNumber(invalid), 1);
assert.equal(pageNumber('42'), 42);
console.log('PAGINATION_PASS: 1205 rows, capped gateway, empty set, provider error and page validation');
