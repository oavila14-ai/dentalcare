"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) return setFieldError("Las contraseñas no coinciden");
    startTransition(async () => {
      const res = await updatePasswordAction(password);
      if (!res.ok) {
        setError(res.error);
        setFieldError(res.fieldErrors?.password);
        return;
      }
      toast.success("Contraseña actualizada");
      router.replace(redirectTo);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormAlert>{error}</FormAlert>
      <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 8 caracteres, con letras y números">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={fieldError}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required aria-invalid={!!fieldError} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Guardar contraseña</Button>
    </form>
  );
}
