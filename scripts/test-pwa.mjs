import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose?.includes("maskable")));
for (const [path, size] of [["public/icons/icon-192.png", 192], ["public/icons/icon-512.png", 512], ["public/icons/icon-maskable-512.png", 512], ["public/icons/apple-touch-icon.png", 180]]) {
  const meta = await sharp(path).metadata();
  assert.equal(meta.width, size, `${path} width`);
  assert.equal(meta.height, size, `${path} height`);
}
const serviceWorker = await readFile("public/sw.js", "utf8");
assert.match(serviceWorker, /nac-public-shell-v1/);
assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
assert.match(serviceWorker, /request\.mode === "navigate"/);
assert.doesNotMatch(serviceWorker, /skipWaiting\(/);
const registration = await readFile("src/components/pwa-registration.tsx", "utf8");
assert.match(registration, /serviceWorker\.register\("\/sw\.js"/);
console.log("PWA_STATIC_TEST_PASS: manifest, icons, private-cache exclusions and safe update strategy");
