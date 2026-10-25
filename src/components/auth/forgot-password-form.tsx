"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    startTransition(async () => {
      const res = await requestPasswordResetAction(email);
      if (res.ok) setSent(true);
      else setError(res.error);
    });
  }

  if (sent) {
    return <FormAlert variant="success">Si el email está registrado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.</FormAlert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormAlert>{error}</FormAlert>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Enviar enlace</Button>
    </form>
  );
}
