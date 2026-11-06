import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { assertLocalOrigin } from './local-test-target.mjs';

const api = process.env.SUPABASE_LOCAL_URL;
const key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_LOCAL_SECRET_KEY;
const app = process.env.NAC_LOCAL_APP_URL;
assertLocalOrigin(api, '127.0.0.1');
assertLocalOrigin(app, 'localhost');
assert.ok(key && secret);
const fixture = JSON.parse(await readFile(join(tmpdir(), 'nac-mission10-visual-fixture.json'), 'utf8'));
const service = createClient(api, secret, { auth: { autoRefreshToken: false, persistSession: false } });
async function cookie(role) {
  const jar = new Map();
  const client = createServerClient(api, key, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)) } });
  assert.ifError((await client.auth.signInWithPassword({ email: fixture.emails[role], password: fixture.password })).error);
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}
const studentCookie = await cookie('student');
const adminCookie = await cookie('admin');
let id;
let invalidFormatExerciseId;
try {
  const created = await service.from('workout_sessions').insert({ student_id: fixture.ids.student, workout_plan_id: fixture.ids.plan, workout_day_id: fixture.ids.dayA }).select('id').single();
  assert.ifError(created.error);
  id = created.data.id;
  const session = await fetch(`${app}/aluno/treino/${id}`, { headers: { Cookie: studentCookie } });
  assert.equal(session.status, 200);
  const sessionHtml = await session.text();
  assert.match(sessionHtml, /Ver imagem, demonstração e músculos/);
  assert.ok(sessionHtml.includes(`/aluno/exercicios/${fixture.ids.exercise}?sessao=${id}`));
  const exerciseWithoutVideo = await service.from('exercises').select('video_url').eq('id', fixture.ids.exercise).single();
  assert.ifError(exerciseWithoutVideo.error);
  assert.equal(exerciseWithoutVideo.data.video_url, null, 'Fixture prescrita sem demonstração animada');
  const detail = await fetch(`${app}/aluno/exercicios/${fixture.ids.exercise}?sessao=${id}`, { headers: { Cookie: studentCookie } });
  assert.equal(detail.status, 200);
  const detailHtml = await detail.text();
  assert.match(detailHtml, /Voltar à sessão/);
  assert.ok(detailHtml.includes(`/aluno/treino/${id}`));
  assert.doesNotMatch(detailHtml, /Reproduzir demonstração/, 'Sem vídeo não aparece controle de reprodução');
  const after = await service.from('workout_sessions').select('status').eq('id', id).single();
  assert.ifError(after.error);
  assert.equal(after.data.status, 'in_progress', 'Consultar detalhes não altera o progresso');
  for (const [filter, expected] of [['review', 'Supino Reto'], ['no-demo', 'Supino Reto'], ['complete', 'Nenhum exercício encontrado'], ['problem', 'Nenhum exercício encontrado']]) {
    const response = await fetch(`${app}/administracao/exercicios?cobertura=${filter}`, { headers: { Cookie: adminCookie } });
    assert.equal(response.status, 200, filter);
    assert.ok((await response.text()).includes(expected), `Filtro ${filter}`);
  }
  const reviewPage = await fetch(`${app}/administracao/exercicios/${fixture.ids.exercise}`, { headers: { Cookie: adminCookie } });
  assert.equal(reviewPage.status, 200);
  const reviewHtml = await reviewPage.text();
  assert.match(reviewHtml, /Revisão técnica e direitos de uso/);
  assert.match(reviewHtml, /Pendências:/);
  assert.match(reviewHtml, /Aprovar conteúdo visual/);
  assert.match(reviewHtml, /disabled=""/);
  const invalidExercise = await service.from('exercises').insert({ name: `Formato pendente local ${Date.now()}`, muscle_group: 'chest', visibility: 'academy', image_url: '/images/exercises/bench-press.webp', video_url: '/videos/local-test.mov', anatomy_image_url: '/images/exercises/chest-anatomy.webp', instructions: 'Instrução de teste local', coaching_tip: 'Dica de teste local', common_mistakes: 'Erro de teste local' }).select('id').single();
  assert.ifError(invalidExercise.error);
  invalidFormatExerciseId = invalidExercise.data.id;
  const invalidPage = await fetch(`${app}/administracao/exercicios/${invalidFormatExerciseId}`, { headers: { Cookie: adminCookie } });
  assert.equal(invalidPage.status, 200);
  const invalidHtml = await invalidPage.text();
  assert.match(invalidHtml, /Corrija URLs ou formatos de mídia antes da aprovação/);
  const reviewForm = [...invalidHtml.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]).find((form) => form.includes('Aprovar conteúdo visual'));
  assert.ok(reviewForm, 'Formulário administrativo de revisão encontrado');
  const data = new FormData();
  for (const input of reviewForm.match(/<input\b[^>]*>/g) ?? []) {
    const attrs = Object.fromEntries([...input.matchAll(/([\w$-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
    if (attrs.type === 'hidden' && attrs.name) data.set(attrs.name, attrs.value ?? '');
  }
  assert.ok([...data.keys()].some((name) => name.startsWith('$ACTION_')));
  data.set('decision', 'approved');
  data.set('technicalReviewer', 'Profissional local de teste');
  data.set('mediaRightsNote', 'Somente teste local');
  data.set('confirm', 'yes');
  const rejected = await fetch(`${app}/administracao/exercicios/${invalidFormatExerciseId}`, { method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie, Origin: app }, body: data });
  assert.equal(rejected.status, 303);
  assert.match(rejected.headers.get('location') ?? '', /erro=pendencias/);
  const unchanged = await service.from('exercises').select('visual_review_status').eq('id', invalidFormatExerciseId).single();
  assert.ifError(unchanged.error);
  assert.equal(unchanged.data.visual_review_status, 'pending', 'Formato não suportado não recebe aprovação');
  console.log('PASS exercício sem vídeo acessível na sessão, sem controle falso, retorno seguro, progresso preservado, filtros e rejeição administrativa de formato não suportado');
} finally {
  if (id) assert.ifError((await service.from('workout_sessions').delete().eq('id', id)).error);
  if (invalidFormatExerciseId) assert.ifError((await service.from('exercises').delete().eq('id', invalidFormatExerciseId)).error);
}
