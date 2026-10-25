"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDaysKey, capitalize, weekdayOf } from "@/lib/dates";
import { cn } from "@/lib/utils";

const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Calendario mensual (lunes primero). Solo se pueden elegir los días con disponibilidad. */
export function MonthCalendar({
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  today,
  selected,
  onSelect,
  available,
  loading,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  minMonth: string;
  maxMonth: string;
  today: string;
  selected: string | null;
  onSelect: (day: string) => void;
  available: Record<string, string[]> | undefined;
  loading: boolean;
}) {
  const first = `${month}-01`;
  const offset = (weekdayOf(first) + 6) % 7;
  const daysInMonth = Number(addDaysKey(shiftMonth(month, 1) + "-01", -1).slice(8));
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const [y, m] = month.split("-").map(Number);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-semibold">
          {capitalize(MONTHS[m - 1])} <span className="text-muted-foreground">{y}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Mes anterior" disabled={month <= minMonth} onClick={() => onMonthChange(shiftMonth(month, -1))}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Mes siguiente" disabled={month >= maxMonth} onClick={() => onMonthChange(shiftMonth(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => (
          <div key={i} className="pb-2 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const slots = available?.[day]?.length ?? 0;
          const isSelected = day === selected;
          const disabled = loading || slots === 0;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${Number(day.slice(8))}${slots ? `, ${slots} horarios libres` : ", sin horarios"}`}
              className={cn(
                "relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isSelected
                  ? "bg-brand-gradient text-white shadow-glow"
                  : slots
                    ? "bg-accent/60 text-foreground hover:bg-accent hover:scale-105"
                    : "cursor-default text-muted-foreground/35",
                loading && "animate-pulse",
                day === today && !isSelected && "ring-1 ring-primary/50",
              )}
            >
              {Number(day.slice(8))}
              {slots > 0 && !isSelected && <span className="absolute bottom-1.5 size-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
