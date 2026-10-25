import Link from "next/link";
import { Clock, MessageSquareText, Phone } from "lucide-react";
import type { Appointment, Profile, Professional, Service } from "@/db/schema";
import { ServiceIcon } from "@/components/service-icon";
import { StatusBadge } from "@/components/status-badge";
import { fmtTime, relativeDayLabel, fmt } from "@/lib/dates";
import { initials } from "@/lib/utils";
import { AppointmentActions } from "./appointment-actions";

export type AppointmentWithRelations = Appointment & { patient: Profile; service: Service; professional: Professional };

export function AppointmentCard({ a, showActions = true }: { a: AppointmentWithRelations; showActions?: boolean }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-shadow hover:shadow-lg">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: a.service.color }} />
      <div className="flex flex-col gap-4 p-4 pl-5 sm:p-5 sm:pl-6 md:flex-row md:items-center">
        <Link href={`/admin/turnos/${a.id}`} className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {initials(a.patient.firstName, a.patient.lastName)}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{a.patient.firstName} {a.patient.lastName}</span>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ServiceIcon icon={a.service.icon} color={a.service.color} size="sm" className="size-6 rounded-lg [&_svg]:size-3.5" />
                {a.service.name}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="size-4" /> {relativeDayLabel(a.startsAt)} · {fmtTime(a.startsAt)}–{fmtTime(a.endsAt)}
              </span>
              {a.patient.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-4" /> {a.patient.phone}</span>}
            </div>
            {a.patientNotes && (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MessageSquareText className="mt-0.5 size-4 shrink-0" /> <span className="line-clamp-2">“{a.patientNotes}”</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/80">Solicitado {fmt(a.createdAt, "d MMM, HH:mm")}</p>
          </div>
        </Link>
        {showActions && <AppointmentActions id={a.id} status={a.status} isPast={a.startsAt < new Date()} className="md:justify-end" />}
      </div>
    </article>
  );
}
