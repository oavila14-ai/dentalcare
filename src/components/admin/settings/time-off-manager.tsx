"use client";

import { useState } from "react";
import { CalendarOff, Trash2 } from "lucide-react";
import { addTimeOffAction, deleteTimeOffAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fmt } from "@/lib/dates";
import { useSave } from "./use-save";

type Block = { id: string; startsAt: Date; endsAt: Date; reason: string | null };

export function TimeOffManager({ professionalId, blocks, today }: { professionalId: string; blocks: Block[]; today: string }) {
  const [form, setForm] = useState({ fromDate: today, toDate: today, allDay: true, startTime: "08:00", endTime: "12:00", reason: "" });
  const { pending, errors, save } = useSave();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Bloquear agenda</CardTitle>
          <CardDescription>Feriados, vacaciones o compromisos. No se ofrecerán turnos en ese período.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde" error={errors.fromDate}><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })} /></Field>
          <Field label="Hasta" error={errors.toDate}><Input type="date" value={form.toDate} min={form.fromDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2"><Switch checked={form.allDay} onCheckedChange={(v) => setForm({ ...form, allDay: v })} /> Día completo</label>
          {!form.allDay && (
            <>
              <Field label="Hora inicio"><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
              <Field label="Hora fin"><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
            </>
          )}
          <Field label="Motivo" className="sm:col-span-2"><Input value={form.reason} placeholder="Ej. Feriado nacional" onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Button loading={pending} onClick={() => save(() => addTimeOffAction({ ...form, professionalId }), "Bloqueo agregado", () => setForm({ ...form, reason: "" }))}>
              <CalendarOff /> Bloquear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Los turnos ya agendados en ese período no se cancelan automáticamente: revísalos en el calendario.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Próximos bloqueos</CardTitle></CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay bloqueos programados.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {blocks.map((b) => {
                const allDay = fmt(b.startsAt, "HH:mm") === "00:00" && fmt(b.endsAt, "HH:mm") === "00:00";
                const endShown = allDay ? new Date(b.endsAt.getTime() - 1) : b.endsAt;
                const sameDay = fmt(b.startsAt, "yyyy-MM-dd") === fmt(endShown, "yyyy-MM-dd");
                return (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{b.reason ?? "Bloqueado"}</div>
                      <div className="text-sm text-muted-foreground">
                        {fmt(b.startsAt, "d MMM yyyy")}
                        {!sameDay && ` – ${fmt(endShown, "d MMM yyyy")}`}
                        {allDay ? " · día completo" : ` · ${fmt(b.startsAt, "HH:mm")}–${fmt(b.endsAt, "HH:mm")}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Eliminar bloqueo" disabled={pending} onClick={() => save(() => deleteTimeOffAction(b.id), "Bloqueo eliminado")}><Trash2 /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
