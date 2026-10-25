"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signInAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [error, setError] = useState(initialError);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signInAction({ email: form.get("email"), password: form.get("password") }, next);
      // Si el login es exitoso, la acción redirige y no vuelve aquí.
      if (res && !res.ok) {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormAlert>{error}</FormAlert>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" required aria-invalid={!!errors.email} />
      </Field>
      <Field
        label={
          <span className="flex w-full items-center justify-between">
            Contraseña
            <Link href="/recuperar" className="text-xs font-normal text-primary hover:underline">¿La olvidaste?</Link>
          </span>
        }
        htmlFor="password"
        error={errors.password}
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={!!errors.password} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Ingresar
      </Button>
    </form>
  );
}
