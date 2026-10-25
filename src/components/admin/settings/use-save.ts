"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/validations";

/** Ejecuta una acción del servidor mostrando toasts y errores por campo. */
export function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save(fn: () => Promise<ActionResult<unknown>>, success = "Cambios guardados", onOk?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setErrors({});
        toast.success(success);
        onOk?.();
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  return { pending, errors, save };
}
