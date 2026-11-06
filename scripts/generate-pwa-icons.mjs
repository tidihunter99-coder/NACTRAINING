import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const target = "public/icons";
await mkdir(target, { recursive: true });
const source = "public/logos/nac-header.webp";

async function createIcon(name, size, ratio = 0.76) {
  const logo = await sharp(source).resize({ width: Math.round(size * ratio), height: Math.round(size * 0.52), fit: "contain" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#05070A" } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${target}/${name}`);
}

await Promise.all([
  createIcon("icon-192.png", 192),
  createIcon("icon-512.png", 512),
  createIcon("icon-maskable-512.png", 512, 0.68),
  createIcon("apple-touch-icon.png", 180),
]);
console.log("PWA_ICON_GENERATION_PASS");
