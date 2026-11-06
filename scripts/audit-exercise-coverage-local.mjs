import assert from 'node:assert/strict';
import { stat, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { assertLocalOrigin } from './local-test-target.mjs';

const api = process.env.SUPABASE_LOCAL_URL;
const secret = process.env.SUPABASE_LOCAL_SECRET_KEY;
assertLocalOrigin(api, '127.0.0.1');
assert.ok(secret);
const db = createClient(api, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const rows = [];
for (let offset = 0; ; offset += 500) {
  const result = await db.from('exercises').select('id,name,muscle_group,image_url,video_url,anatomy_image_url,instructions,coaching_tip,common_mistakes,visual_review_status,media_rights_note,technical_reviewer').order('id').range(offset, offset + 499);
  assert.ifError(result.error);
  rows.push(...result.data);
  if (result.data.length < 500) break;
}

const publicRoot = resolve('public');
async function inspect(url, type) {
  if (!url) return { status: 'missing' };
  if (url.startsWith('/') && !url.startsWith('//')) {
    const path = resolve(publicRoot, `.${decodeURIComponent(url)}`);
    if (!path.startsWith(`${publicRoot}${sep}`)) return { status: 'broken', reason: 'caminho inválido' };
    const file = await stat(path).catch(() => null);
    if (!file?.isFile()) return { status: 'broken', reason: 'arquivo ausente' };
    if (type !== 'demonstration') {
      try {
        const image = await sharp(path).metadata();
        return { status: 'valid', bytes: file.size, format: image.format, width: image.width, height: image.height };
      } catch { return { status: 'broken', reason: 'imagem inválida' }; }
    }
    return { status: 'valid', bytes: file.size };
  }
  if (url.startsWith(`${api}/storage/v1/object/public/nac-exercise-media/`)) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return response.ok ? { status: 'valid', bytes: Number(response.headers.get('content-length')) || null, format: response.headers.get('content-type') } : { status: 'broken', reason: `HTTP ${response.status}` };
    } catch { return { status: 'broken', reason: 'falha de acesso ao Storage' }; }
  }
  return { status: 'unverified', reason: 'URL externa fora da auditoria local' };
}

const items = [];
for (const row of rows) {
  const cover = await inspect(row.image_url, 'cover');
  const demonstration = await inspect(row.video_url, 'demonstration');
  const anatomy = await inspect(row.anatomy_image_url, 'anatomy');
  const demoFormat = /\.gif(?:\?|$)/i.test(row.video_url || '') ? 'gif' : /\.(mp4|webm)(?:\?|$)/i.test(row.video_url || '') ? 'video' : row.video_url ? 'unsupported' : null;
  const missing = [cover.status !== 'valid' && 'imagem', demonstration.status !== 'valid' && 'demonstração', anatomy.status !== 'valid' && 'mapa', !row.instructions?.trim() && 'instruções', !row.coaching_tip?.trim() && 'dica', !row.common_mistakes?.trim() && 'erros comuns'].filter(Boolean);
  items.push({ id: row.id, name: row.name, muscleGroup: row.muscle_group, reviewStatus: row.visual_review_status, technicalReviewer: row.technical_reviewer, rightsRecorded: !!row.media_rights_note, instructions: !!row.instructions?.trim(), tip: !!row.coaching_tip?.trim(), commonMistakes: !!row.common_mistakes?.trim(), demoFormat, cover, demonstration, anatomy, missing, needsReview: row.visual_review_status !== 'approved' || missing.length > 0, problems: [cover, demonstration, anatomy].filter((media) => media.status === 'broken').map((media) => media.reason) });
}
const count = (fn) => items.filter(fn).length;
const summary = { scope: 'local_test_catalog', total: items.length, withValidImage: count((item) => item.cover.status === 'valid'), withoutImage: count((item) => item.cover.status !== 'valid'), withVideo: count((item) => item.demonstration.status === 'valid' && item.demoFormat === 'video'), withGif: count((item) => item.demonstration.status === 'valid' && item.demoFormat === 'gif'), withAnatomy: count((item) => item.anatomy.status === 'valid'), withInstructions: count((item) => item.instructions), awaitingReview: count((item) => item.needsReview), completeApproved: count((item) => !item.needsReview), withoutDemonstration: count((item) => item.demonstration.status !== 'valid'), brokenFiles: items.reduce((sum, item) => sum + [item.cover, item.demonstration, item.anatomy].filter((media) => media.status === 'broken').length, 0), unverifiedExternal: items.reduce((sum, item) => sum + [item.cover, item.demonstration, item.anatomy].filter((media) => media.status === 'unverified').length, 0) };
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = ['id', 'name', 'muscleGroup', 'reviewStatus', 'cover', 'coverFormat', 'coverWidth', 'coverHeight', 'demonstration', 'demoFormat', 'anatomy', 'instructions', 'tip', 'commonMistakes', 'missing', 'problems'];
const csv = [columns.join(','), ...items.map((item) => [item.id, item.name, item.muscleGroup, item.reviewStatus, item.cover.status, item.cover.format, item.cover.width, item.cover.height, item.demonstration.status, item.demoFormat, item.anatomy.status, item.instructions, item.tip, item.commonMistakes, item.missing.join('; '), item.problems.join('; ')].map(csvCell).join(','))].join('\n') + '\n';
await writeFile(resolve('docs/evidence/mission092-local-inventory.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, items }, null, 2) + '\n');
await writeFile(resolve('docs/evidence/mission092-local-inventory.csv'), csv);
console.log(JSON.stringify(summary));
