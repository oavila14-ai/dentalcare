import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarClock, IdCard, Mail, MessageCircle, MessageSquareText, Phone, ShieldPlus, UserRound } from "lucide-react";
import { appointmentEvents, appointments, db } from "@/db";
import { AdminNotes } from "@/components/admin/admin-notes";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { ServiceIcon } from "@/components/service-icon";
import { StatusBadge } from "@/components/status-badge";
import { whatsappLink } from "@/components/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { fmt, fmtDateLong, fmtDateShort, fmtTime } from "@/lib/dates";
import { NO_EMAIL_DOMAIN } from "@/lib/mailer";
import { STATUS_META } from "@/lib/status";
import { formatLempiras } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle del turno" };

function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const a = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
    with: {
      patient: true,
      service: true,
      professional: true,
      events: { orderBy: asc(appointmentEvents.createdAt), with: { actor: true } },
    },
  });
  if (!a) notFound();

  const p = a.patient;
  const hasEmail = !p.email.endsWith(`@${NO_EMAIL_DOMAIN}`);
  const isPast = a.startsAt < new Date();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/admin/turnos"><ArrowLeft /> Turnos</Link></Button>

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${a.service.color}, var(--brand-indigo))` }} />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <ServiceIcon icon={a.service.icon} color={a.service.color} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{a.service.name}</h1>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" /> {fmtDateLong(a.startsAt)} · {fmtTime(a.startsAt)}–{fmtTime(a.endsAt)} h</span>
              <span className="inline-flex items-center gap-1.5"><UserRound className="size-4" /> {a.professional.title} {a.professional.name}</span>
              {formatLempiras(a.service.price) && <span>desde {formatLempiras(a.service.price)}</span>}
            </div>
            {a.rejectionReason && <p className="text-sm text-muted-foreground">Motivo: {a.rejectionReason}</p>}
          </div>
          <AppointmentActions id={a.id} status={a.status} isPast={isPast} size="default" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Paciente</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href={`/admin/pacientes/${p.id}`}>Ver ficha</Link></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-lg font-semibold">{p.firstName} {p.lastName}</div>
              {p.birthDate && <div className="text-sm text-muted-foreground">{age(p.birthDate)} años · nació el {fmtDateShort(`${p.birthDate}T12:00:00Z`)}</div>}
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center gap-3"><IdCard className="size-4 text-muted-foreground" /><dt className="sr-only">DNI</dt><dd className="tabular-nums">{p.dni ?? "—"}</dd></div>
              <div className="flex items-center gap-3"><Phone className="size-4 text-muted-foreground" /><dt className="sr-only">Teléfono</dt><dd className="tabular-nums">{p.phone ? <a href={`tel:${p.phone.replace(/\s|-/g, "")}`} className="hover:underline">{p.phone}</a> : "—"}</dd></div>
              <div className="flex items-center gap-3"><Mail className="size-4 text-muted-foreground" /><dt className="sr-only">Email</dt><dd className="truncate">{hasEmail ? <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a> : "Sin email"}</dd></div>
              {p.insurance && <div className="flex items-center gap-3"><ShieldPlus className="size-4 text-muted-foreground" /><dt className="sr-only">Seguro</dt><dd>{p.insurance}</dd></div>}
            </dl>
            {p.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={whatsappLink(p.phone, `Hola ${p.firstName}, te escribimos del consultorio por tu turno del ${fmtDateLong(a.startsAt)} a las ${fmtTime(a.startsAt)}.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Escribir por WhatsApp
                </a>
              </Button>
            )}
            {a.patientNotes && (
              <div className="rounded-2xl bg-muted/70 p-4 text-sm">
                <div className="mb-1 flex items-center gap-1.5 font-medium"><MessageSquareText className="size-4" /> Nota del paciente</div>
                <p className="text-muted-foreground">{a.patientNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Notas internas</CardTitle></CardHeader>
            <CardContent><AdminNotes id={a.id} initial={a.adminNotes ?? ""} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border pl-5">
                {a.events.map((e) => (
                  <li key={e.id} className="relative text-sm">
                    <span className={`absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card ${STATUS_META[e.toStatus].dot}`} />
                    <div className="font-medium">
                      {e.fromStatus ? `${STATUS_META[e.fromStatus].label} → ${STATUS_META[e.toStatus].label}` : `Creado como ${STATUS_META[e.toStatus].label.toLowerCase()}`}
                    </div>
                    <div className="text-muted-foreground">
                      {fmt(e.createdAt, "d MMM yyyy, HH:mm")}
                      {e.actor ? ` · ${e.actor.role === "admin" ? "Consultorio" : `${e.actor.firstName} ${e.actor.lastName}`}` : ""}
                    </div>
                    {e.note && <div className="mt-0.5 text-muted-foreground italic">{e.note}</div>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
