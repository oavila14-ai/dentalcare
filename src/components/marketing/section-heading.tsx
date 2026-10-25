import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl space-y-3 text-center", className)}>
      <div className="text-gradient text-sm font-semibold tracking-wide uppercase">{eyebrow}</div>
      <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">{title}</h2>
      {description && <p className="text-lg text-pretty text-muted-foreground">{description}</p>}
    </div>
  );
}
