export const exerciseMediaBucket = "nac-exercise-media";
export const exerciseMediaFields = { cover: "image_url", demonstration: "video_url", anatomy: "anatomy_image_url" } as const;
export type ExerciseMediaKind = keyof typeof exerciseMediaFields;

const referencePattern = /^nac-media:exercises\/([0-9a-f-]{36})\/(cover|demonstration|anatomy)-([0-9a-f-]{36})\.(webp|gif|mp4|webm)$/i;

export function privateMediaPath(reference: string | null | undefined, exerciseId: string, kind: ExerciseMediaKind) {
  const match = reference?.match(referencePattern);
  if (!match || match[1].toLowerCase() !== exerciseId.toLowerCase() || match[2] !== kind) return null;
  if (kind === "demonstration" ? !["gif", "mp4", "webm"].includes(match[4]) : match[4] !== "webp") return null;
  return reference!.slice("nac-media:".length);
}

export function privateMediaUrl(reference: string | null | undefined, exerciseId: string, kind: ExerciseMediaKind) {
  const path = privateMediaPath(reference, exerciseId, kind);
  if (!path) return null;
  return `/api/exercise-media/${exerciseId}/${kind}?v=${encodeURIComponent(path.split("/").at(-1) || "")}`;
}
