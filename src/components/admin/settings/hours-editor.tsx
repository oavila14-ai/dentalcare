"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveWorkingHoursAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WEEK_ORDER, WEEKDAYS } from "@/lib/schedule";
import { useSave } from "./use-save";

type Block = { weekday: number; startTime: string; endTime: string };

export function HoursEditor({ professionalId, initial }: { professionalId: string; initial: Block[] }) {
  const [blocks, setBlocks] = useState<Block[]>(initial.map((b) => ({ ...b, startTime: b.startTime.slice(0, 5), endTime: b.endTime.slice(0, 5) })));
  const { pending, save } = useSave();

  const update = (idx: number, patch: Partial<Block>) => setBlocks((bs) => bs.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const remove = (idx: number) => setBlocks((bs) => bs.filter((_, i) => i !== idx));
  const add = (weekday: number) => {
    const last = blocks.filter((b) => b.weekday === weekday).at(-1);
    setBlocks((bs) => [...bs, last ? { weekday, startTime: last.endTime < "14:00" ? "14:00" : last.endTime, endTime: "18:00" } : { weekday, startTime: "08:00", endTime: "12:00" }]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario de atención</CardTitle>
        <CardDescription>Puedes cargar varios bloques por día (por ejemplo, mañana y tarde). Hora de Honduras.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {WEEK_ORDER.map((wd) => {
          const dayBlocks = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.weekday === wd);
          const open = dayBlocks.length > 0;
          return (
            <div key={wd} className="flex flex-col gap-3 border-b border-border/60 py-3.5 last:border-0 sm:flex-row sm:items-start">
              <label className="flex w-36 shrink-0 items-center gap-3 pt-2 text-sm font-medium">
                <Switch checked={open} onCheckedChange={(v) => (v ? add(wd) : setBlocks((bs) => bs.filter((b) => b.weekday !== wd)))} />
                {WEEKDAYS[wd]}
              </label>
              {open ? (
                <div className="flex-1 space-y-2">
                  {dayBlocks.map(({ b, i }) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={b.startTime} step={900} onChange={(e) => update(i, { startTime: e.target.value })} className="w-32" aria-label="Desde" />
                      <span className="text-muted-foreground">a</span>
                      <Input type="time" value={b.endTime} step={900} onChange={(e) => update(i, { endTime: e.target.value })} className="w-32" aria-label="Hasta" />
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Quitar bloque"><Trash2 /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => add(wd)}><Plus /> Agregar bloque</Button>
                </div>
              ) : (
                <span className="pt-2 text-sm text-muted-foreground">Cerrado</span>
              )}
            </div>
          );
        })}
        <div className="pt-4">
          <Button loading={pending} onClick={() => save(() => saveWorkingHoursAction(professionalId, blocks), "Horario guardado")}>Guardar horario</Button>
        </div>
      </CardContent>
    </Card>
  );
}
