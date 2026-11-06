"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setFavoriteAction(exerciseId: string, favorite: boolean) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId)) throw new Error("Exercício inválido");
  const profile = await requireRole("student");
  const db = await createSupabaseServerClient();
  if (!db) throw new Error("Conexão indisponível");
  if (favorite) {
    const { error } = await db.from("student_exercise_favorites").insert({ student_id: profile.id, exercise_id: exerciseId });
    if (error && error.code !== "23505") throw new Error("Não foi possível salvar o favorito");
  } else {
    const { error } = await db.from("student_exercise_favorites").delete().eq("student_id", profile.id).eq("exercise_id", exerciseId);
    if (error) throw new Error("Não foi possível remover o favorito");
  }
  revalidatePath("/aluno/exercicios");
  return favorite;
}
