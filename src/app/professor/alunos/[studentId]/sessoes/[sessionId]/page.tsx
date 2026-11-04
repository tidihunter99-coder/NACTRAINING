import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { PageHeading, StudentCard } from "@/components/student/ui";
import { requireRole } from "@/lib/auth/guard";
import { getDaysByIds, getExerciseNames, getLinkedStudent, getPrescriptionsByIds, getSessionLogs, getStudentSession } from "@/lib/instructor/data";
import { dateBR, decimalBR, timeBR } from "@/lib/student/format";

export default async function InstructorSessionPage({ params }: { params: Promise<{ studentId: string; sessionId: string }> }) {
  const instructor = await requireRole("instructor");
  const { studentId, sessionId } = await params;
  const student = await getLinkedStudent(instructor.id, studentId);
  if (!student) notFound();
  const session = await getStudentSession(studentId, sessionId);
  if (!session) notFound();
  const [days, logs] = await Promise.all([getDaysByIds([session.workout_day_id]), getSessionLogs([session.id])]);
  const prescriptions = await getPrescriptionsByIds([...new Set(logs.map((log) => log.workout_exercise_id))]);
  const names = await getExerciseNames(prescriptions.map((item) => item.exercise_id));
  const prescriptionById = new Map(prescriptions.map((item) => [item.id, item]));
  const grouped = [...new Set(logs.map((log) => log.workout_exercise_id))].map((id) => ({ prescription: prescriptionById.get(id), logs: logs.filter((log) => log.workout_exercise_id === id) }));
  return <><Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-nac-cyan" href={`/professor/alunos/${studentId}#historico`}><ArrowLeft size={16} /> Voltar ao aluno</Link><PageHeading eyebrow={session.status === "completed" ? "Treino concluído" : "Sessão em andamento"} title={days[0]?.name ?? "Sessão de treino"} description={`${student.profile.full_name || student.profile.email} · ${dateBR(session.started_at)} · ${timeBR(session.started_at)}${session.finished_at ? ` até ${timeBR(session.finished_at)}` : ""}`} /><StudentCard className="mb-5"><div className="flex items-center gap-2"><Clock3 className="text-nac-cyan" size={20} /><h2 className="text-lg font-black">Resumo da sessão</h2></div><p className="mt-3 text-sm text-nac-muted">{logs.filter((log) => log.completed).length} séries registradas em {grouped.length} exercícios. {session.status === "completed" ? "Esta sessão é somente para consulta." : "O aluno ainda pode completar os registros."}</p></StudentCard>{grouped.length ? <div className="space-y-4">{grouped.map(({ prescription, logs: setLogs }) => <StudentCard key={prescription?.id ?? setLogs[0].id}><div className="flex items-center gap-2"><CheckCircle2 className="text-nac-cyan" size={20} /><h2 className="text-lg font-black">{prescription ? names.get(prescription.exercise_id)?.name ?? "Exercício" : "Exercício"}</h2></div><p className="mt-2 text-sm text-nac-muted">{prescription ? `${prescription.sets} séries × ${prescription.repetitions} repetições prescritas` : "Prescrição histórica indisponível"}</p><div className="mt-4 space-y-2">{setLogs.sort((a, b) => a.set_number - b.set_number).map((log) => <div className="grid grid-cols-[auto_1fr_1fr] gap-3 rounded-xl border border-white/10 p-3 text-sm" key={log.id}><span className="font-bold">Série {log.set_number}</span><span className="text-nac-muted">{log.repetitions_completed ?? "—"} repetições</span><span className="text-nac-muted">{log.load_used != null ? `${decimalBR(log.load_used)} kg` : "Sem carga"}</span></div>)}</div></StudentCard>)}</div> : <StudentCard><p className="text-sm text-nac-muted">Ainda não há séries registradas nesta sessão.</p></StudentCard>}</>;
}
