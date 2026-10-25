"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAdminNotesAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AdminNotes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Notas visibles solo para el consultorio…" className="min-h-28" />
      <Button
        size="sm"
        variant="solid"
        disabled={value === saved}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await updateAdminNotesAction(id, value);
            if (res.ok) {
              setSaved(value);
              toast.success("Notas guardadas");
            } else toast.error(res.error);
          })
        }
      >
        Guardar notas
      </Button>
    </div>
  );
}
