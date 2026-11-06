"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Dumbbell } from "lucide-react";

export function ExercisePhoto({ name, src, className = "" }: { name: string; src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div aria-label={`Imagem de ${name}`} className={`student-exercise-photo ${className}`} role="img">
    {src && !failed ? <img alt="" className="h-full w-full object-cover" decoding="async" loading="lazy" onError={() => setFailed(true)} src={src} /> : <Dumbbell aria-hidden="true" size={32} />}
  </div>;
}
