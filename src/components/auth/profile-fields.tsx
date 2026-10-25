"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { maskDni, maskPhone } from "@/lib/masks";

type ProfileValues = {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  birthDate: string;
  insurance?: string;
};

/** Campos de datos personales compartidos por registro, completar perfil y "Mi perfil". */
export function ProfileFields<T extends ProfileValues>({
  register,
  setValue,
  errors,
}: {
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
}) {
  // react-hook-form tipa los nombres por T; aquí trabajamos con las claves comunes.
  const reg = register as unknown as UseFormRegister<ProfileValues>;
  const set = setValue as unknown as UseFormSetValue<ProfileValues>;
  const err = errors as FieldErrors<ProfileValues>;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre" htmlFor="firstName" error={err.firstName?.message}>
        <Input id="firstName" autoComplete="given-name" aria-invalid={!!err.firstName} {...reg("firstName")} />
      </Field>
      <Field label="Apellido" htmlFor="lastName" error={err.lastName?.message}>
        <Input id="lastName" autoComplete="family-name" aria-invalid={!!err.lastName} {...reg("lastName")} />
      </Field>
      <Field label="DNI" htmlFor="dni" error={err.dni?.message} hint="13 dígitos">
        <Input
          id="dni"
          inputMode="numeric"
          placeholder="0801-1990-12345"
          aria-invalid={!!err.dni}
          {...reg("dni", { onChange: (e) => set("dni", maskDni(e.target.value)) })}
        />
      </Field>
      <Field label="Teléfono / WhatsApp" htmlFor="phone" error={err.phone?.message}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted-foreground">+504</span>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="9999-9999"
            className="pl-14"
            aria-invalid={!!err.phone}
            {...reg("phone", { onChange: (e) => set("phone", maskPhone(e.target.value)) })}
          />
        </div>
      </Field>
      <Field label="Fecha de nacimiento" htmlFor="birthDate" error={err.birthDate?.message}>
        <Input id="birthDate" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} aria-invalid={!!err.birthDate} {...reg("birthDate")} />
      </Field>
      <Field label={<>Seguro médico <span className="font-normal text-muted-foreground">(opcional)</span></>} htmlFor="insurance" error={err.insurance?.message}>
        <Input id="insurance" placeholder="Ej. IHSS, seguro privado…" {...reg("insurance")} />
      </Field>
    </div>
  );
}
