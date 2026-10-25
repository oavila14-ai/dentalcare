import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-soft",
        highlight && "border-transparent bg-brand-gradient text-white shadow-glow",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", highlight ? "text-white/85" : "text-muted-foreground")}>{label}</span>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", highlight ? "bg-white/20" : "bg-accent text-primary")}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", highlight ? "text-white/80" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}
