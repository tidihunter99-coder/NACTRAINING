import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServerClient } from '@supabase/ssr';
import { assertLocalOrigin } from './local-test-target.mjs';

const appUrl = process.env.NAC_LOCAL_APP_URL || 'http://localhost:3000';
const capturePrefix = process.env.NAC_CAPTURE_PREFIX || 'mission091';
const api = process.env.SUPABASE_LOCAL_URL;
const key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
assertLocalOrigin(api, '127.0.0.1');
assert.ok(key);
const fixture = JSON.parse(await readFile(join(tmpdir(), 'nac-mission10-visual-fixture.json'), 'utf8'));
const jar = new Map();
const auth = createServerClient(api, key, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)) } });
const signed = await auth.auth.signInWithPassword({ email: fixture.emails.student, password: fixture.password });
assert.ifError(signed.error);

for (let attempt = 0; attempt < 60; attempt++) {
  try { if ((await fetch(`${appUrl}/entrar`)).ok) break; } catch {}
  if (attempt === 59) throw new Error('Aplicação local não iniciou');
  await new Promise((done) => setTimeout(done, 1000));
}

const dir = await mkdtemp(join(tmpdir(), 'nac-design-capture-'));
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
let ws;
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = Number((await readFile(join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await new Promise((done) => setTimeout(done, 100)); } }
  assert.ok(port);
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((item) => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (event) => { const msg = JSON.parse(event.data); if (!pending.has(msg.id)) return; const { done, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : done(msg.result); });
  const call = (method, params = {}) => new Promise((done, reject) => { const id = nextId++; pending.set(id, { done, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await call('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  await Promise.all([call('Page.enable'), call('Network.enable'), call('Runtime.enable')]);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  for (const [name, value] of jar) await call('Network.setCookie', { name, value, url: appUrl, sameSite: 'Lax' });
  const pages = [
    ['inicio', '/aluno', 'Olá,'],
    ['detalhe', `/aluno/exercicios/${fixture.ids.exercise}`, 'Supino Reto'],
    ['biblioteca', '/aluno/exercicios', 'Biblioteca de Exercícios'],
  ];
  for (const [name, path, expected] of pages) {
    await call('Page.navigate', { url: `${appUrl}${path}` });
    let state;
    for (let i = 0; i < 100; i++) {
      await new Promise((done) => setTimeout(done, 150));
      state = await evaluate("({ready:document.readyState,text:document.body?.innerText||'',width:document.documentElement.scrollWidth})");
      if (state.ready === 'complete' && state.text.includes(expected) && documentReady(state.text)) break;
    }
    assert.ok(state.text.includes(expected), `${name}: página não carregou: ${state.text.slice(0, 220)}`);
    assert.ok(state.width <= 391, `${name}: rolagem horizontal ${state.width}`);
    await evaluate("window.scrollTo(0,0); document.querySelectorAll('img').forEach(x=>x.decode?.().catch(()=>{}))");
    await new Promise((done) => setTimeout(done, 400));
    if (name !== 'detalhe') assert.equal(await evaluate("[...document.querySelectorAll('.student-exercise-photo img')].every(x=>x.complete && x.naturalWidth>0)"), true, `${name}: miniaturas carregadas`);
    if (name === 'detalhe') assert.equal(await evaluate("document.querySelector('.student-hero-photo')?.complete && document.querySelector('.student-hero-photo')?.naturalWidth>0"), true, 'Foto principal carregada');
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(`docs/evidence/${capturePrefix}-real-${name}-390.png`), Buffer.from(shot.data, 'base64'));
    console.log(`CAPTURED ${name} 390x844`);
    if (name === 'detalhe') {
      assert.equal(await evaluate("!!document.querySelector('.student-media-play')"), false, 'Sem vídeo não há botão falso');
      assert.equal(await evaluate("document.body.innerText.includes('Vídeo indisponível')"), false, 'Sem mensagem de erro desnecessária');
      assert.equal(await evaluate("!!document.querySelector('.student-anatomy')"), true, 'Mapa específico associado ao Supino Reto');
    }
  }
  await evaluate("document.querySelector('.student-favorite')?.click()");
  await new Promise((done) => setTimeout(done, 1200));
  assert.equal(await evaluate("document.querySelector('.student-favorite')?.getAttribute('aria-pressed')"), 'true', 'Favorito local');
  await call('Page.navigate', { url: `${appUrl}/aluno/exercicios` });
  await new Promise((done) => setTimeout(done, 1000));
  assert.equal(await evaluate("document.querySelector('.student-favorite')?.getAttribute('aria-pressed')"), 'true', 'Favorito persistido');
  await evaluate("document.querySelector('.student-favorite')?.click()");
  await new Promise((done) => setTimeout(done, 1200));
  await call('Page.navigate', { url: `${appUrl}/aluno/exercicios` });
  await new Promise((done) => setTimeout(done, 1000));
  assert.equal(await evaluate("document.querySelector('.student-favorite')?.getAttribute('aria-pressed')"), 'false', 'Favorito removido');
  await call('Page.navigate', { url: `${appUrl}/aluno/exercicios?busca=Supino&grupo=chest` });
  await new Promise((done) => setTimeout(done, 1500));
  const filter = await evaluate("document.body.innerText.includes('Supino Reto') && !document.body.innerText.includes('Tríceps na Polia')");
  assert.equal(filter, true, 'Busca e filtro');
  await call('Page.navigate', { url: `${appUrl}/aluno/exercicios/${fixture.ids.exercise}` });
  await new Promise((done) => setTimeout(done, 1500));
  await evaluate("document.querySelector('[role=tab][id=exercise-tab-Execução]')?.click()");
  await new Promise((done) => setTimeout(done, 250));
  const tabs = await evaluate("document.querySelector('[role=tab][id=exercise-tab-Execução]')?.getAttribute('aria-selected')");
  assert.equal(tabs, 'true', 'Aba Execução');
  await evaluate("document.querySelector('[role=tab][id=exercise-tab-Músculos]')?.click()");
  await new Promise((done) => setTimeout(done, 250));
  assert.equal(await evaluate("document.body.innerText.includes('Tríceps, Ombros')"), true, 'Músculos secundários específicos do Supino Reto');
  const musclesShot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(resolve(`docs/evidence/${capturePrefix}-real-musculos-390.png`), Buffer.from(musclesShot.data, 'base64'));
  for (const [width, height] of [[768, 1024], [1440, 900]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    for (const [name, path, expected] of pages) {
      await call('Page.navigate', { url: `${appUrl}${path}` });
      await new Promise((done) => setTimeout(done, 1100));
      const state = await evaluate("({text:document.body?.innerText||'',width:document.documentElement.scrollWidth})");
      assert.ok(state.text.includes(expected), `${width}px: ${path}`);
      assert.ok(state.width <= width + 1, `${width}px horizontal scroll: ${path}`);
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(resolve(`docs/evidence/${capturePrefix}-real-${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`CAPTURED ${name} ${width}x${height}`);
    }
  }
  if (process.env.NAC_CAPTURE_ADMIN === '1') {
    const adminJar = new Map();
    const adminAuth = createServerClient(api, key, { cookies: { getAll: () => [...adminJar].map(([name, value]) => ({ name, value })), setAll: (items) => items.forEach(({ name, value }) => adminJar.set(name, value)) } });
    assert.ifError((await adminAuth.auth.signInWithPassword({ email: fixture.emails.admin, password: fixture.password })).error);
    for (const [name, value] of adminJar) await call('Network.setCookie', { name, value, url: appUrl, sameSite: 'Lax' });
    const adminPages = [
      ['admin-catalogo', '/administracao/exercicios', 'Cobertura visual do catálogo'],
      ['admin-revisao', `/administracao/exercicios/${fixture.ids.exercise}`, 'Revisão técnica e direitos de uso'],
    ];
    for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      for (const [name, path, expected] of adminPages) {
        await call('Page.navigate', { url: `${appUrl}${path}` });
        let state;
        for (let i = 0; i < 100; i++) {
          await new Promise((done) => setTimeout(done, 150));
          state = await evaluate("({ready:document.readyState,text:document.body?.innerText||'',width:document.documentElement.scrollWidth})");
          if (state.ready === 'complete' && state.text.includes(expected)) break;
        }
        assert.ok(state.text.includes(expected), `${name}: página não carregou`);
        assert.ok(state.width <= width + 1, `${name}: rolagem horizontal ${state.width}`);
        const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(resolve(`docs/evidence/${capturePrefix}-real-${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
        console.log(`CAPTURED ${name} ${width}x${height}`);
        if (name === 'admin-revisao') {
          await evaluate("[...document.querySelectorAll('h2')].find(x=>x.textContent?.includes('Revisão técnica e direitos de uso'))?.scrollIntoView({block:'start'})");
          await new Promise((done) => setTimeout(done, 250));
          const reviewShot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await writeFile(resolve(`docs/evidence/${capturePrefix}-real-admin-aprovacao-${width}.png`), Buffer.from(reviewShot.data, 'base64'));
          console.log(`CAPTURED admin-aprovacao ${width}x${height}`);
        }
      }
    }
  }
  console.log('INTERACTIONS_OK');
} finally {
  ws?.close(); chrome.kill(); await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}

function documentReady(text) { return !text.includes('Carregando seus dados'); }
