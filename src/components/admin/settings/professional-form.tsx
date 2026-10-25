"use client";

import type { Professional } from "@/db/schema";
import { updateProfessionalAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSave } from "./use-save";

export function ProfessionalForm({ professional: p }: { professional: Professional }) {
  const { pending, errors, save } = useSave();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    save(() => updateProfessionalAction(p.id, data));
  }
  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{p.title} {p.name}</CardTitle>
          <CardDescription>Se muestra en la sección “Nosotros” de la web.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-[120px_1fr]">
          <Field label="Título" error={errors.title}><Input name="title" defaultValue={p.title} placeholder="Dr. / Dra." /></Field>
          <Field label="Nombre completo" error={errors.name}><Input name="name" defaultValue={p.name} /></Field>
          <Field label="Especialidad" error={errors.specialty} className="sm:col-span-2"><Input name="specialty" defaultValue={p.specialty} /></Field>
          <Field label="Foto (URL)" error={errors.photoUrl} hint="Enlace público a una foto cuadrada" className="sm:col-span-2"><Input name="photoUrl" type="url" defaultValue={p.photoUrl ?? ""} /></Field>
          <Field label="Presentación" error={errors.bio} className="sm:col-span-2"><Textarea name="bio" defaultValue={p.bio ?? ""} maxLength={400} /></Field>
          <div className="sm:col-span-2"><Button type="submit" loading={pending}>Guardar</Button></div>
        </CardContent>
      </Card>
    </form>
  );
}
