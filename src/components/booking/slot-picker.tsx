"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { fmtTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function SlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: string[];
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  const groups = [
    { label: "Mañana", icon: Sun, items: slots.filter((s) => Number(fmtTime(s).slice(0, 2)) < 12) },
    { label: "Tarde", icon: Moon, items: slots.filter((s) => Number(fmtTime(s).slice(0, 2)) >= 12) },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label} className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <g.icon className="size-3.5" /> {g.label}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {g.items.map((iso, i) => {
              const active = iso === selected;
              return (
                <motion.button
                  key={iso}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => onSelect(iso)}
                  aria-pressed={active}
                  className={cn(
                    "h-11 cursor-pointer rounded-xl border text-sm font-medium tabular-nums transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active
                      ? "border-transparent bg-foreground text-background shadow-soft"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent",
                  )}
                >
                  {fmtTime(iso)}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
