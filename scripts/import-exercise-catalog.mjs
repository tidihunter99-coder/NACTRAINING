#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertLocalOrigin } from "./local-test-target.mjs";

const usage = `Uso:
  npm run catalog:import-local -- --input <catalogo.json> [--simulate-only|--apply]

Importa somente metadados de exercícios para o Supabase LOCAL. Sem --apply,
o comando apenas valida e informa o que seria inserido. --apply também exige
NAC_ALLOW_LOCAL_CATALOG_IMPORT=yes. --simulate-only valida o arquivo sem
conectar ao banco local. Uma exportação autenticada de
public.exercises é aceita apenas em simulação: seus IDs e vínculos de mídia
são preservados na validação, mas nunca gravados por este comando.`;

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(usage);
  process.exit(0);
}

const inputIndex = args.indexOf("--input");
const input = inputIndex >= 0 ? args[inputIndex + 1] : null;
const apply = args.includes("--apply");
const simulateOnly = args.includes("--simulate-only");
assert.ok(!(apply && simulateOnly), "Use apenas um entre --apply e --simulate-only");
if (!input || input.startsWith("--") || args.some((arg, index) => arg === "--input" && index !== inputIndex)) {
  console.error(usage);
  process.exit(1);
}

const allowedGroups = new Set(["chest", "back", "shoulders", "biceps", "triceps", "quadriceps", "hamstrings", "glutes", "calves", "abdomen", "core", "full_body"]);
const allowedEquipment = new Set(["dumbbells", "barbells", "machines", "cables", "bodyweight", "bands", "other"]);
const allowedDifficulty = new Set(["beginner", "intermediate", "advanced"]);
const mediaFields = ["video_url", "image_url", "anatomy_image_url", "visual_review_status", "media_rights_note", "technical_reviewer"];
const normalized = (value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const nullableText = (value, field, maximum) => {
  if (value == null || value === "") return null;
  assert.equal(typeof value, "string", `${field} deve ser texto`);
  const cleaned = value.trim();
  assert.ok(cleaned.length <= maximum, `${field} excede ${maximum} caracteres`);
  return cleaned || null;
};

const sourcePath = resolve(input);
const parsed = JSON.parse(await readFile(sourcePath, "utf8"));
const rows = Array.isArray(parsed) ? parsed : parsed?.exercises;
assert.ok(Array.isArray(rows), "O JSON deve ser uma lista ou conter { exercises: [...] }");
assert.ok(rows.length > 0, "O catálogo não contém exercícios");
const remoteExport = !Array.isArray(parsed) && parsed?.schema === "public" && parsed?.table === "exercises";
if (remoteExport) {
  assert.equal(parsed.count, rows.length, "A contagem declarada não corresponde aos exercícios exportados");
}

const seen = new Set();
const seenIds = new Set();
const exercises = rows.map((row, index) => {
  assert.ok(row && typeof row === "object" && !Array.isArray(row), `Exercício ${index + 1} inválido`);
  if (!remoteExport) {
    for (const field of mediaFields) assert.ok(!(field in row), `Exercício ${index + 1}: ${field} não é importado por este comando`);
  }
  const id = remoteExport ? nullableText(row.id, `Exercício ${index + 1}: id`, 36) : null;
  if (remoteExport) {
    assert.match(id ?? "", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, `Exercício ${index + 1}: id UUID inválido`);
    assert.ok(!seenIds.has(id), `ID duplicado no arquivo: ${id}`);
    seenIds.add(id);
  }
  const name = nullableText(row.name, `Exercício ${index + 1}: name`, 160);
  assert.ok(name && name.length >= 2, `Exercício ${index + 1}: name precisa ter entre 2 e 160 caracteres`);
  const nameKey = normalized(name);
  assert.ok(!seen.has(nameKey), `Exercício duplicado no arquivo: ${name}`);
  seen.add(nameKey);
  assert.equal(typeof row.muscle_group, "string", `Exercício ${index + 1}: muscle_group obrigatório`);
  const muscle_group = row.muscle_group.trim();
  assert.ok(allowedGroups.has(muscle_group), `Exercício ${index + 1}: muscle_group inválido`);
  const equipment = nullableText(row.equipment, `Exercício ${index + 1}: equipment`, 80);
  assert.ok(!equipment || allowedEquipment.has(equipment), `Exercício ${index + 1}: equipment inválido`);
  const difficulty = nullableText(row.difficulty, `Exercício ${index + 1}: difficulty`, 32);
  assert.ok(!difficulty || allowedDifficulty.has(difficulty), `Exercício ${index + 1}: difficulty inválido`);
  assert.ok(row.secondary_muscles == null || Array.isArray(row.secondary_muscles), `Exercício ${index + 1}: secondary_muscles deve ser lista`);
  const secondary_muscles = (row.secondary_muscles ?? []).map((item) => {
    assert.equal(typeof item, "string", `Exercício ${index + 1}: secondary_muscles inválido`);
    const value = item.trim();
    assert.ok(value.length > 0 && value.length <= 80, `Exercício ${index + 1}: músculo secundário inválido`);
    return value;
  });
  assert.equal(new Set(secondary_muscles.map(normalized)).size, secondary_muscles.length, `Exercício ${index + 1}: músculos secundários duplicados`);
  return {
    id,
    name,
    muscle_group,
    secondary_muscles,
    equipment,
    difficulty,
    description: nullableText(row.description, `Exercício ${index + 1}: description`, 4000),
    instructions: nullableText(row.instructions, `Exercício ${index + 1}: instructions`, 4000),
    visibility: "academy",
    is_active: true,
    original_media: remoteExport ? {
      video_url: nullableText(row.video_url, `Exercício ${index + 1}: video_url`, 2048),
      image_url: nullableText(row.image_url, `Exercício ${index + 1}: image_url`, 2048),
      anatomy_image_url: nullableText(row.anatomy_image_url, `Exercício ${index + 1}: anatomy_image_url`, 2048),
    } : null,
  };
});

if (simulateOnly) {
  const mediaLinks = exercises.filter((exercise) => Object.values(exercise.original_media ?? {}).some(Boolean)).length;
  console.log(`CATALOG_IMPORT_DRY_RUN valid=${exercises.length} existing=skipped ids=${remoteExport ? seenIds.size : 0} media=${mediaLinks} source=${remoteExport ? "remote_export" : "local_input"}`);
  process.exit(0);
}

const localUrl = process.env.SUPABASE_LOCAL_URL;
const localSecret = process.env.SUPABASE_LOCAL_SECRET_KEY;
assertLocalOrigin(localUrl, "127.0.0.1");
assert.ok(localSecret?.startsWith("sb_secret_"), "Defina apenas SUPABASE_LOCAL_SECRET_KEY da pilha local");
const db = createClient(localUrl, localSecret, { auth: { autoRefreshToken: false, persistSession: false } });
const existing = await db.from("exercises").select("id,name");
assert.ifError(existing.error);
const existingNames = new Set(existing.data.map((row) => normalized(row.name)));
const duplicates = exercises.filter((exercise) => existingNames.has(normalized(exercise.name))).map((exercise) => exercise.name);
assert.equal(duplicates.length, 0, `Importação recusada: nomes já existentes localmente: ${duplicates.join(", ")}`);

if (!apply) {
  const mediaLinks = exercises.filter((exercise) => Object.values(exercise.original_media ?? {}).some(Boolean)).length;
  console.log(`CATALOG_IMPORT_DRY_RUN valid=${exercises.length} existing=${existing.data.length} ids=${remoteExport ? seenIds.size : 0} media=${mediaLinks} source=${remoteExport ? "remote_export" : "local_input"}`);
  process.exit(0);
}

assert.ok(!remoteExport, "A exportação autenticada só pode ser simulada: a importação real exige autorização explícita e resolução de relacionamentos locais.");
assert.equal(process.env.NAC_ALLOW_LOCAL_CATALOG_IMPORT, "yes", "Defina NAC_ALLOW_LOCAL_CATALOG_IMPORT=yes para confirmar uma gravação local");
const inserted = await db.from("exercises").insert(exercises.map(({ id, original_media, ...exercise }) => exercise)).select("id,name");
assert.ifError(inserted.error);
assert.equal(inserted.data.length, exercises.length, "Inserção local incompleta");
console.log(`CATALOG_IMPORT_LOCAL_PASS inserted=${inserted.data.length} media=0 review=pending`);
