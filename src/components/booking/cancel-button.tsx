"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelMyAppointmentAction } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelAppointmentButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await cancelMyAppointmentAction(id);
      if (res.ok) {
        toast.success("Turno cancelado");
        setOpen(false);
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Cancelar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar este turno?</DialogTitle>
          <DialogDescription>{label}. El horario quedará libre para otro paciente.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Mantener turno</Button></DialogClose>
          <Button variant="destructive" onClick={confirm} loading={pending}>Sí, cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
