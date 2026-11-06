import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ExerciseDetail } from "@/components/student/exercise-detail";
import { ExerciseMedia } from "@/components/student/exercise-media";
import { exerciseDemonstration, exercisePhoto } from "@/lib/student/exercise-visual";
import { requireRole } from "@/lib/auth/guard";
import { muscleLabel } from "@/lib/instructor/labels";
import { getActivePlan, getDayExercises, getExercise, getSession } from "@/lib/student/data";

export default async function ExerciseDetailPage({ params, searchParams }: { params: Promise<{ exerciseId: string }>; searchParams: Promise<{ sessao?: string }> }) {
  const profile = await requireRole("student");
  const { exerciseId } = await params;
  const [exercise, active] = await Promise.all([getExercise(exerciseId), getActivePlan(profile.id)]);
  if (!exercise) notFound();
  const { sessao } = await searchParams;
  const session = sessao ? await getSession(profile.id, sessao) : null;
  const prescribed = session
    ? (await getDayExercises(session.workout_day_id)).find((item) => item.exercise?.id === exercise.id)?.prescription ?? null
    : active ? (await Promise.all(active.days.map((day) => getDayExercises(day.id)))).flat().find((item) => item.exercise?.id === exercise.id)?.prescription ?? null : null;
  const photo = exercisePhoto(exercise);
  const demonstration = exerciseDemonstration(exercise);
  const back = session ? `/aluno/treino/${session.id}` : "/aluno/exercicios";
  return <div className="student-detail mx-auto max-w-3xl"><div className="student-detail-heading"><Link aria-label={session ? "Voltar à sessão" : "Voltar à biblioteca"} href={back}><ArrowLeft size={24} /></Link><span>Detalhe do Exercício</span></div><ExerciseMedia demonstration={demonstration.url} demonstrationType={demonstration.type} name={exercise.name} photo={photo} /><div className="student-detail-identity"><div><h1>{exercise.name}</h1><p>{muscleLabel(exercise.muscle_group)}</p></div><Image alt="NAC New Athletic Center" height={305} src="/logos/nac-header.webp" width={710} /></div><ExerciseDetail exercise={exercise} prescription={prescribed} /><Link className="button-secondary mt-6 w-full" href={session ? back : "/aluno/treinos"}>{session ? "Voltar à sessão" : "Voltar ao treino"}</Link></div>;
}
