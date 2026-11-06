import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertLocalOrigin } from './local-test-target.mjs';

const api = process.env.SUPABASE_LOCAL_URL;
const secret = process.env.SUPABASE_LOCAL_SECRET_KEY;
assertLocalOrigin(api, '127.0.0.1');
assert.ok(secret);
const db = createClient(api, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const rows = [];
for (let offset = 0; ; offset += 500) {
  const result = await db.from('exercises').select('id,name,image_url,video_url,anatomy_image_url').range(offset, offset + 499);
  assert.ifError(result.error);
  rows.push(...result.data);
  if (result.data.length < 500) break;
}
const report = { scope: 'local_test_catalog', total: rows.length, image: 0, video: 0, gif: 0, anatomy: 0, withoutDemonstration: 0, withoutMedia: 0, brokenFiles: 0, unverifiedExternal: 0 };
const publicRoot = resolve('public');
async function exists(url) {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) {
    const path = resolve(publicRoot, `.${decodeURIComponent(url)}`);
    if (!path.startsWith(`${publicRoot}${sep}`)) return false;
    return (await stat(path).catch(() => null))?.isFile() ?? false;
  }
  if (url.startsWith(`${api}/storage/v1/object/public/nac-exercise-media/`)) {
    try { return (await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })).ok; } catch { return false; }
  }
  report.unverifiedExternal++;
  return false;
}
for (const row of rows) {
  const media = [row.image_url, row.video_url, row.anatomy_image_url];
  report.image += row.image_url ? 1 : 0;
  report.video += /\.(mp4|webm)(?:\?|$)/i.test(row.video_url || '') ? 1 : 0;
  report.gif += /\.gif(?:\?|$)/i.test(row.video_url || '') ? 1 : 0;
  report.anatomy += row.anatomy_image_url ? 1 : 0;
  report.withoutDemonstration += row.video_url ? 0 : 1;
  report.withoutMedia += media.some(Boolean) ? 0 : 1;
  for (const url of media.filter(Boolean)) if (!(await exists(url))) report.brokenFiles++;
}
console.log(JSON.stringify(report));
