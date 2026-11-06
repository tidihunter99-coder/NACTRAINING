import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { muscleLabel } from "@/lib/instructor/labels";
import { exercisePhoto } from "@/lib/student/exercise-visual";
import { FavoriteButton } from "@/components/student/favorite-button";
import { ExercisePhoto } from "@/components/student/exercise-photo";
import type { ExerciseRow, WorkoutExerciseRow } from "@/types/database";

export function ExerciseCard({ exercise, prescription, highlighted = false, completed = false, favorite = false, isFavorite = false }: { exercise: ExerciseRow | null; prescription?: WorkoutExerciseRow; highlighted?: boolean; completed?: boolean; favorite?: boolean; isFavorite?: boolean }) {
  const label = exercise?.name ?? "Exercício indisponível";
  const content = <><ExercisePhoto name={label} src={exercisePhoto(exercise)} className="student-exercise-thumb" /><div className="min-w-0 flex-1"><h3 className="truncate text-[0.96rem] font-extrabold text-white sm:text-lg">{label}</h3><p className="mt-0.5 truncate text-sm text-[#a7d8ef]">{exercise ? muscleLabel(exercise.muscle_group) : "Consulte seu professor"}</p>{prescription && <p className="mt-1 text-xs font-semibold text-white/85">{prescription.sets} séries × {prescription.repetitions} repetições</p>}</div>{!favorite && <span className="student-exercise-arrow">{completed ? <Check aria-hidden="true" size={18} /> : <ChevronRight aria-hidden="true" size={20} />}</span>}</>;
  return exercise ? <div className={`student-exercise-row ${highlighted ? "student-exercise-row-highlight" : ""}`}><Link aria-label={`Ver ${label}`} className="student-exercise-main" href={`/aluno/exercicios/${exercise.id}`}>{content}</Link>{favorite && <FavoriteButton exerciseId={exercise.id} exerciseName={label} initialFavorite={isFavorite} />}</div> : <div className="student-exercise-row">{content}</div>;
}
