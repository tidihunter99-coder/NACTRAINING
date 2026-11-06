#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, extname, resolve } from "node:path";

const usage = `Uso:
  npm run video:optimize -- --input <arquivo-origem> --output <arquivo.mp4> [--thumbnail <arquivo.webp>] [--keep-audio] [--dry-run]

Converte um vídeo oficial local para MP4/H.264, preservando proporção, com
largura máxima de 720px, CRF 23, preset slow e pronto para upload posterior
em Storage privado. Por padrão remove o áudio das demonstrações; use
--keep-audio quando ele for necessário. O comando não envia arquivos, não
sobrescreve saídas e não usa qualquer serviço externo.`;

const argumentsByName = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith("--")) continue;
  if (argument === "--dry-run" || argument === "--help" || argument === "--keep-audio") {
    argumentsByName.set(argument, true);
    continue;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Valor ausente para ${argument}.`);
    process.exit(1);
  }
  argumentsByName.set(argument, value);
  index += 1;
}

if (argumentsByName.has("--help")) {
  console.log(usage);
  process.exit(0);
}

const input = argumentsByName.get("--input");
const output = argumentsByName.get("--output");
const thumbnail = argumentsByName.get("--thumbnail");
if (typeof input !== "string" || typeof output !== "string") {
  console.error(usage);
  process.exit(1);
}

const inputPath = resolve(input);
const outputPath = resolve(output);
if (!existsSync(inputPath)) {
  console.error("O vídeo de origem não foi encontrado.");
  process.exit(1);
}
if (inputPath === outputPath || extname(outputPath).toLowerCase() !== ".mp4") {
  console.error("A saída deve ser um arquivo .mp4 diferente da origem.");
  process.exit(1);
}
if (existsSync(outputPath)) {
  console.error("A saída já existe; escolha outro caminho para evitar sobrescrita.");
  process.exit(1);
}
const thumbnailPath = typeof thumbnail === "string" ? resolve(thumbnail) : null;
if (thumbnailPath && (extname(thumbnailPath).toLowerCase() !== ".webp" || existsSync(thumbnailPath))) {
  console.error("A miniatura deve ser um arquivo .webp que ainda não exista.");
  process.exit(1);
}

const audioArguments = argumentsByName.has("--keep-audio") ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"];

const ffmpegArguments = [
  "-hide_banner", "-n", "-i", inputPath,
  "-map", "0:v:0", "-map", "0:a?",
  "-vf", "scale=w='min(720,iw)':h=-2:force_original_aspect_ratio=decrease",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
  ...audioArguments, "-movflags", "+faststart",
  outputPath,
];

if (argumentsByName.has("--dry-run")) {
  console.log(JSON.stringify({ executable: "ffmpeg", input: inputPath, output: outputPath, arguments: ffmpegArguments }, null, 2));
  process.exit(0);
}

const result = spawnSync("ffmpeg", ffmpegArguments, { stdio: "inherit", shell: false, cwd: dirname(inputPath) });
if (result.error?.code === "ENOENT") {
  console.error("FFmpeg não está disponível no PATH. Instale-o localmente e execute novamente.");
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

if (thumbnailPath) {
  const thumbnailResult = spawnSync("ffmpeg", ["-hide_banner", "-n", "-ss", "00:00:02", "-i", outputPath, "-frames:v", "1", "-vf", "scale=360:-2", "-c:v", "libwebp", "-q:v", "82", thumbnailPath], { stdio: "inherit", shell: false, cwd: dirname(outputPath) });
  if (thumbnailResult.error?.code === "ENOENT") {
    console.error("FFmpeg não está disponível no PATH. Instale-o localmente e execute novamente.");
    process.exit(1);
  }
  process.exit(thumbnailResult.status ?? 1);
}
