import { NextRequest, NextResponse } from "next/server";
import { getExercise, isUuid } from "@/lib/admin/data";
import { getVerifiedProfile } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { exerciseMediaBucket as bucket, exerciseMediaFields as fields, privateMediaPath } from "@/lib/exercise-media";

export const runtime = "nodejs";

type Kind = keyof typeof fields;
const formats = {
  "image/jpeg": { ext: "jpg", max: 8 * 1024 * 1024, kinds: ["cover", "anatomy"] },
  "image/png": { ext: "png", max: 8 * 1024 * 1024, kinds: ["cover", "anatomy"] },
  "image/webp": { ext: "webp", max: 8 * 1024 * 1024, kinds: ["cover", "anatomy"] },
  "image/avif": { ext: "avif", max: 8 * 1024 * 1024, kinds: ["cover", "anatomy"] },
  "image/gif": { ext: "gif", max: 12 * 1024 * 1024, kinds: ["demonstration"] },
  "video/mp4": { ext: "mp4", max: 25 * 1024 * 1024, kinds: ["demonstration"] },
  "video/webm": { ext: "webm", max: 25 * 1024 * 1024, kinds: ["demonstration"] },
} as const;

function json(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return !!origin && (origin === new URL(request.url).origin || (!!site && origin === new URL(site).origin));
}
function kindOf(value: unknown): value is Kind { return typeof value === "string" && value in fields; }
function signature(bytes: Uint8Array, mime: keyof typeof formats) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (mime === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (mime === "image/avif") return ascii(4, 8) === "ftyp" && /avif|avis/.test(ascii(8, 16));
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (mime === "video/mp4") return ascii(4, 8) === "ftyp";
  return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}
async function context(request: NextRequest, exerciseId: string) {
  if (!allowedOrigin(request)) return { error: json("Origem não permitida", 403) };
  const auth = await getVerifiedProfile();
  if (auth.state !== "ok" || auth.profile?.role !== "admin") return { error: json("Acesso restrito", 403) };
  if (!isUuid(exerciseId)) return { error: json("Exercício inválido", 400) };
  const current = await getExercise(exerciseId);
  if (!current) return { error: json("Exercício não encontrado", 404) };
  const db = await createSupabaseServerClient();
  if (!db) return { error: json("Banco indisponível", 503) };
  return { current, db };
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) return json("Origem não permitida", 403);
  const auth = await getVerifiedProfile();
  if (auth.state !== "ok" || auth.profile?.role !== "admin") return json("Acesso restrito", 403);
  const length = Number(request.headers.get("content-length") || 0);
  if (!length || length > 26 * 1024 * 1024) return json("Tamanho do envio inválido", 413);
  const form = await request.formData().catch(() => null);
  if (!form) return json("Envio inválido", 400);
  const exerciseId = form.get("exerciseId");
  const kind = form.get("kind");
  const file = form.get("file");
  if (typeof exerciseId !== "string" || !kindOf(kind) || !(file instanceof File)) return json("Dados inválidos", 400);
  const checked = await context(request, exerciseId);
  if ("error" in checked) return checked.error;
  const format = formats[file.type as keyof typeof formats];
  if (!format || !format.kinds.includes(kind as never) || file.size < 16 || file.size > format.max) return json("Tipo ou tamanho não permitido", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signature(bytes, file.type as keyof typeof formats)) return json("Assinatura do arquivo inválida", 400);
  let output: Uint8Array = bytes;
  let contentType = file.type;
  let extension: string = format.ext;
  if (kind !== "demonstration") {
    try {
      const image = sharp(bytes, { limitInputPixels: 40_000_000 }).rotate();
      const meta = await image.metadata();
      if (!meta.width || !meta.height || !["jpeg", "png", "webp", "avif"].includes(meta.format)) return json("Imagem inválida", 400);
      if (kind === "cover" && (meta.width < 900 || meta.height < 450 || meta.width / meta.height < 1.3 || meta.width / meta.height > 2.2)) return json("Capa deve ter ao menos 900 × 450 px e enquadramento horizontal", 400);
      output = await image.resize({ width: 1440, height: kind === "cover" ? 900 : 1440, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toBuffer();
      if (output.byteLength > 900_000) return json("Imagem otimizada acima de 900 KB", 400);
      contentType = "image/webp";
      extension = "webp";
    } catch { return json("Falha ao processar imagem", 400); }
  }
  const path = `exercises/${exerciseId}/${kind}-${crypto.randomUUID()}.${extension}`;
  const upload = await checked.db.storage.from(bucket).upload(path, output, { contentType, upsert: false, cacheControl: "31536000" });
  if (upload.error) return json("Falha ao enviar arquivo", 500);
  const url = `nac-media:${path}`;
  const field = fields[kind];
  const previous = checked.current.exercise[field];
  const update = await checked.db.from("exercises").update({ [field]: url, visual_review_status: "pending", media_rights_note: null, technical_reviewer: null, visual_reviewed_by: null, visual_reviewed_at: null }).eq("id", exerciseId).select("id").maybeSingle();
  if (update.error || !update.data) {
    await checked.db.storage.from(bucket).remove([path]);
    return json("Falha ao associar arquivo", 500);
  }
  const oldPath = privateMediaPath(previous, exerciseId, kind);
  const removed = oldPath ? await checked.db.storage.from(bucket).remove([oldPath]) : null;
  return NextResponse.json({ url, warning: removed?.error ? "Arquivo anterior requer limpeza administrativa" : null });
}

export async function DELETE(request: NextRequest) {
  if (!allowedOrigin(request)) return json("Origem não permitida", 403);
  const auth = await getVerifiedProfile();
  if (auth.state !== "ok" || auth.profile?.role !== "admin") return json("Acesso restrito", 403);
  const body = await request.json().catch(() => null);
  const exerciseId = body?.exerciseId;
  const kind = body?.kind;
  if (typeof exerciseId !== "string" || !kindOf(kind)) return json("Dados inválidos", 400);
  const checked = await context(request, exerciseId);
  if ("error" in checked) return checked.error;
  const field = fields[kind];
  const previous = checked.current.exercise[field];
  const update = await checked.db.from("exercises").update({ [field]: null, visual_review_status: "pending", media_rights_note: null, technical_reviewer: null, visual_reviewed_by: null, visual_reviewed_at: null }).eq("id", exerciseId).select("id").maybeSingle();
  if (update.error || !update.data) return json("Falha ao remover associação", 500);
  const oldPath = privateMediaPath(previous, exerciseId, kind);
  if (oldPath) {
    const removed = await checked.db.storage.from(bucket).remove([oldPath]);
    if (removed.error) {
      await checked.db.from("exercises").update({ [field]: previous }).eq("id", exerciseId);
      return json("Falha ao remover arquivo", 500);
    }
  }
  return NextResponse.json({ removed: true });
}
