import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormAlert({ children, variant = "error" }: { children: React.ReactNode; variant?: "error" | "success" }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        variant === "error"
          ? "border-destructive/25 bg-destructive/8 text-destructive"
          : "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
      )}
    >
      {variant === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}
