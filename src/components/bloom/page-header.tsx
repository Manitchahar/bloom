export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10">
      <h1 className="mb-2 font-display text-[clamp(2rem,4vw,2.8rem)] font-bold leading-tight text-foreground">
        {title}
      </h1>
      <p className="max-w-[500px] text-[1.1rem] leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}
