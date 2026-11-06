import { privateMediaPath } from "@/lib/exercise-media";
import type { ExerciseRow } from "@/types/database";

export function exerciseCoverage(exercise: ExerciseRow) {
  const image = !!privateMediaPath(exercise.image_url, exercise.id, "cover");
  const demoUrl = privateMediaPath(exercise.video_url, exercise.id, "demonstration");
  const demonstration = !!demoUrl;
  const anatomy = !!privateMediaPath(exercise.anatomy_image_url, exercise.id, "anatomy");
  const instructions = !!exercise.instructions?.trim();
  const tip = !!exercise.coaching_tip?.trim();
  const mistakes = !!exercise.common_mistakes?.trim();
  const missing = [!image && "imagem", !demonstration && "demonstração", !anatomy && "mapa muscular", !instructions && "instruções", !tip && "dica", !mistakes && "erros comuns"].filter((item): item is string => !!item);
  const invalidUrls = Number(!!exercise.image_url && !image) + Number(!!exercise.video_url && !demonstration) + Number(!!exercise.anatomy_image_url && !anatomy);
  const unsupportedDemonstration = !!demoUrl && !demonstration;
  return { image, demonstration, anatomy, instructions, tip, mistakes, missing, invalidUrls, unsupportedDemonstration, complete: exercise.visual_review_status === "approved" && missing.length === 0 && invalidUrls === 0 && !unsupportedDemonstration };
}
