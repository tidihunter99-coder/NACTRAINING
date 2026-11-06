import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourcePath = resolve(root, "supabase/audit/mission15-remote-readonly-audit.sql");
const consolidatedPath = resolve(root, "supabase/audit/mission15-consolidated-readonly.sql");
const resultDirectory = resolve(root, "supabase/audit/mission15-remote-results");
const format = "nac_mission15_consolidated_v1";
const outerHeaders = ["audit_format", "query_id", "query_label", "record_type", "record_index", "columns", "row_data"];

// The header registry is deliberately explicit. A schema record is emitted for
// every query, so a valid zero-row query remains distinguishable from a missing
// query in a single SQL Editor CSV export.
const expected = [
  ["01", "mission15-01-server.csv", "Servidor", ["database_name", "sql_role", "postgres_version", "server_version", "server_version_num", "audited_at"]],
  ["02", "mission15-02-extensions.csv", "Extensões", ["extension_name", "extension_version", "schema_name"]],
  ["03", "mission15-03-tables.csv", "Tabelas", ["schema_name", "table_name", "relkind", "rls_enabled", "rls_forced", "owner"]],
  ["04", "mission15-04-columns.csv", "Colunas", ["table_name", "ordinal_position", "column_name", "udt_name", "is_nullable", "column_default", "character_maximum_length", "numeric_precision", "numeric_scale"]],
  ["05", "mission15-05-constraints.csv", "Constraints", ["table_name", "constraint_name", "constraint_type", "definition"]],
  ["06", "mission15-06-indexes.csv", "Índices", ["table_name", "index_name", "definition"]],
  ["07", "mission15-07-triggers.csv", "Triggers", ["schema_name", "table_name", "trigger_name", "definition", "trigger_function"]],
  ["08", "mission15-08-functions.csv", "Funções", ["schema_name", "function_name", "arguments", "result_type", "language", "security_definer", "function_config", "owner", "definition"]],
  ["09", "mission15-09-policies.csv", "Policies", ["schema_name", "table_name", "policy_name", "permissive", "roles", "command", "using_expression", "check_expression"]],
  ["10", "mission15-10-grants.csv", "Grants de tabelas", ["table_name", "role_name", "can_select", "can_insert", "can_update", "can_delete"]],
  ["11a", "mission15-11-function-grants.csv", "Grants de funções", ["schema_name", "function_name", "arguments", "role_name", "can_execute"]],
  ["11b", "mission15-11-schema-grants.csv", "Grants de schemas", ["schema_name", "role_name", "can_use", "can_create"]],
  ["12", "mission15-12-default-acls.csv", "Default ACLs", ["owner", "schema_name", "object_kind", "grantee", "privilege_type", "is_grantable"]],
  ["13", "mission15-13-storage.csv", "Storage", ["bucket_id", "bucket_name", "public", "file_size_limit", "allowed_mime_types", "object_count"]],
  ["14", "mission15-14-migrations-presence.csv", "Presença de migrations", ["schema_name", "relation_name", "relkind"]],
  ["15", "mission15-15-dependencies.csv", "Dependências", ["object", "depends_on", "dependency_type"]],
  ["16", "mission15-16-fingerprints.csv", "Fingerprints", ["category", "fingerprint"]],
].map(([id, file, label, columns]) => ({ id, file, label, columns }));

function removeCommentLines(chunk) {
  return chunk.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("--")).join("\n").trim();
}

function stripSqlLiterals(sql) {
  return sql.replace(/'(?:''|[^'])*'/gs, "''").replace(/"(?:""|[^"])*"/gs, '""');
}

function parseQueries(source) {
  const matches = [...source.matchAll(/^--\s+(\d{2}[a-z]?)\s+—\s+.*$/gim)];
  const parsed = new Map();
  for (const [index, match] of matches.entries()) {
    const id = match[1];
    if (!expected.some((item) => item.id === id)) continue;
    const end = matches[index + 1]?.index ?? source.length;
    const query = removeCommentLines(source.slice(match.index + match[0].length, end));
    assert.match(query, /^(select|with)\b/i, `Consulta ${id} não inicia com SELECT/WITH`);
    assert.match(query, /;\s*$/, `Consulta ${id} deve terminar com ponto e vírgula`);
    assert.doesNotMatch(stripSqlLiterals(query), /\b(insert|update|delete|alter|create|drop|grant|revoke|set|call|do|copy|truncate|vacuum)\b/i, `Consulta ${id} contém comando mutável`);
    parsed.set(id, query.replace(/;\s*$/, ""));
  }
  assert.deepEqual([...parsed.keys()], expected.map((item) => item.id), "Consultas consolidadas incompletas ou fora de ordem");
  return parsed;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function buildSql(queries) {
  const rows = expected.map((item) => `  select ${sqlLiteral(item.id)}::text as query_id, ${sqlLiteral(item.label)}::text as query_label, ${sqlLiteral(JSON.stringify(item.columns))}::jsonb as columns, to_jsonb(q) as row_data\n  from (\n${queries.get(item.id)}\n  ) as q`).join("\n  union all\n");
  const manifest = expected.map((item) => `    (${sqlLiteral(item.id)}::text, ${sqlLiteral(item.label)}::text, ${sqlLiteral(JSON.stringify(item.columns))}::jsonb)`).join(",\n");
  return `-- NAC TRAINING — Mission 15.2 consolidated authenticated audit\n--\n-- READ-ONLY: this file is generated from mission15-remote-readonly-audit.sql.\n-- It contains the same 17 SELECT/WITH queries (11a and 11b are independent),\n-- wrapped only to serialize each result row as JSON. It performs no DDL/DML,\n-- does not call application RPCs, and does not read application or Auth rows.\n--\n-- SQL Editor usage: run this entire file once and export the single result as CSV\n-- without changing columns or truncating rows. Import it locally with:\n--   node scripts/mission15-consolidated-readonly.mjs --import <export.csv>\n--\n-- A \"schema\" record is emitted for every query, including zero-row results.\n\nwith audit_rows as (\n${rows}\n),\nmanifest(query_id, query_label, columns) as (\n  values\n${manifest}\n),\nexport_rows as (\n  select ${sqlLiteral(format)}::text as audit_format, m.query_id, m.query_label, 'schema'::text as record_type, 0::bigint as record_index, m.columns, null::jsonb as row_data, 0 as record_sort\n  from manifest m\n  union all\n  select ${sqlLiteral(format)}::text, a.query_id, a.query_label, 'row'::text, row_number() over (partition by a.query_id)::bigint, a.columns, a.row_data, 1\n  from audit_rows a\n)\nselect audit_format, query_id, query_label, record_type, record_index, columns, row_data\nfrom export_rows\norder by query_id, record_sort, record_index;\n`;
}

function parseCsv(text) {
  const lines = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') {
      assert.equal(field, "", "Aspa CSV fora do início do campo");
      quoted = true;
    } else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); lines.push(row); row = []; field = ""; }
    else field += character;
  }
  assert.equal(quoted, false, "CSV termina dentro de uma string quoted");
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); lines.push(row); }
  const [headers, ...rows] = lines.filter((line) => line.length !== 1 || line[0] !== "");
  assert.deepEqual(headers, outerHeaders, "CSV não é uma exportação consolidada Mission 15.2 válida");
  return rows.map((values, rowIndex) => {
    assert.equal(values.length, headers.length, `Linha ${rowIndex + 2} tem número inválido de colunas`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseJson(value, label) {
  try { return JSON.parse(value); }
  catch { throw new Error(`${label} não contém JSON válido`); }
}

async function importConsolidated(path) {
  assert.ok(!existsSync(resolve(resultDirectory, "mission15-run-log.json")), "Resultados anteriores existem; recuse sobrescrever evidências.");
  const rows = parseCsv(await readFile(path, "utf8"));
  assert.ok(rows.length >= expected.length, "Exportação consolidada incompleta: faltam registros schema");
  const byId = new Map(expected.map((item) => [item.id, { item, rows: [], schema: null }]));
  for (const row of rows) {
    assert.equal(row.audit_format, format, "Formato de auditoria desconhecido");
    const target = byId.get(row.query_id);
    assert.ok(target, `Consulta desconhecida no CSV: ${row.query_id}`);
    assert.equal(row.query_label, target.item.label, `Rótulo inválido na consulta ${row.query_id}`);
    const columns = parseJson(row.columns, `Colunas da consulta ${row.query_id}`);
    assert.deepEqual(columns, target.item.columns, `Cabeçalhos divergentes na consulta ${row.query_id}`);
    if (row.record_type === "schema") {
      assert.equal(row.record_index, "0", `Índice schema inválido na consulta ${row.query_id}`);
      assert.ok(row.row_data === "" || row.row_data === "null", `Registro schema não pode conter dados na consulta ${row.query_id}`);
      assert.equal(target.schema, null, `Registro schema duplicado na consulta ${row.query_id}`);
      target.schema = true;
    } else if (row.record_type === "row") {
      const index = Number(row.record_index);
      assert.ok(Number.isSafeInteger(index) && index > 0, `Índice de linha inválido na consulta ${row.query_id}`);
      const data = parseJson(row.row_data, `Dados da consulta ${row.query_id}`);
      assert.ok(data && typeof data === "object" && !Array.isArray(data), `Dados inválidos na consulta ${row.query_id}`);
      assert.deepEqual(Object.keys(data).sort(), [...target.item.columns].sort(), `Campos divergentes na consulta ${row.query_id}`);
      target.rows.push({ index, data });
    } else throw new Error(`Tipo de registro inválido: ${row.record_type}`);
  }
  for (const target of byId.values()) {
    assert.equal(target.schema, true, `Consulta ${target.item.id} não tem registro schema`);
    target.rows.sort((a, b) => a.index - b.index);
    assert.deepEqual(target.rows.map((row) => row.index), target.rows.map((_, index) => index + 1), `Índices não sequenciais na consulta ${target.item.id}`);
  }
  await mkdir(resultDirectory, { recursive: true });
  const sourceHash = createHash("sha256").update(await readFile(path)).digest("hex");
  const completed = [];
  for (const { item, rows: resultRows } of byId.values()) {
    const destination = resolve(resultDirectory, item.file);
    assert.ok(!existsSync(destination), `Recusa sobrescrever ${item.file}`);
    const output = [item.columns.map(csvCell).join(","), ...resultRows.map(({ data }) => item.columns.map((column) => csvCell(data[column])).join(","))].join("\n").concat("\n");
    await writeFile(destination, output, { encoding: "utf8", flag: "wx" });
    completed.push({ id: item.id, file: item.file, rows: resultRows.length });
  }
  await writeFile(resolve(resultDirectory, "mission15-run-log.json"), JSON.stringify({ mode: "sql-editor-consolidated-read-only-import", completed, importedAt: new Date().toISOString(), sourceSha256: sourceHash }, null, 2).concat("\n"), { encoding: "utf8", flag: "wx" });
  return completed;
}

const mode = process.argv[2] ?? "--verify";
const source = await readFile(sourcePath, "utf8");
const generated = buildSql(parseQueries(source));
if (mode === "--verify") {
  assert.equal(await readFile(consolidatedPath, "utf8"), generated, "SQL consolidado está desatualizado; regenere a partir do audit original");
  console.log(`MISSION15_CONSOLIDATED_READY queries=${expected.length}`);
} else if (mode === "--print-sql") {
  process.stdout.write(generated);
} else if (mode === "--import") {
  const input = process.argv[3];
  assert.ok(input, "Uso: node scripts/mission15-consolidated-readonly.mjs --import <export.csv>");
  const completed = await importConsolidated(resolve(root, input));
  console.log(`MISSION15_CONSOLIDATED_IMPORTED ${completed.length}/${expected.length}`);
} else {
  throw new Error("Uso: node scripts/mission15-consolidated-readonly.mjs [--verify|--print-sql|--import <export.csv>]");
}
