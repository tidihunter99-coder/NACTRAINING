"use client";

import { useEffect, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setFavoriteAction } from "@/lib/student/favorites";

export function FavoriteButton({ exerciseId, exerciseName, initialFavorite }: { exerciseId: string; exerciseName: string; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => setFavorite(initialFavorite), [initialFavorite]);

  function toggle() {
    const desired = !favorite;
    setFavorite(desired);
    setError(false);
    startTransition(async () => {
      try { await setFavoriteAction(exerciseId, desired); }
      catch { setFavorite(!desired); setError(true); }
    });
  }

  return <><button aria-label={`${favorite ? "Remover" : "Adicionar"} ${exerciseName} ${favorite ? "dos" : "aos"} favoritos`} aria-pressed={favorite} className="student-favorite" disabled={pending} onClick={toggle} type="button"><Star fill={favorite ? "currentColor" : "none"} size={24} /></button>{error && <span className="sr-only" role="status">Não foi possível atualizar o favorito. Tente novamente.</span>}</>;
}
