import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertLocalOrigin } from './local-test-target.mjs';

const url = process.env.SUPABASE_LOCAL_URL;
const key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
assertLocalOrigin(url, '127.0.0.1');
assert.ok(key);
const fixture = JSON.parse(await readFile(join(tmpdir(), 'nac-mission10-visual-fixture.json'), 'utf8'));
const student = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const other = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
assert.ifError((await student.auth.signInWithPassword({ email: fixture.emails.student, password: fixture.password })).error);
assert.ifError((await other.auth.signInWithPassword({ email: fixture.emails.empty, password: fixture.password })).error);
const id = fixture.ids.exercise;
try {
  const added = await student.from('student_exercise_favorites').insert({ student_id: fixture.ids.student, exercise_id: id });
  assert.ifError(added.error);
  const own = await student.from('student_exercise_favorites').select('exercise_id').eq('exercise_id', id);
  assert.ifError(own.error);
  assert.equal(own.data.length, 1);
  const hidden = await other.from('student_exercise_favorites').select('exercise_id').eq('exercise_id', id);
  assert.ifError(hidden.error);
  assert.equal(hidden.data.length, 0);
  const spoof = await other.from('student_exercise_favorites').insert({ student_id: fixture.ids.student, exercise_id: id });
  assert.ok(spoof.error, 'Outro aluno não pode alterar favorito alheio');
  console.log('PASS favoritos persistidos e isolados por aluno');
} finally {
  const deleted = await student.from('student_exercise_favorites').delete().eq('student_id', fixture.ids.student).eq('exercise_id', id);
  assert.ifError(deleted.error);
}
console.log('FAVORITES_LOCAL_PASS');
