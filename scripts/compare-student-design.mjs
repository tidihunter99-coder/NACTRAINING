import sharp from 'sharp';
import { resolve } from 'node:path';

const reference = 'C:/Users/bangu/AppData/Local/Temp/codex-clipboard-73930113-0336-4383-960a-e7b5e31ec44f.png';
const capturePrefix = process.env.NAC_CAPTURE_PREFIX || 'mission091';
const names = ['inicio', 'detalhe', 'biblioteca'];
const labels = ['INÍCIO', 'DETALHE', 'BIBLIOTECA'];
const x = [46, 542, 1038];
const width = 390, height = 844, gap = 12, top = 62;
const pieces = [];
for (let i = 0; i < 3; i++) {
  const left = i * (width * 2 + gap * 2);
  const ref = await sharp(reference).extract({ left: x[i], top: 18, width: 449, height: 980 }).resize(width, height).png().toBuffer();
  const real = await sharp(resolve(`docs/evidence/${capturePrefix}-real-${names[i]}-390.png`)).resize(width, height).png().toBuffer();
  pieces.push({ input: ref, left, top });
  pieces.push({ input: real, left: left + width + gap, top });
}
const canvasWidth = 3 * width * 2 + 5 * gap;
const title = `<svg width="${canvasWidth}" height="${top}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#031320"/><style>text{font:700 21px Arial;fill:#eaf6ff}</style>${labels.map((label, i) => { const left = i * (width * 2 + gap * 2); return `<text x="${left + 8}" y="37">${label} — REFERÊNCIA</text><text x="${left + width + gap + 8}" y="37">APLICAÇÃO REAL</text>`; }).join('')}</svg>`;
pieces.push({ input: Buffer.from(title), left: 0, top: 0 });
await sharp({ create: { width: canvasWidth, height: height + top, channels: 3, background: '#031320' } }).composite(pieces).png().toFile(resolve(`docs/evidence/${capturePrefix}-reference-vs-app.png`));
console.log('COMPARISON_READY');
