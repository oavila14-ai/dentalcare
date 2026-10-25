"use client";

import type { ClinicSettings } from "@/db/schema";
import { updateClinicSettingsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSave } from "./use-save";

export function ClinicForm({ settings }: { settings: ClinicSettings }) {
  const { pending, errors, save } = useSave();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    save(() => updateClinicSettingsAction(data));
  }

  const text = (name: keyof ClinicSettings, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} htmlFor={name} error={errors[name]}>
      <Input id={name} name={name} defaultValue={String(settings[name] ?? "")} aria-invalid={!!errors[name]} {...props} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del consultorio</CardTitle>
          <CardDescription>Se muestran en la web y en los emails.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {text("name", "Nombre")}
          {text("tagline", "Frase de presentación")}
          {text("address", "Dirección")}
          {text("city", "Ciudad")}
          {text("phone", "Teléfono")}
          {text("whatsapp", "WhatsApp", { placeholder: "+504 9999-0000" })}
          {text("email", "Email de contacto", { type: "email" })}
          {text("mapsUrl", "Enlace de Google Maps", { type: "url" })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reglas de reserva</CardTitle>
          <CardDescription>Controlan qué horarios ven los pacientes al solicitar turno.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {text("minHoursBeforeBooking", "Anticipación mínima (horas)", { type: "number", min: 0, max: 168 })}
          {text("maxDaysAhead", "Reservar hasta (días adelante)", { type: "number", min: 1, max: 365 })}
          {text("cancellationHours", "Cancelación hasta (horas antes)", { type: "number", min: 0, max: 168 })}
          {text("slotStepMin", "Intervalo entre horarios (min)", { type: "number", min: 5, max: 120, step: 5 })}
          {text("maxActivePerPatient", "Turnos activos por paciente", { type: "number", min: 1, max: 20 })}
        </CardContent>
      </Card>
      <Button type="submit" size="lg" loading={pending}>Guardar cambios</Button>
    </form>
  );
}
