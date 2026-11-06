"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { ClipboardList, Dumbbell, Layers3, RotateCcw, Weight } from "lucide-react";
import { muscleLabel } from "@/lib/instructor/labels";
import { exerciseAnatomy } from "@/lib/student/exercise-visual";
import type { ExerciseRow, WorkoutExerciseRow } from "@/types/database";

const tabs = ["Detalhes", "Execução", "Músculos"] as const;

export function ExerciseDetail({ exercise, prescription }: { exercise: ExerciseRow; prescription: WorkoutExerciseRow | null }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Detalhes");
  const reviewed = exercise.visual_review_status === "approved";
  const instructions = reviewed ? exercise.instructions?.split(/\n+/).map((line) => line.trim()).filter(Boolean) ?? [] : [];
  const anatomy = exerciseAnatomy(exercise);
  const tip = prescription?.notes || (reviewed ? exercise.coaching_tip : null);
  const mistakes = reviewed ? exercise.common_mistakes?.split(/\n+/).map((line) => line.trim()).filter(Boolean) ?? [] : [];
  const mistakesCard = mistakes.length > 0 && <div className="student-mistakes"><h2>⚠ Erros comuns</h2><ul>{mistakes.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div>;
  const steps = <div className="student-instructions"><div className="student-instructions-copy"><h2><ClipboardList size={20} /> Como executar</h2>{instructions.length ? <ol>{instructions.map((line, index) => <li key={`${line}-${index}`}><span>{index + 1}</span><p>{line}</p></li>)}</ol> : <p className="mt-3 text-sm text-nac-muted">Instruções de execução pendentes. Consulte seu professor.</p>}</div>{anatomy ? <img alt={`Ilustração anatômica dos músculos ${muscleLabel(exercise.muscle_group)}`} className="student-anatomy" src={anatomy} /> : <p className="student-anatomy-pending">Ilustração muscular pendente</p>}</div>;
  return <>
    <div aria-label="Informações do exercício" className="student-detail-tabs" role="tablist">{tabs.map((item) => <button aria-controls={`exercise-panel-${item}`} aria-selected={tab === item} className="student-detail-tab" id={`exercise-tab-${item}`} key={item} onClick={() => setTab(item)} role="tab" type="button">{item}</button>)}</div>
    <section aria-labelledby={`exercise-tab-${tab}`} id={`exercise-panel-${tab}`} role="tabpanel">
      {tab === "Detalhes" && <><div className="student-prescription"><div><Layers3 size={22} /><span>Séries<strong>{prescription?.sets ?? "—"}</strong></span></div><div><RotateCcw size={22} /><span>Repetições<strong>{prescription?.repetitions ?? "—"}</strong></span></div><div><Weight size={22} /><span>Carga<strong>{prescription?.suggested_load != null ? `${prescription.suggested_load} kg` : "A definir"}</strong></span></div></div>{steps}{tip && <div className="student-tip"><h2>ⓘ &nbsp; Dica da NAC</h2><p>{tip}</p></div>}{mistakesCard}</>}
      {tab === "Execução" && <>{steps}{reviewed && exercise.description && <p className="student-detail-description">{exercise.description}</p>}{mistakesCard}</>}
      {tab === "Músculos" && <div className="student-muscles"><Dumbbell className="text-nac-yellow" size={26} /><h2>Grupos trabalhados</h2>{anatomy && <img alt={`Músculos ${muscleLabel(exercise.muscle_group)} destacados`} src={anatomy} />}<p>Principal: <strong>{muscleLabel(exercise.muscle_group)}</strong></p>{exercise.secondary_muscles.length > 0 && <p>Secundários: <strong>{exercise.secondary_muscles.map(muscleLabel).join(", ")}</strong></p>}{exercise.equipment && <p>Equipamento: <strong>{exercise.equipment}</strong></p>}{!anatomy && <p>Ilustração muscular pendente para este grupo.</p>}</div>}
    </section>
  </>;
}
