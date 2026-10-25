"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, Check, Clock, Hourglass, Stethoscope, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getMonthAvailabilityAction, requestAppointmentAction } from "@/app/actions/appointments";
import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateLong, fmtTime } from "@/lib/dates";
import { cn, formatLempiras } from "@/lib/utils";
import { MonthCalendar, shiftMonth } from "./month-calendar";
import { SlotPicker } from "./slot-picker";

export type WizardService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: string | null;
  color: string;
  icon: string;
  professionals: { id: string; name: string; title: string; specialty: string }[];
};

const STEPS = [
  { label: "Servicio", icon: Stethoscope },
  { label: "Fecha y hora", icon: CalendarDays },
  { label: "Confirmar", icon: Check },
];

export function BookingWizard({
  services,
  initialServiceId,
  today,
  maxDate,
}: {
  services: WizardService[];
  initialServiceId?: string;
  today: string;
  maxDate: string;
}) {
  const initial = services.find((s) => s.id === initialServiceId);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [direction, setDirection] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(initial?.id ?? null);
  const [professionalId, setProfessionalId] = useState<string | null>(initial?.professionals[0]?.id ?? null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [cache, setCache] = useState<Record<string, Record<string, string[]>>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const slotsRef = useRef<HTMLDivElement>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const professional = service?.professionals.find((p) => p.id === professionalId) ?? null;
  const cacheKey = serviceId && professionalId ? `${serviceId}:${professionalId}:${month}` : null;
  const monthData = cacheKey ? cache[cacheKey] : undefined;

  const loadMonth = useCallback(
    async (key: string, force = false) => {
      const [sId, pId, m] = key.split(":");
      if (!force && cache[key]) return;
      setLoadingKey(key);
      const res = await getMonthAvailabilityAction(sId, pId, m);
      setLoadingKey((k) => (k === key ? null : k));
      if (res.ok) setCache((c) => ({ ...c, [key]: res.data ?? {} }));
      else toast.error(res.error);
    },
    [cache],
  );

  useEffect(() => {
    if (step === 1 && cacheKey) void loadMonth(cacheKey);
  }, [step, cacheKey, loadMonth]);

  // Al cargar un mes, preselecciona el primer día con turnos libres.
  useEffect(() => {
    if (step !== 1 || !monthData) return;
    if (day && day.startsWith(month) && monthData[day]?.length) return;
    const firstDay = Object.keys(monthData).sort()[0] ?? null;
    setDay(firstDay);
    setSlot(null);
  }, [monthData, month, step, day]);

  const daySlots = useMemo(() => (day && monthData?.[day]) || [], [day, monthData]);
  const monthHasSlots = monthData && Object.keys(monthData).length > 0;

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseService(s: WizardService) {
    setServiceId(s.id);
    setProfessionalId(s.professionals[0]?.id ?? null);
    setDay(null);
    setSlot(null);
    if (s.professionals.length === 1) go(1);
  }

  function chooseSlot(iso: string) {
    setSlot(iso);
  }

  function submit() {
    if (!service || !professional || !slot) return;
    startSubmit(async () => {
      const res = await requestAppointmentAction({
        serviceId: service.id,
        professionalId: professional.id,
        startsAt: slot,
        notes,
      });
      if (res.ok) {
        setDone(true);
        void confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 }, colors: ["#0ea5a4", "#22d3ee", "#6366f1", "#ffffff"] });
        return;
      }
      toast.error(res.error);
      // El horario pudo haberse ocupado: refresca la disponibilidad y vuelve al paso 2.
      if (cacheKey) {
        setSlot(null);
        await loadMonth(cacheKey, true);
        go(1);
      }
    });
  }

  if (done && service && slot) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg">
        <div className="glass relative overflow-hidden rounded-[2rem] p-8 text-center shadow-soft sm:p-10">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-brand-gradient" />
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow"
          >
            <Check className="size-8" strokeWidth={3} />
          </motion.span>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">¡Solicitud enviada!</h2>
          <p className="mt-2 text-muted-foreground">
            Reservamos tu horario. El consultorio confirmará tu turno en breve y te avisaremos por email.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border bg-card/70 p-5 text-left">
            <div className="flex items-center gap-3">
              <ServiceIcon icon={service.icon} color={service.color} size="sm" />
              <span className="font-medium">{service.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CalendarCheck className="size-4" /> {fmtDateLong(slot)} · {fmtTime(slot)} h
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Hourglass className="size-4 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-300">Pendiente de confirmación</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1"><Link href="/turnos">Ver mis turnos</Link></Button>
            <Button asChild variant="outline" className="flex-1"><Link href="/">Volver al inicio</Link></Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progreso */}
      <ol className="mb-8 grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.label} className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-brand-gradient"
                initial={false}
                animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className={cn("flex items-center gap-1.5 text-xs font-medium sm:text-sm", i <= step ? "text-foreground" : "text-muted-foreground")}>
              <s.icon className="hidden size-4 sm:block" /> {s.label}
            </div>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -32 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <section className="space-y-6">
              <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">¿Para qué servicio es tu turno?</h1>
                <p className="text-muted-foreground">Así reservamos el tiempo justo para atenderte.</p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => {
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => chooseService(s)}
                      aria-pressed={active}
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition-all duration-200 outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active ? "border-transparent ring-2 ring-primary" : "border-border/70 hover:border-primary/40",
                      )}
                    >
                      <ServiceIcon icon={s.icon} color={s.color} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="font-semibold">{s.name}</div>
                        {s.description && <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {s.durationMin} min</span>
                          {formatLempiras(s.price) && <span className="font-medium text-foreground">desde {formatLempiras(s.price)}</span>}
                        </div>
                      </div>
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border transition-all", active ? "border-transparent bg-brand-gradient text-white" : "border-border")}>
                        {active && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {service && service.professionals.length > 1 && (
                <div className="space-y-3 rounded-2xl border bg-card/60 p-5">
                  <div className="font-medium">¿Con quién quieres atenderte?</div>
                  <div className="flex flex-wrap gap-2">
                    {service.professionals.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfessionalId(p.id)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all",
                          p.id === professionalId ? "border-transparent bg-foreground text-background" : "hover:bg-accent",
                        )}
                      >
                        <UserRound className="size-4" /> {p.title} {p.name}
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => go(1)} disabled={!professionalId}>Continuar <ArrowRight /></Button>
                </div>
              )}
              {services.length === 0 && (
                <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                  No hay servicios disponibles en este momento.
                </p>
              )}
            </section>
          )}

          {step === 1 && service && (
            <section className="space-y-6">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Elige día y hora</h1>
                  <p className="text-muted-foreground">
                    {service.name} · {service.durationMin} min{professional ? ` · ${professional.title} ${professional.name}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => go(0)}><ArrowLeft /> Cambiar servicio</Button>
              </header>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="rounded-3xl border bg-card p-5 shadow-soft">
                  <MonthCalendar
                    month={month}
                    onMonthChange={(m) => { setMonth(m); setDay(null); setSlot(null); }}
                    minMonth={today.slice(0, 7)}
                    maxMonth={maxDate.slice(0, 7)}
                    today={today}
                    selected={day}
                    onSelect={(d) => { setDay(d); setSlot(null); slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
                    available={monthData}
                    loading={loadingKey === cacheKey}
                  />
                </div>
                <div ref={slotsRef} className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-soft">
                  {loadingKey === cacheKey && !monthData ? (
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-11" />)}
                      </div>
                    </div>
                  ) : day && daySlots.length ? (
                    <div className="space-y-4">
                      <div className="font-semibold">{fmtDateLong(daySlots[0])}</div>
                      <SlotPicker slots={daySlots} selected={slot} onSelect={chooseSlot} />
                    </div>
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                      <CalendarDays className="size-8 opacity-50" />
                      {monthHasSlots === false ? (
                        <>
                          <p>No quedan horarios libres este mes.</p>
                          {month < maxDate.slice(0, 7) && (
                            <Button variant="outline" size="sm" onClick={() => { setMonth(shiftMonth(month, 1)); setDay(null); }}>
                              Ver el mes siguiente <ArrowRight />
                            </Button>
                          )}
                        </>
                      ) : (
                        <p>Elige un día en el calendario.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="sticky bottom-4 z-10 flex justify-end">
                <Button size="lg" disabled={!slot} onClick={() => go(2)} className="w-full sm:w-auto">
                  {slot ? <>Continuar · {fmtTime(slot)} h <ArrowRight /></> : "Elige un horario"}
                </Button>
              </div>
            </section>
          )}

          {step === 2 && service && slot && (
            <section className="mx-auto max-w-xl space-y-6">
              <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Revisa y confirma</h1>
                <p className="text-muted-foreground">Tu solicitud quedará pendiente hasta que el consultorio la confirme.</p>
              </header>
              <div className="glass overflow-hidden rounded-3xl shadow-soft">
                <div className="h-1.5 bg-brand-gradient" />
                <div className="space-y-4 p-6">
                  <div className="flex items-center gap-4">
                    <ServiceIcon icon={service.icon} color={service.color} size="lg" />
                    <div>
                      <div className="text-lg font-semibold">{service.name}</div>
                      <div className="text-sm text-muted-foreground">{service.durationMin} minutos{formatLempiras(service.price) ? ` · desde ${formatLempiras(service.price)}` : ""}</div>
                    </div>
                  </div>
                  <dl className="grid gap-3 rounded-2xl bg-card/70 p-4 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Fecha</dt><dd className="text-right font-medium">{fmtDateLong(slot)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Hora</dt><dd className="font-medium tabular-nums">{fmtTime(slot)} h</dd></div>
                    {professional && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Profesional</dt><dd className="text-right font-medium">{professional.title} {professional.name}</dd></div>}
                  </dl>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Motivo o comentario <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  placeholder="Ej. Me duele una muela del lado derecho desde hace 3 días."
                />
                <div className="text-right text-xs text-muted-foreground">{notes.length}/500</div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => go(1)} disabled={submitting}><ArrowLeft /> Cambiar horario</Button>
                <Button size="lg" onClick={submit} loading={submitting}>Solicitar turno</Button>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
