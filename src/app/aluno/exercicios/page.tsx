import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { ExerciseCard } from "@/components/student/exercise-card";
import { EmptyState } from "@/components/student/ui";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/auth/guard";
import { muscleGroups } from "@/lib/instructor/labels";
import { getAcademyExercises, getActivePlan, getDayExercises, getFavoriteIds } from "@/lib/student/data";
import { pageNumber } from "@/lib/supabase/pagination";
import type { ExerciseRow } from "@/types/database";

export default async function StudentExercisesPage({ searchParams }: { searchParams: Promise<{ busca?: string; grupo?: string; pagina?: string }> }) {
  const profile = await requireRole("student");
  const [params, academy, active, favoriteIds] = await Promise.all([searchParams, getAcademyExercises(), getActivePlan(profile.id), getFavoriteIds(profile.id)]);
  const prescribed = active ? (await Promise.all(active.days.map((day) => getDayExercises(day.id)))).flat().map((item) => item.exercise).filter((item): item is ExerciseRow => !!item && item.is_active) : [];
  const catalog = [...new Map([...prescribed, ...academy].map((exercise) => [exercise.id, exercise])).values()];
  const group = muscleGroups.some((item) => item.value === params.grupo) ? params.grupo : undefined;
  const search = (params.busca ?? "").trim().slice(0, 100);
  const filtered = catalog.filter((exercise) => (!group || exercise.muscle_group === group) && (!search || exercise.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
  const page = pageNumber(params.pagina);
  const chips = [{ value: "", label: "Todos" }, ...muscleGroups];
  return <div className="student-library mx-auto max-w-5xl"><header className="mb-4"><h1 className="text-[1.55rem] font-black tracking-tight">Biblioteca de Exercícios</h1></header>
    <form className="mb-4 flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar exercício</span><Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-200" size={20} /><input className="form-input pl-12" defaultValue={search} maxLength={100} name="busca" placeholder="Buscar exercício..." type="search" /></label>{group && <input name="grupo" type="hidden" value={group} />}<button aria-label="Pesquisar" className="grid w-14 shrink-0 place-items-center rounded-xl border border-sky-400 bg-gradient-to-b from-sky-400 to-blue-700 text-white" type="submit"><SlidersHorizontal size={21} /></button></form>
    <nav aria-label="Grupos musculares" className="student-library-chips mb-5 flex gap-2 overflow-x-auto pb-1">{chips.map((chip) => { const url = new URLSearchParams(); if (search) url.set("busca", search); if (chip.value) url.set("grupo", chip.value); return <Link aria-current={(group ?? "") === chip.value ? "page" : undefined} className="student-library-chip shrink-0 rounded-full border border-sky-500/45 px-4 py-2 text-sm font-bold text-sky-100" href={`/aluno/exercicios${url.size ? `?${url}` : ""}`} key={chip.value}>{chip.label}</Link>; })}</nav>
    {filtered.length ? <div className="grid gap-3 lg:grid-cols-2">{filtered.slice((page - 1) * 20, page * 20).map((exercise) => <ExerciseCard exercise={exercise} favorite isFavorite={favoriteIds.has(exercise.id)} key={exercise.id} />)}</div> : <EmptyState title="Nenhum exercício encontrado" description="Tente outro nome ou grupo muscular." />}
    <Pagination filters={{ busca: search, grupo: group }} page={page} pathname="/aluno/exercicios" total={filtered.length} />
  </div>;
}
