"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Play, Trash2, Upload } from "lucide-react";
import { privateMediaPath, privateMediaUrl } from "@/lib/exercise-media";

const kinds = [
  { key: "cover", title: "Imagem de capa", accept: "image/jpeg,image/png,image/webp,image/avif", limit: "8 MB" },
  { key: "demonstration", title: "Demonstração", accept: "video/mp4,video/webm,image/gif", limit: "25 MB para vídeo · 12 MB para GIF" },
  { key: "anatomy", title: "Mapa muscular", accept: "image/jpeg,image/png,image/webp,image/avif", limit: "8 MB" },
] as const;
type Kind = (typeof kinds)[number]["key"];

export function ExerciseMediaManager({ exerciseId, initial }: { exerciseId: string; initial: Record<Kind, string | null> }) {
  const router = useRouter();
  const [urls, setUrls] = useState(initial);
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({});
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState("");

  async function upload(kind: Kind) {
    const file = files[kind];
    if (!file) return;
    setBusy(kind); setMessage("");
    const form = new FormData();
    form.set("exerciseId", exerciseId); form.set("kind", kind); form.set("file", file);
    try {
      const response = await fetch("/api/admin/exercise-media", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha no envio");
      setUrls((current) => ({ ...current, [kind]: body.url }));
      setFiles((current) => ({ ...current, [kind]: undefined }));
      setMessage(body.warning ? `Mídia salva. ${body.warning}.` : "Mídia salva no catálogo.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha no envio"); }
    finally { setBusy(null); }
  }

  async function remove(kind: Kind) {
    setBusy(kind); setMessage("");
    try {
      const response = await fetch("/api/admin/exercise-media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId, kind }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao remover");
      setUrls((current) => ({ ...current, [kind]: null }));
      setMessage("Associação removida.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao remover"); }
    finally { setBusy(null); }
  }

  return <div className="space-y-4"><p className="text-sm text-nac-muted">Use somente arquivos próprios ou autorizados e aprovados para o exercício. Capas horizontais a partir de 900 × 450 px são convertidas em WebP. O envio reabre a revisão técnica. Acesso restrito ao administrador.</p>
    {kinds.map((kind) => { const path = privateMediaPath(urls[kind.key], exerciseId, kind.key); const url = privateMediaUrl(urls[kind.key], exerciseId, kind.key); const gif = path?.endsWith(".gif"); const video = path?.endsWith(".mp4") || path?.endsWith(".webm"); return <div className="rounded-xl border border-sky-500/30 bg-[#071b2a] p-4" key={kind.key}><h3 className="font-black">{kind.title}</h3><div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#020d18]">{url ? video ? <video aria-label={kind.title} className="max-h-48 w-full" controls preload="metadata" src={url} /> : gif || kind.key !== "demonstration" ? <img alt={kind.title} className="max-h-48 w-full object-contain" loading="lazy" src={url} /> : <a className="inline-flex items-center gap-2 p-4 text-nac-cyan" href={url} rel="noopener noreferrer" target="_blank"><Play size={18} /> Abrir mídia cadastrada</a> : <div className="flex h-28 items-center justify-center gap-2 text-sm text-nac-muted"><ImageIcon size={22} /> Sem arquivo associado</div>}</div><p className="mt-2 break-all text-xs text-nac-muted">{path || "Nenhum arquivo privado cadastrado"}</p><label className="mt-3 block text-xs font-bold">Selecionar arquivo · {kind.limit}<input accept={kind.accept} className="mt-2 block w-full text-xs" onChange={(event) => setFiles((current) => ({ ...current, [kind.key]: event.target.files?.[0] }))} type="file" /></label><div className="mt-3 flex flex-wrap gap-2"><button className="button-primary" disabled={!files[kind.key] || !!busy} onClick={() => upload(kind.key)} type="button"><Upload size={16} /> Enviar</button>{url && <button className="button-secondary" disabled={!!busy} onClick={() => remove(kind.key)} type="button"><Trash2 size={16} /> Remover associação</button>}</div></div>; })}
    {message && <p aria-live="polite" className="text-sm text-nac-cyan" role="status">{message}</p>}
  </div>;
}
