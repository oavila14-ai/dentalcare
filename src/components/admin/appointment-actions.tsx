"use client";

import { useState, useTransition } from "react";
import { Ban, Check, CheckCheck, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { changeAppointmentStatusAction } from "@/app/actions/admin";
import type { AppointmentStatus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const REJECT_PRESETS = [
  "El horario ya no está disponible",
  "El profesional no podrá atender ese día",
  "El servicio requiere una evaluación previa",
];

type ReasonTarget = "rejected" | "cancelled";

export function AppointmentActions({
  id,
  status,
  isPast,
  size = "sm",
  className,
}: {
  id: string;
  status: AppointmentStatus;
  isPast: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<AppointmentStatus | null>(null);
  const [reasonFor, setReasonFor] = useState<ReasonTarget | null>(null);
  const [reason, setReason] = useState("");

  function run(to: AppointmentStatus, note?: string) {
    setBusy(to);
    startTransition(async () => {
      const res = await changeAppointmentStatusAction(id, to, note);
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReasonFor(null);
      setReason("");
      toast.success(
        { confirmed: "Turno confirmado. Avisamos al paciente.", rejected: "Solicitud rechazada", cancelled: "Turno cancelado", completed: "Marcado como atendido", no_show: "Marcado como no asistió" }[to as string] ?? "Actualizado",
      );
    });
  }

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {status === "pending" && (
          <>
            <Button size={size} variant="success" loading={busy === "confirmed"} disabled={pending} onClick={() => run("confirmed")}>
              <Check /> Confirmar
            </Button>
            <Button size={size} variant="outline" disabled={pending} onClick={() => setReasonFor("rejected")}>
              <X /> Rechazar
            </Button>
          </>
        )}
        {status === "confirmed" && (
          <>
            {isPast && (
              <>
                <Button size={size} variant="success" loading={busy === "completed"} disabled={pending} onClick={() => run("completed")}>
                  <CheckCheck /> Atendido
                </Button>
                <Button size={size} variant="outline" loading={busy === "no_show"} disabled={pending} onClick={() => run("no_show")}>
                  <UserX /> No asistió
                </Button>
              </>
            )}
            {!isPast && (
              <Button size={size} variant="outline" disabled={pending} onClick={() => setReasonFor("cancelled")} className="text-destructive hover:text-destructive">
                <Ban /> Cancelar turno
              </Button>
            )}
          </>
        )}
        {status === "completed" && (
          <Button size={size} variant="ghost" loading={busy === "no_show"} disabled={pending} onClick={() => run("no_show")}>Cambiar a “No asistió”</Button>
        )}
        {status === "no_show" && (
          <Button size={size} variant="ghost" loading={busy === "completed"} disabled={pending} onClick={() => run("completed")}>Cambiar a “Atendido”</Button>
        )}
      </div>

      <Dialog open={reasonFor !== null} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonFor === "rejected" ? "Rechazar solicitud" : "Cancelar turno"}</DialogTitle>
            <DialogDescription>
              Le enviaremos un email al paciente con este motivo{reasonFor === "rejected" ? " y un enlace para elegir otro horario" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REJECT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent", reason === p && "border-primary bg-accent")}
              >
                {p}
              </button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} placeholder="Motivo (visible para el paciente)" />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Volver</Button></DialogClose>
            <Button
              variant="destructive"
              loading={pending}
              disabled={reasonFor === "rejected" && !reason.trim()}
              onClick={() => reasonFor && run(reasonFor, reason)}
            >
              {reasonFor === "rejected" ? "Rechazar" : "Cancelar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
