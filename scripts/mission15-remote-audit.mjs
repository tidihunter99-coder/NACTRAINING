import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const auditFile = resolve(root, "supabase/audit/mission15-remote-readonly-audit.sql");
const resultDirectory = resolve(root, "supabase/audit/mission15-remote-results");
const comparisonReport = resolve(root, "docs/evidence/mission15-remote-schema-comparison.md");
const expected = [
  ["01", "mission15-01-server.csv", "Servidor"],
  ["02", "mission15-02-extensions.csv", "Extensões"],
  ["03", "mission15-03-tables.csv", "Tabelas"],
  ["04", "mission15-04-columns.csv", "Colunas"],
  ["05", "mission15-05-constraints.csv", "Constraints"],
  ["06", "mission15-06-indexes.csv", "Índices"],
  ["07", "mission15-07-triggers.csv", "Triggers"],
  ["08", "mission15-08-functions.csv", "Funções"],
  ["09", "mission15-09-policies.csv", "Policies"],
  ["10", "mission15-10-grants.csv", "Grants de tabelas"],
  ["11a", "mission15-11-function-grants.csv", "Grants de funções"],
  ["11b", "mission15-11-schema-grants.csv", "Grants de schemas"],
  ["12", "mission15-12-default-acls.csv", "Default ACLs"],
  ["13", "mission15-13-storage.csv", "Storage"],
  ["14", "mission15-14-migrations-presence.csv", "Presença de migrations"],
  ["15", "mission15-15-dependencies.csv", "Dependências"],
  ["16", "mission15-16-fingerprints.csv", "Fingerprints"],
].map(([id, file, label]) => ({ id, file, label }));

function removeCommentLines(chunk) {
  return chunk.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("--")).join("\n").trim();
}

function stripSqlLiterals(sql) {
  // PostgreSQL doubles a quote inside a standard string literal. Removing
  // literals prevents a privilege name such as 'INSERT' from being confused
  // with a mutating statement while retaining real CTE/DML keywords.
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
    // Reject mutable keywords anywhere in the parsed statement, including a
    // data-changing CTE hidden behind an otherwise innocent leading WITH.
    assert.doesNotMatch(stripSqlLiterals(query), /\b(insert|update|delete|alter|create|drop|grant|revoke|set|call|do|copy|truncate|vacuum)\b/i, `Consulta ${id} contém comando mutável`);
    parsed.set(id, query);
  }
  assert.deepEqual([...parsed.keys()], expected.map((item) => item.id), "Marcadores SQL incompletos ou fora de ordem");
  return parsed;
}

// Parses RFC-4180 CSV, including quoted commas, quotes and newlines. It does
// not infer values; a CSV is only accepted when it has a real header row.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') {
      assert.equal(field, "", "Aspa CSV fora do início do campo");
      quoted = true;
    } else if (char === ",") {
      row.push(field); field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = "";
    } else field += char;
  }
  assert.equal(quoted, false, "CSV termina dentro de uma string quoted");
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const [header, ...values] = rows.filter((line) => line.length !== 1 || line[0] !== "");
  assert.ok(header?.length && header.every(Boolean), "CSV sem cabeçalho");
  assert.equal(new Set(header).size, header.length, "CSV com cabeçalhos duplicados");
  return { header, rows: values.map((row, index) => {
    assert.equal(row.length, header.length, `CSV linha ${index + 2} possui número de colunas inválido`);
    return Object.fromEntries(header.map((name, position) => [name, row[position]]));
  }) };
}

function normalize(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return String(value);
}

function canonical(rows, fields, localFieldNames = false) {
  return rows.map((row) => JSON.stringify(Object.fromEntries(fields.map(([remote, local = remote]) => [remote, normalize(row[localFieldNames ? local : remote])])))).sort();
}

async function localSnapshot(name) {
  return JSON.parse(await readFile(resolve(root, `supabase/audit/mission111-rehearsal-after-${name}.json`), "utf8"));
}

const comparisonSpecs = [
  { file: "mission15-03-tables.csv", local: "tables", category: "Tabelas", risk: "Alto", fields: [["schema_name"], ["table_name"], ["rls_enabled"], ["rls_forced"], ["owner"]] },
  { file: "mission15-04-columns.csv", local: "columns", category: "Colunas", risk: "Alto", fields: [["table_name"], ["ordinal_position"], ["column_name"], ["udt_name"], ["is_nullable"], ["column_default"], ["character_maximum_length"], ["numeric_precision"], ["numeric_scale"]] },
  { file: "mission15-05-constraints.csv", local: "constraints", category: "Constraints", risk: "Alto", fields: [["table_name"], ["constraint_name", "conname"], ["constraint_type", "contype"], ["definition"]] },
  { file: "mission15-06-indexes.csv", local: "indexes", category: "Índices", risk: "Médio", fields: [["table_name", "tablename"], ["index_name", "indexname"], ["definition", "indexdef"]] },
  { file: "mission15-07-triggers.csv", local: "triggers", category: "Triggers", risk: "Crítico", fields: [["schema_name"], ["table_name"], ["trigger_name"], ["definition"]] },
  { file: "mission15-08-functions.csv", local: "functions", category: "Funções", risk: "Crítico", fields: [["schema_name"], ["function_name"], ["arguments"], ["security_definer"], ["owner"], ["definition"]] },
  { file: "mission15-09-policies.csv", local: "policies", category: "Policies RLS", risk: "Crítico", fields: [["table_name", "tablename"], ["policy_name", "policyname"], ["permissive"], ["roles"], ["command", "cmd"], ["using_expression", "qual"], ["check_expression", "with_check"]], publicOnly: true },
  { file: "mission15-11-function-grants.csv", local: "function-grants", category: "Grants de funções", risk: "Crítico", fields: [["schema_name"], ["function_name"], ["arguments"], ["role_name", "grantee"], ["can_execute"]] },
];

async function loadActualResults() {
  const found = new Map();
  for (const item of expected) {
    const path = resolve(resultDirectory, item.file);
    if (existsSync(path)) found.set(item.file, parseCsv(await readFile(path, "utf8")));
  }
  return found;
}

async function report(found, writeReport) {
  const outcomes = [];
  for (const spec of comparisonSpecs) {
    const remote = found.get(spec.file);
    if (!remote) { outcomes.push({ category: spec.category, result: "PENDENTE", risk: spec.risk, detail: `CSV ${spec.file} ausente` }); continue; }
    let rows = remote.rows;
    if (spec.publicOnly) rows = rows.filter((row) => row.schema_name === "public");
    const local = await localSnapshot(spec.local);
    const remoteValue = canonical(rows, spec.fields);
    const localValue = canonical(local, spec.fields, true);
    const equal = JSON.stringify(remoteValue) === JSON.stringify(localValue);
    outcomes.push({ category: spec.category, result: equal ? "APROVADO" : "DIVERGENTE", risk: equal ? "Baixo" : spec.risk, detail: equal ? `${rows.length} registros equivalentes` : `remoto=${rows.length}; local=${local.length}; comparar CSV detalhado` });
  }
  const present = [...found.keys()].length;
  const missing = expected.filter((item) => !found.has(item.file)).map((item) => item.file);
  const fingerprint = found.get("mission15-16-fingerprints.csv");
  outcomes.push({ category: "Fingerprints", result: fingerprint ? "PENDENTE" : "PENDENTE", risk: "Médio", detail: fingerprint ? "Resultado remoto disponível; execute a mesma consulta 16 no PostgreSQL local para comparação equivalente" : "CSV remoto ausente" });
  for (const category of ["Grants de tabelas", "Grants de schemas", "Default ACLs", "Storage", "Migrations", "Dependências"]) {
    outcomes.push({ category, result: "PENDENTE", risk: category === "Storage" ? "Crítico" : "Alto", detail: "Revisão exige CSV real e análise contextual; nenhum resultado é inferido" });
  }
  const markdown = [
    "# Missão 15.1 — comparação de schema remoto", "",
    `Gerado a partir de ${present}/${expected.length} CSVs reais. Não há resultados simulados.`, "",
    "| Categoria | Local | Remoto | Resultado | Risco |", "| --- | --- | --- | --- | --- |",
    ...outcomes.map((item) => `| ${item.category} | snapshot local pós-Missão 11 | ${item.detail} | **${item.result}** | ${item.risk} |`),
    "", "## CSVs pendentes", "",
    ...(missing.length ? missing.map((file) => `- \`${file}\``) : ["- Nenhum CSV obrigatório ausente."]),
    "", "## Limites", "", "- Um resultado DIVERGENTE exige comparação dos CSVs, não autorização automática de migration.", "- Fingerprints só são comparáveis quando a mesma consulta 16 for executada nos dois PostgreSQLs.", "- Storage, Auth e migration history não são inferidos de ausência parcial de arquivo.",
  ].join("\n");
  if (writeReport) {
    assert.ok(present, "Não gerar relatório final sem CSVs reais");
    if (existsSync(comparisonReport) && !process.argv.includes("--replace-report")) throw new Error(`Relatório já existe: ${comparisonReport}. Use --replace-report somente após revisão.`);
    await writeFile(comparisonReport, `${markdown}\n`, { encoding: "utf8", flag: "w" });
  }
  return { markdown, present, missing, outcomes };
}

function copySql(query) {
  return `BEGIN READ ONLY; SET LOCAL statement_timeout = '45s'; COPY (${query.replace(/;\s*$/, "")}) TO STDOUT WITH (FORMAT CSV, HEADER TRUE); ROLLBACK;`;
}

async function executeQueries(queries) {
  const database = process.env.MISSION15_READONLY_DATABASE_URL;
  const service = process.env.MISSION15_READONLY_PG_SERVICE;
  assert.ok(database || service, "Defina MISSION15_READONLY_DATABASE_URL ou MISSION15_READONLY_PG_SERVICE somente no ambiente seguro; nenhum valor será registrado.");
  assert.ok(!(database && service), "Use uma única forma de conexão: URL ou serviço psql.");
  assert.ok(!existsSync(resolve(resultDirectory, "mission15-run-log.json")), "Resultados anteriores existem; recuse sobrescrever evidências.");
  await mkdir(resultDirectory, { recursive: true });
  const run = async (item) => {
    const destination = resolve(resultDirectory, item.file);
    assert.ok(!existsSync(destination), `Recusa sobrescrever ${item.file}`);
    const child = spawn(process.env.MISSION15_PSQL || "psql", ["-X", "--no-psqlrc", "-q", "-w", "-v", "ON_ERROR_STOP=1"], {
      cwd: root,
      env: { ...process.env, ...(database ? { PGDATABASE: database } : { PGSERVICE: service }), PGCONNECT_TIMEOUT: "15" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = [], stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.end(copySql(queries.get(item.id)));
    const code = await new Promise((resolveCode, reject) => { child.on("error", reject); child.on("exit", resolveCode); });
    if (code !== 0) throw new Error(`${item.id} falhou: ${Buffer.concat(stderr).toString("utf8").slice(-800)}`);
    const data = Buffer.concat(stdout);
    assert.ok(data.length, `${item.id} não retornou CSV`);
    parseCsv(data.toString("utf8"));
    await writeFile(destination, data, { flag: "wx" });
    return { id: item.id, file: item.file, bytes: data.length };
  };
  const completed = [];
  try { for (const item of expected) completed.push(await run(item)); }
  finally { await writeFile(resolve(resultDirectory, "mission15-run-log.json"), JSON.stringify({ mode: "authenticated-read-only", completed, failed: completed.length !== expected.length, generatedAt: new Date().toISOString() }, null, 2), { flag: "wx" }).catch(() => {}); }
  return completed;
}

const mode = process.argv[2] || "--check";
const queries = parseQueries(await readFile(auditFile, "utf8"));
if (mode === "--check") {
  const found = await loadActualResults();
  const current = await report(found, false);
  console.log(JSON.stringify({ status: "READY", queries: expected.map(({ id, file }) => ({ id, file })), availableResults: current.present, missing: current.missing }, null, 2));
} else if (mode === "--execute") {
  const completed = await executeQueries(queries);
  console.log(`MISSION15_REMOTE_AUDIT_EXECUTED ${completed.length}/${expected.length}`);
} else if (mode === "--compare") {
  const current = await report(await loadActualResults(), true);
  console.log(`MISSION15_COMPARISON_WRITTEN results=${current.present}/${expected.length}`);
} else {
  throw new Error("Uso: node scripts/mission15-remote-audit.mjs [--check|--execute|--compare]");
}
