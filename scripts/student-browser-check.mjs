import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const evidenceDir = resolve("docs/evidence");

export async function verifyResponsive({ appUrl, cookies, sessionPath, paths, screenshotPaths, prefix = "mission-06" }) {
  const tempRoot = resolve(tmpdir());
  const profileDir = await mkdtemp(join(tempRoot, "nac-student-chrome-"));
  const chrome = spawn(chromePath, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  let ws;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (chrome.exitCode !== null) throw new Error("Chrome encerrou antes da verificação visual");
      try { port = Number((await readFile(join(profileDir, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; } catch { await new Promise((done) => setTimeout(done, 100)); }
    }
    assert.ok(port, "Porta de depuração do Chrome local");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find((item) => item.type === "page");
    assert.ok(target?.webSocketDebuggerUrl, "Aba do Chrome local");
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((done, reject) => { ws.addEventListener("open", done, { once: true }); ws.addEventListener("error", reject, { once: true }); });
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve: done, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else done(message.result);
    });
    function call(method, params = {}) { return new Promise((done, reject) => { const id = nextId++; pending.set(id, { resolve: done, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
    await Promise.all([call("Page.enable"), call("Runtime.enable"), call("Network.enable")]);
    for (const [name, value] of cookies) await call("Network.setCookie", { name, value, url: appUrl, httpOnly: false, sameSite: "Lax" });
    await mkdir(evidenceDir, { recursive: true });
    const pages = paths ?? ["/aluno", "/aluno/treinos", sessionPath, "/aluno/historico", "/aluno/evolucao", "/aluno/perfil"];
    const captures = screenshotPaths ?? ["/aluno", sessionPath];
    for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
      await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      for (const path of pages) {
        await call("Page.navigate", { url: `${appUrl}${path}` });
        let state;
        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise((done) => setTimeout(done, 100));
          const result = await call("Runtime.evaluate", { expression: "({ready:document.readyState, width:innerWidth, scroll:document.documentElement.scrollWidth, heading:document.querySelector('h1')?.textContent ?? '', loading:!!document.querySelector('.animate-pulse'), error:document.body?.innerText.includes('Não foi possível carregar seus dados') || document.body?.innerText.includes('Não foi possível carregar o painel') || false})", returnByValue: true });
          state = result.result.value;
          if (state.ready === "complete" && state.heading && !state.loading) break;
        }
        assert.ok(state.heading, `Título em ${path} a ${width}px`);
        assert.equal(state.loading, false, `Conteúdo concluído em ${path} a ${width}px`);
        assert.equal(state.error, false, `Página sem erro em ${path} a ${width}px`);
        assert.ok(state.scroll <= state.width + 1, `Sem rolagem horizontal em ${path} a ${width}px (${state.scroll} > ${state.width})`);
        if (path === captures[0] || (path === captures[1] && width === 390)) {
          await call("Runtime.evaluate", { expression: "window.scrollTo(0, 0); document.querySelectorAll('img').forEach((image) => { if (!image.complete) image.decode?.().catch(() => {}); });" });
          await new Promise((done) => setTimeout(done, 250));
          const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
          const filename = path === captures[0] ? `${prefix}-dashboard-${width}.png` : `${prefix}-${prefix === "mission-06" ? "session" : "detail"}-390.png`;
          await writeFile(join(evidenceDir, filename), Buffer.from(screenshot.data, "base64"));
        }
      }
      console.log(`PASS responsividade ${width}x${height}: ${pages.length} rotas, sem rolagem horizontal`);
    }
  } finally {
    ws?.close();
    chrome.kill();
    if (profileDir.startsWith(tempRoot + sep)) await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
