#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const sourceRoot = resolve(root, "media/exercise-originals");
const outputRoot = resolve(root, "media/exercise-optimized/exercises");
const evidenceRoot = resolve(root, "docs/evidence/video-optimization-20261107");
const catalog = JSON.parse(await readFile(resolve(root, "docs/catalog-remote-full.json"), "utf8"));
const intake = JSON.parse(await readFile(resolve(root, "docs/nac-video-intake-20261107.json"), "utf8"));
const byName = new Map(catalog.exercises.map((exercise) => [exercise.name, exercise]));

const run = async (command, args) => execFileAsync(command, args, { windowsHide: true });
const probe = async (file) => {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,pix_fmt", "-of", "json", file]);
  const data = JSON.parse(stdout);
  const video = data.streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`Fluxo de vídeo ausente: ${file}`);
  return { duration: Number(data.format.duration), size: Number(data.format.size), codec: video.codec_name, width: video.width, height: video.height, pix_fmt: video.pix_fmt };
};
const ratio = (before, after) => Number((((before - after) / before) * 100).toFixed(2));
const format = (bytes) => Number((bytes / 1024 / 1024).toFixed(3));

await mkdir(outputRoot, { recursive: true });
await mkdir(evidenceRoot, { recursive: true });
const records = [];
for (const mapping of intake.candidate_mappings) {
  const exercise = byName.get(mapping.exercise);
  if (!exercise) throw new Error(`Exercício ausente do catálogo: ${mapping.exercise}`);
  const input = resolve(sourceRoot, mapping.source);
  const exerciseDir = join(outputRoot, exercise.id);
  const output = join(exerciseDir, `demonstration-${exercise.id}.mp4`);
  await mkdir(exerciseDir, { recursive: true });
  if (!existsSync(output)) {
    await run("ffmpeg", ["-hide_banner", "-n", "-i", input, "-map", "0:v:0", "-vf", "scale=w='min(720,iw)':h=-2:force_original_aspect_ratio=decrease", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", output]);
  }
  const original = await probe(input);
  const optimized = await probe(output);
  const valid = optimized.codec === "h264" && optimized.pix_fmt === "yuv420p" && optimized.width <= original.width && optimized.height <= original.height && Math.abs(optimized.duration - original.duration) <= 0.2;
  if (!valid) throw new Error(`Validação de integridade falhou: ${exercise.name}`);
  records.push({
    id: exercise.id,
    name: exercise.name,
    category: exercise.muscle_group,
    original_file: relative(root, input).replaceAll("\\", "/"),
    optimized_file: relative(root, output).replaceAll("\\", "/"),
    duration_seconds: Number(optimized.duration.toFixed(3)),
    original_size_mb: format(original.size),
    optimized_size_mb: format(optimized.size),
    storage_reduction_percent: ratio(original.size, optimized.size),
    resolution: `${optimized.width}x${optimized.height}`,
    review_status: "technical_review_pending",
    approval_status: "pending_responsible",
    future_storage_destination: `exercises/${exercise.id}/demonstration-${exercise.id}.mp4`,
  });
}

const compacted = records.filter((record) => record.optimized_file);
const totalOriginal = compacted.reduce((total, record) => total + record.original_size_mb, 0);
const totalOptimized = compacted.reduce((total, record) => total + record.optimized_size_mb, 0);
const manifest = {
  generated_at: new Date().toISOString(),
  records,
  summary: {
    catalog_records: records.length,
    compacted: compacted.length,
    pending: records.length - compacted.length,
    original_size_mb: Number(totalOriginal.toFixed(3)),
    optimized_size_mb: Number(totalOptimized.toFixed(3)),
    storage_reduction_percent: ratio(totalOriginal, totalOptimized),
  },
};
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(evidenceRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`VIDEO_LIBRARY_PREPARED compacted=${manifest.summary.compacted} pending=${manifest.summary.pending} original_mb=${manifest.summary.original_size_mb} optimized_mb=${manifest.summary.optimized_size_mb} reduction=${manifest.summary.storage_reduction_percent}`);
