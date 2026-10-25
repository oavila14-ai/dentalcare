import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CalendarPlus, Clock, Download, Hourglass, PartyPopper, Plus, UserRound } from "lucide-react";
import { appointments, db } from "@/db";
import { CancelAppointmentButton } from "@/components/booking/cancel-button";
import { ServiceIcon } from "@/components/service-icon";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requirePatient } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { fmt, fmtDateLong, fmtTime, relativeDayLabel } from "@/lib/dates";
import { googleCalendarUrl } from "@/lib/ics";

export const metadata: Metadata = { title: "Mis turnos" };

export default async function MyAppointmentsPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const { bienvenida } = await searchParams;
  const user = await requirePatient("/turnos");
  const [clinic, rows] = await Promise.all([
    getClinicSettings(),
    db.query.appointments.findMany({
      where: and(eq(appointments.patientId, user.id)),
      with: { service: true, professional: true },
      orderBy: desc(appointments.startsAt),
    }),
  ]);

  const now = new Date();
  const upcoming = rows
    .filter((a) => (a.status === "pending" || a.status === "confirmed") && a.endsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const history = rows.filter((a) => !upcoming.includes(a));
  const location = clinic.address ? `${clinic.address}, ${clinic.city}` : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
      {bienvenida && (
        <div className="glass flex items-center gap-4 rounded-2xl p-5 shadow-soft">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white"><PartyPopper className="size-5" /></span>
          <div>
            <div className="font-semibold">¡Tu cuenta está confirmada, {user.profile.firstName}!</div>
            <p className="text-sm text-muted-foreground">Ya puedes solicitar tu primer turno.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mis turnos</h1>
          <p className="text-muted-foreground">Hola {user.profile.firstName}, aquí ves tus próximos turnos y tu historial.</p>
        </div>
        <Button asChild><Link href="/turnos/nuevo"><Plus /> Solicitar turno</Link></Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Próximos</h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card/40 p-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary"><CalendarPlus className="size-6" /></span>
            <div>
              <div className="font-semibold">No tienes turnos próximos</div>
              <p className="text-sm text-muted-foreground">Solicita uno en menos de un minuto.</p>
            </div>
            <Button asChild variant="outline"><Link href="/turnos/nuevo">Solicitar turno</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {upcoming.map((a) => {
              const label = `${a.service.name}, ${fmtDateLong(a.startsAt)} a las ${fmtTime(a.startsAt)}`;
              return (
                <article key={a.id} className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
                  <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: a.service.color }} />
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-5 pl-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5">
                    <div className="flex w-16 shrink-0 flex-col items-center self-start rounded-2xl bg-muted/70 py-2.5 text-center sm:w-20 sm:self-center">
                      <span className="text-xs font-medium text-muted-foreground uppercase">{fmt(a.startsAt, "MMM")}</span>
                      <span className="text-2xl leading-none font-semibold tabular-nums sm:text-3xl">{fmt(a.startsAt, "d")}</span>
                      <span className="text-xs text-muted-foreground">{fmt(a.startsAt, "EEE")}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ServiceIcon icon={a.service.icon} color={a.service.color} size="sm" />
                        <h3 className="font-semibold">{a.service.name}</h3>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {relativeDayLabel(a.startsAt)} · {fmtTime(a.startsAt)}–{fmtTime(a.endsAt)} h</span>
                        <span className="inline-flex items-center gap-1.5"><UserRound className="size-4" /> {a.professional.title} {a.professional.name}</span>
                      </div>
                      {a.status === "pending" && (
                        <p className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                          <Hourglass className="size-4" /> Esperando confirmación del consultorio
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-1 border-t border-border/60 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      {a.status === "confirmed" && (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <a href={googleCalendarUrl({ start: a.startsAt, end: a.endsAt, title: `${a.service.name} — ${clinic.name}`, location })} target="_blank" rel="noopener noreferrer">
                              <CalendarPlus /> Google Calendar
                            </a>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <a href={`/turnos/${a.id}/ics`}><Download /> .ics</a>
                          </Button>
                        </>
                      )}
                      <CancelAppointmentButton id={a.id} label={label} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Historial</h2>
          <div className="divide-y divide-border/70 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
            {history.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <ServiceIcon icon={a.service.icon} color={a.service.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{a.service.name}</div>
                  <div className="text-sm text-muted-foreground">{fmtDateLong(a.startsAt)} · {fmtTime(a.startsAt)} h</div>
                  {a.status === "rejected" && a.rejectionReason && (
                    <div className="mt-1 text-sm text-muted-foreground">Motivo: {a.rejectionReason}</div>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
