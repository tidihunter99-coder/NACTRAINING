#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const sourceRoot = resolve(root, "media/exercise-originals");
const outputRoot = resolve(root, "docs/evidence/video-conference-20261107");
const catalog = JSON.parse(await readFile(resolve(root, "docs/catalog-remote-full.json"), "utf8"));
const intake = JSON.parse(await readFile(resolve(root, "docs/nac-video-intake-20261107.json"), "utf8"));

const byName = new Map(catalog.exercises.map((exercise) => [exercise.name, exercise]));
const visualFinding = new Map([
  ["Puxada Atrás", "REVISAR: os quadros mostram puxada reta na polia; não confirmam puxada atrás."],
]);
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const run = async (file, args) => execFileAsync(file, args, { windowsHide: true });
const exists = async (file) => access(file).then(() => true).catch(() => false);
const probeDuration = async (file) => {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", file]);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Duração inválida: ${file}`);
  return duration;
};
const frame = async (input, seconds, output) => run("ffmpeg", [
  "-v", "error", "-ss", seconds.toFixed(3), "-i", input, "-frames:v", "1", "-q:v", "3", "-y", output,
]);

await mkdir(join(outputRoot, "frames"), { recursive: true });
await mkdir(join(outputRoot, "cards"), { recursive: true });

const records = [];
for (const [index, mapping] of intake.candidate_mappings.entries()) {
  const exercise = byName.get(mapping.exercise);
  if (!exercise) throw new Error(`Exercício não encontrado no catálogo remoto: ${mapping.exercise}`);
  const input = resolve(sourceRoot, mapping.source);
  const duration = await probeDuration(input);
  const times = [Math.min(0.25, duration / 2), duration / 2, Math.max(0, duration - 0.25)];
  const number = String(index + 1).padStart(2, "0");
  const files = ["inicio", "meio", "fim"].map((position) => join(outputRoot, "frames", `${number}-${position}.jpg`));
  for (const [frameIndex, output] of files.entries()) {
    if (!await exists(output)) await frame(input, times[frameIndex], output);
  }
  const card = join(outputRoot, "cards", `${number}.jpg`);
  if (!await exists(card)) {
    await run("ffmpeg", ["-v", "error", "-i", files[0], "-i", files[1], "-i", files[2], "-filter_complex", "hstack=inputs=3", "-q:v", "3", "-y", card]);
  }
  records.push({
    number: index + 1,
    name: exercise.name,
    category: exercise.muscle_group,
    source: mapping.source,
    duration_seconds: Number(duration.toFixed(3)),
    frames: files.map((file) => relative(outputRoot, file).replaceAll("\\", "/")),
    card: relative(outputRoot, card).replaceAll("\\", "/"),
    remote_video_url: exercise.video_url,
    remote_visual_status: exercise.visual_review_status,
    visual_finding: visualFinding.get(exercise.name) ?? "Coerente visualmente; aprovação do responsável pendente.",
    status: visualFinding.has(exercise.name) ? "REVISAR_NOME_E_EXECUCAO" : "PENDENTE_DE_APROVACAO",
  });
}

const duplicate = intake.unmatched_or_duplicate.map((item) => ({ ...item, status: "NAO_ASSOCIAR_SEM_REVISAO" }));
const manifest = { generated_at: new Date().toISOString(), records, unmatched_or_duplicate: duplicate };
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

await mkdir(join(outputRoot, "sheets"), { recursive: true });
for (const category of [...new Set(records.map((record) => record.category))]) {
  const group = records.filter((record) => record.category === category);
  const inputs = group.flatMap((record) => ["-i", join(outputRoot, record.card)]);
  const sheet = join(outputRoot, "sheets", `${category}.jpg`);
  if (group.length === 1) {
    await run("ffmpeg", ["-v", "error", ...inputs, "-vf", "scale=480:284", "-frames:v", "1", "-y", sheet]);
  } else {
    const scaled = group.map((_, index) => `[${index}:v]scale=480:284[p${index}]`).join(";");
    const layout = group.map((_, index) => `${(index % 3) * 480}_${Math.floor(index / 3) * 284}`).join("|");
    await run("ffmpeg", ["-v", "error", ...inputs, "-filter_complex", `${scaled};${group.map((_, index) => `[p${index}]`).join("")}xstack=inputs=${group.length}:layout=${layout}:fill=black`, "-frames:v", "1", "-y", sheet]);
  }
}

const cards = records.map((record) => `
  <article class="card">
    <h2>${String(record.number).padStart(2, "0")} · ${escapeHtml(record.name)}</h2>
    <p><strong>${escapeHtml(record.category)}</strong> · ${record.duration_seconds.toFixed(3)} s</p>
    <img src="${escapeHtml(record.card)}" alt="Quadros de início, meio e fim: ${escapeHtml(record.name)}" loading="lazy">
    <code>${escapeHtml(record.source)}</code>
    <p class="status">${record.status}</p>
  </article>`).join("\n");
const html = `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NAC — Conferência visual dos vídeos</title>
<style>body{font:16px system-ui;margin:24px;background:#101312;color:#eef3ee}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}.card{padding:16px;border:1px solid #355142;border-radius:12px;background:#162019}.card h2{margin:0 0 6px;font-size:18px}.card p{margin:7px 0}.card img{display:block;width:100%;border-radius:8px;background:#000}.card code{display:block;overflow-wrap:anywhere;color:#b9d9c6;font-size:12px;margin-top:10px}.status{color:#ffd166;font-weight:700;font-size:12px}header{max-width:960px;margin-bottom:24px}small{color:#b6c5bb}</style>
<header><h1>NAC TRAINING — Conferência visual</h1><p>40 exercícios reais · três quadros por vídeo: início, meio e fim. Arquivos originais não foram modificados. A associação permanece pendente de aprovação humana.</p><small>Duplicata isolada: ${escapeHtml(duplicate[0]?.source ?? "nenhuma")}</small></header><main class="grid">${cards}</main></html>`;
await writeFile(join(outputRoot, "index.html"), html);

const rows = records.map((record) => `| ${record.number} | ${record.name} | ${record.category} | \`${record.source}\` | ${record.duration_seconds.toFixed(3)} s | ${record.visual_finding} | ${record.status} |`).join("\n");
const approval = `# NAC TRAINING — Conferência para aprovação\n\nQuadros extraídos localmente com FFmpeg em início, meio e fim. Nenhum original foi compactado, vinculado, importado ou enviado.\n\n| # | Exercício | Categoria | Vídeo candidato | Duração | Conferência visual | Situação |\n| ---: | --- | --- | --- | ---: | --- | --- |\n${rows}\n\n## Duplicata isolada\n\n- \`OMBRO/Man_performing_cable_pulldown_ex…_732f1396 (1).mp4\` e \`COSTAS/Man_performing_cable_pulldown_ex…_732f1396.mp4\` possuem o mesmo SHA-256 e os mesmos metadados: são o mesmo arquivo. Permanece sem associação adicional.\n`;
await writeFile(join(outputRoot, "approval-table.md"), approval);

console.log(`VIDEO_CONFERENCE_PASS videos=${records.length} frames=${records.length * 3} output=${outputRoot}`);
