"use client";

import { useState } from "react";
import { Clock, Pencil, Plus } from "lucide-react";
import type { Service } from "@/db/schema";
import { saveServiceAction } from "@/app/actions/admin";
import { SERVICE_ICON_NAMES, SERVICE_ICONS, ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatLempiras } from "@/lib/utils";
import { useSave } from "./use-save";

const COLORS = ["#0ea5a4", "#22d3ee", "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981"];

type Draft = { name: string; description: string; durationMin: string; price: string; color: string; icon: string; active: boolean };

const toDraft = (s?: Service): Draft => ({
  name: s?.name ?? "",
  description: s?.description ?? "",
  durationMin: String(s?.durationMin ?? 30),
  price: s?.price ? String(Number(s.price)) : "",
  color: s?.color ?? COLORS[0],
  icon: s?.icon ?? "sparkles",
  active: s?.active ?? true,
});

export function ServicesManager({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const { pending, errors, save } = useSave();

  function open(s: Service | "new") {
    setEditing(s);
    setDraft(toDraft(s === "new" ? undefined : s));
  }

  function toggle(s: Service, active: boolean) {
    save(() => saveServiceAction(s.id, { ...toDraft(s), active }), active ? "Servicio activado" : "Servicio oculto");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Servicios</CardTitle>
          <CardDescription>Los servicios inactivos no se muestran a los pacientes.</CardDescription>
        </div>
        <Button onClick={() => open("new")}><Plus /> Nuevo</Button>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <ul className="divide-y divide-border/70">
          {services.map((s) => (
            <li key={s.id} className={cn("flex items-center gap-4 px-6 py-3.5", !s.active && "opacity-55")}>
              <ServiceIcon icon={s.icon} color={s.color} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {s.durationMin} min</span>
                  {formatLempiras(s.price) && <span>{formatLempiras(s.price)}</span>}
                </div>
              </div>
              <Switch checked={s.active} onCheckedChange={(v) => toggle(s, v)} aria-label={`${s.active ? "Ocultar" : "Mostrar"} ${s.name}`} disabled={pending} />
              <Button variant="ghost" size="icon-sm" onClick={() => open(s)} aria-label={`Editar ${s.name}`}><Pencil /></Button>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nuevo servicio" : "Editar servicio"}</DialogTitle>
            <DialogDescription>La duración define el tiempo que se reserva en la agenda.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={errors.name} className="sm:col-span-2"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Descripción" error={errors.description} className="sm:col-span-2"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="min-h-16" /></Field>
            <Field label="Duración (minutos)" error={errors.durationMin}><Input type="number" min={5} max={480} step={5} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} /></Field>
            <Field label="Precio de referencia (L)" error={errors.price} hint="Opcional"><Input type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
            <Field label="Color" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setDraft({ ...draft, color: c })} aria-label={`Color ${c}`}
                    className={cn("size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110", draft.color === c && "ring-2 ring-foreground")}
                    style={{ background: c }} />
                ))}
              </div>
            </Field>
            <Field label="Ícono" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {SERVICE_ICON_NAMES.map((name) => {
                  const Icon = SERVICE_ICONS[name];
                  return (
                    <button key={name} type="button" onClick={() => setDraft({ ...draft, icon: name })} aria-label={name}
                      className={cn("flex size-10 cursor-pointer items-center justify-center rounded-xl border transition-colors hover:bg-accent", draft.icon === name && "border-transparent ring-2 ring-primary")}
                      style={draft.icon === name ? { color: draft.color } : undefined}>
                      <Icon className="size-5" />
                    </button>
                  );
                })}
              </div>
            </Field>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> Visible para los pacientes
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              loading={pending}
              onClick={() => save(() => saveServiceAction(editing === "new" ? null : (editing as Service).id, draft), "Servicio guardado", () => setEditing(null))}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
