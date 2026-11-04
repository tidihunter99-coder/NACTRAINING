interface SectionHeaderProps {
  align?: "center" | "left";
  description: string;
  eyebrow: string;
  title: string;
}

export function SectionHeader({ align = "left", description, eyebrow, title }: SectionHeaderProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-nac-silver sm:text-lg">{description}</p>
    </div>
  );
}
