import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertLocalOrigin } from './local-test-target.mjs';

const api = process.env.SUPABASE_LOCAL_URL;
const key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_LOCAL_SECRET_KEY;
assertLocalOrigin(api, '127.0.0.1');
assert.ok(key && secret);
const fixture = JSON.parse(await readFile(join(tmpdir(), 'nac-mission10-visual-fixture.json'), 'utf8'));
const service = createClient(api, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const users = {};
for (const role of ['student', 'teacher', 'admin']) {
  const client = createClient(api, key, { auth: { autoRefreshToken: false, persistSession: false } });
  assert.ifError((await client.auth.signInWithPassword({ email: fixture.emails[role], password: fixture.password })).error);
  users[role] = client;
}
let id;
try {
  const created = await service.from('exercises').insert({ name: `Revisão local ${Date.now()}`, muscle_group: 'chest', visibility: 'instructor_only', created_by: fixture.ids.teacher }).select('id,visual_review_status').single();
  assert.ifError(created.error);
  id = created.data.id;
  assert.equal(created.data.visual_review_status, 'pending');
  const student = await users.student.from('exercises').update({ media_rights_note: 'indevido' }).eq('id', id).select('id');
  assert.ifError(student.error);
  assert.equal(student.data.length, 0, 'Aluno não altera revisão de exercício privado');
  const teacher = await users.teacher.from('exercises').update({ media_rights_note: 'indevido' }).eq('id', id).select('id');
  assert.ok(teacher.error, 'Professor proprietário não aprova mídia oficial');
  const forgedMedia = await users.teacher.from('exercises').update({ image_url: `nac-media:exercises/${id}/cover-f2000000-0000-4000-8000-000000000011.webp` }).eq('id', id).select('id');
  assert.ok(forgedMedia.error, 'Professor proprietário não associa mídia privada diretamente');
  const adminPending = await users.admin.from('exercises').update({ media_rights_note: 'Revisão local de teste' }).eq('id', id).select('id').single();
  assert.ifError(adminPending.error);
  const incomplete = await users.admin.from('exercises').update({ visual_review_status: 'approved', media_rights_note: 'Revisão local de teste', technical_reviewer: 'Profissional local', visual_reviewed_by: fixture.ids.admin, visual_reviewed_at: new Date().toISOString() }).eq('id', id).select('id');
  assert.ok(incomplete.error, 'Aprovação incompleta deve falhar no banco');
  const current = await service.from('exercises').select('visual_review_status').eq('id', id).single();
  assert.ifError(current.error);
  assert.equal(current.data.visual_review_status, 'pending');
  console.log('PASS revisão pendente, aluno/professor bloqueados e aprovação incompleta rejeitada');
} finally {
  if (id) assert.ifError((await service.from('exercises').delete().eq('id', id)).error);
}
