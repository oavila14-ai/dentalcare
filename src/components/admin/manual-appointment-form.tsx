"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { createManualAppointmentAction, getAdminDaySlotsAction, searchPatientsAction } from "@/app/actions/admin";
import { SlotPicker } from "@/components/booking/slot-picker";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { maskDni, maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";

type ServiceOption = { id: string; name: string; durationMin: number; professionals: { id: string; label: string }[] };
type PatientHit = { id: string; name: string; dni: string | null; phone: string | null; email: string };

export function ManualAppointmentForm({ services, today }: { services: ServiceOption[]; today: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [np, setNp] = useState({ firstName: "", lastName: "", dni: "", phone: "", email: "" });
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [professionalId, setProfessionalId] = useState(service?.professionals[0]?.id ?? "");
  const [day, setDay] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, startSubmit] = useTransition();

  // Búsqueda de pacientes con debounce
  useEffect(() => {
    if (mode !== "existing" || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await searchPatientsAction(query);
      if (res.ok) setHits(res.data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode]);

  useEffect(() => {
    setProfessionalId(service?.professionals[0]?.id ?? "");
  }, [service]);

  // Horarios libres del día elegido
  useEffect(() => {
    if (!serviceId || !professionalId || !day) return;
    let cancelled = false;
    setSlots(null);
    setSlot(null);
    getAdminDaySlotsAction(serviceId, professionalId, day).then((res) => {
      if (cancelled) return;
      if (res.ok) setSlots(res.data ?? []);
      else toast.error(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, professionalId, day]);

  function submit() {
    setError(undefined);
    setErrors({});
    startSubmit(async () => {
      const res = await createManualAppointmentAction({
        patientId: mode === "existing" ? patient?.id : undefined,
        newPatient: mode === "new" ? np : undefined,
        serviceId,
        professionalId,
        startsAt: slot,
        notes,
      });
      if (res.ok && res.data) {
        toast.success("Turno creado y confirmado");
        router.push(`/admin/turnos/${res.data.id}`);
        return;
      }
      if (!res.ok) {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  const canSubmit = Boolean(slot && serviceId && professionalId && (mode === "existing" ? patient : np.firstName && np.lastName && np.dni && np.phone));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>1. Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-xl bg-muted p-1">
              {([["existing", "Existente", Users], ["new", "Nuevo", UserPlus]] as const).map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn("flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {mode === "existing" ? (
              patient ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent/50 p-4">
                  <div>
                    <div className="font-semibold">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">{[patient.dni, patient.phone].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>Cambiar</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input autoFocus aria-label="Buscar paciente" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, DNI o teléfono" className="pl-10" />
                  </div>
                  {hits.length > 0 && (
                    <ul className="divide-y overflow-hidden rounded-xl border">
                      {hits.map((h) => (
                        <li key={h.id}>
                          <button type="button" onClick={() => setPatient(h)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted">
                            <span>
                              <span className="block font-medium">{h.name}</span>
                              <span className="block text-xs text-muted-foreground">{[h.dni, h.phone, h.email].filter(Boolean).join(" · ")}</span>
                            </span>
                            <Check className="size-4 text-muted-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {query.trim().length >= 2 && hits.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sin resultados. <button type="button" className="cursor-pointer font-medium text-primary hover:underline" onClick={() => setMode("new")}>Crear paciente nuevo</button>
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="np-first" label="Nombre" error={errors["newPatient.firstName"]}><Input id="np-first" value={np.firstName} onChange={(e) => setNp({ ...np, firstName: e.target.value })} /></Field>
                <Field htmlFor="np-last" label="Apellido" error={errors["newPatient.lastName"]}><Input id="np-last" value={np.lastName} onChange={(e) => setNp({ ...np, lastName: e.target.value })} /></Field>
                <Field htmlFor="np-dni" label="DNI" error={errors["newPatient.dni"]}><Input id="np-dni" inputMode="numeric" placeholder="0801-1990-12345" value={np.dni} onChange={(e) => setNp({ ...np, dni: maskDni(e.target.value) })} /></Field>
                <Field htmlFor="np-phone" label="Teléfono" error={errors["newPatient.phone"]}><Input id="np-phone" inputMode="tel" placeholder="9999-9999" value={np.phone} onChange={(e) => setNp({ ...np, phone: maskPhone(e.target.value) })} /></Field>
                <Field label={<>Email <span className="font-normal text-muted-foreground">(opcional)</span></>} error={errors["newPatient.email"]} hint="Si lo indicas, recibirá la confirmación y podrá ingresar a la web." htmlFor="np-email" className="sm:col-span-2">
                  <Input id="np-email" type="email" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} />
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Servicio</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Servicio" htmlFor="m-service">
              <NativeSelect id="m-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>)}
              </NativeSelect>
            </Field>
            <Field label="Profesional" htmlFor="m-pro">
              <NativeSelect id="m-pro" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} disabled={(service?.professionals.length ?? 0) <= 1}>
                {service?.professionals.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </NativeSelect>
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>3. Fecha y hora</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Field label="Día" htmlFor="m-day">
              <Input id="m-day" type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} />
            </Field>
            {slots === null ? (
              <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : slots.length ? (
              <SlotPicker slots={slots} selected={slot} onSelect={setSlot} />
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No hay horarios libres ese día.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>4. Notas internas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea aria-label="Notas internas" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} placeholder="Ej. Llamó por dolor en muela inferior." />
            <FormAlert>{error}</FormAlert>
            <Button size="lg" className="w-full" disabled={!canSubmit} loading={submitting} onClick={submit}>
              Crear turno confirmado
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
