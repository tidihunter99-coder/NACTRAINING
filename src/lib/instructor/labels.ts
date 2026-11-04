export const muscleGroups = [
  { value: "chest", label: "Peito" }, { value: "back", label: "Costas" },
  { value: "shoulders", label: "Ombros" }, { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" }, { value: "quadriceps", label: "Quadríceps" },
  { value: "hamstrings", label: "Posteriores" }, { value: "glutes", label: "Glúteos" },
  { value: "calves", label: "Panturrilhas" }, { value: "abdomen", label: "Abdômen" },
  { value: "core", label: "Core" }, { value: "full_body", label: "Corpo inteiro" },
] as const;
export function muscleLabel(value: string) { return muscleGroups.find((item) => item.value === value)?.label ?? value; }
export const planStatusLabel = { draft: "Em elaboração", active: "Ativa", archived: "Arquivada" } as const;
