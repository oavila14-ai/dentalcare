"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { motion } from "motion/react";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUpSchema } from "@/lib/validations";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { ProfileFields } from "./profile-fields";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", dni: "", phone: "", birthDate: "", insurance: "", email: "", password: "", privacy: false as unknown as true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(undefined);
    const res = await signUpAction(values);
    if (res.ok) {
      if (res.data?.signedIn) return router.replace("/turnos/nuevo");
      return setSentTo(res.data?.email);
    }
    setError(res.error);
    for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
      setFieldError(field as keyof typeof values, { message });
    }
  });

  if (sentTo) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass space-y-4 rounded-3xl p-8 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <MailCheck className="size-6" />
        </span>
        <h2 className="text-xl font-semibold">Revisa tu correo</h2>
        <p className="text-muted-foreground">
          Te enviamos un enlace a <strong className="text-foreground">{sentTo}</strong> para confirmar tu cuenta.
          Si no lo ves, revisa la carpeta de spam.
        </p>
        <Button asChild variant="outline" className="w-full"><Link href="/login">Ir a ingresar</Link></Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormAlert>{error}</FormAlert>
      <ProfileFields register={register} setValue={setValue} errors={errors} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="tu@email.com" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <Controller
            control={control}
            name="privacy"
            render={({ field }) => (
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                aria-invalid={!!errors.privacy}
                className="mt-0.5"
              />
            )}
          />
          <span className="text-muted-foreground">
            Acepto la{" "}
            <Link href="/privacidad" target="_blank" className="font-medium text-primary hover:underline">política de privacidad</Link>{" "}
            y el uso de mis datos para gestionar mis turnos.
          </span>
        </label>
        {errors.privacy && <p className="text-[13px] font-medium text-destructive">{errors.privacy.message}</p>}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Crear cuenta
      </Button>
    </form>
  );
}
