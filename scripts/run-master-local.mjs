import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const cache = join(process.env.LOCALAPPDATA, 'npm-cache/_npx');
const cli = process.env.SUPABASE_CLI_PATH || readdirSync(cache).map(dir => join(cache, dir, 'node_modules/@supabase/cli-windows-x64/bin/supabase.exe')).find(existsSync);
assert.ok(cli, 'Install Supabase CLI or set SUPABASE_CLI_PATH');
// Status is local by default; credentials remain in process memory, never in logs/files.
const status = JSON.parse(execFileSync(cli, ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
assert.ok(status.PUBLISHABLE_KEY?.startsWith('sb_publishable_'));
assert.ok(status.SECRET_KEY?.startsWith('sb_secret_'));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NAC_NEXT_DIST_DIR: '.next-master-test',
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3003', NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH: 'false',
  SUPABASE_LOCAL_URL: status.API_URL, SUPABASE_LOCAL_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  SUPABASE_LOCAL_SECRET_KEY: status.SECRET_KEY, NAC_LOCAL_APP_URL: 'http://localhost:3003', NAC_SKIP_BROWSER_CHECK: '1' };
async function run(args, name) {
  const log = createWriteStream(`docs/evidence/master-${name}.log`);
  const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  log.end(); assert.equal(code, 0, `${name} failed; inspect its evidence log`);
}
const next = 'node_modules/next/dist/bin/next';
if (!process.argv.includes('--existing-build')) await run([next, 'build'], 'build');
const serverLog = createWriteStream('docs/evidence/master-server.log');
const server = spawn(process.execPath, [next, 'start', '-p', '3003', '-H', '127.0.0.1'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    assert.equal(server.exitCode, null, 'Local server exited');
    try { ready = (await fetch('http://127.0.0.1:3003/entrar')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Local server readiness');
  const requested = process.argv.find(arg => arg.startsWith('--suite='))?.slice(8);
  const suites = requested ? [requested] : ['auth', 'student', 'instructor', 'admin'];
  assert.ok(suites.every(suite => ['auth', 'student', 'instructor', 'admin'].includes(suite)));
  for (const suite of suites) await run([`scripts/test-${suite}-local.mjs`], suite);
  console.log(`MASTER_LOCAL_HTTP_PASS (${suites.join(', ')}); visual checks explicitly skipped (browser unavailable).`);
} finally {
  server.kill(); serverLog.end();
}
