import type { ExerciseRow } from "@/types/database";
import { privateMediaPath, privateMediaUrl } from "@/lib/exercise-media";

export function safeMediaUrl(value: string | null | undefined) {
  if (!value || /\s/.test(value)) return null;
  if (/^https:\/\//i.test(value) || /^\/(?!\/)/.test(value)) return value;
  const localApi = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (localApi && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/i.test(localApi) && value.startsWith(`${localApi}/storage/v1/object/public/nac-exercise-media/`)) return value;
  return null;
}

type ReviewedMedia = Pick<ExerciseRow, "id" | "visual_review_status" | "image_url" | "video_url" | "anatomy_image_url">;

export function exercisePhoto(exercise: ReviewedMedia | null) {
  return exercise?.visual_review_status === "approved" ? privateMediaUrl(exercise.image_url, exercise.id, "cover") : null;
}

export function exerciseAnatomy(exercise: ReviewedMedia) {
  return exercise.visual_review_status === "approved" ? privateMediaUrl(exercise.anatomy_image_url, exercise.id, "anatomy") : null;
}

export function exerciseDemonstration(exercise: ReviewedMedia) {
  if (exercise.visual_review_status !== "approved") return { url: null, type: null } as const;
  const path = privateMediaPath(exercise.video_url, exercise.id, "demonstration");
  return { url: path ? privateMediaUrl(exercise.video_url, exercise.id, "demonstration") : null, type: path?.endsWith(".gif") ? "gif" : path ? "video" : null } as const;
}
