import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, IdCard, Mail, MessageCircle, Phone, Plus, ShieldPlus } from "lucide-react";
import { appointments, db, profiles } from "@/db";
import { StatTile } from "@/components/admin/stat-tile";
import { ServiceIcon } from "@/components/service-icon";
import { StatusBadge } from "@/components/status-badge";
import { whatsappLink } from "@/components/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { fmtDateLong, fmtDateShort, fmtTime } from "@/lib/dates";
import { NO_EMAIL_DOMAIN } from "@/lib/mailer";
import { CalendarCheck, CalendarX2, UserCheck } from "lucide-react";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Ficha del paciente" };

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await db.query.profiles.findFirst({ where: and(eq(profiles.id, id), eq(profiles.role, "patient")) });
  if (!p) notFound();
  const history = await db.query.appointments.findMany({
    where: eq(appointments.patientId, id),
    with: { service: true },
    orderBy: desc(appointments.startsAt),
  });
  const completed = history.filter((a) => a.status === "completed").length;
  const missed = history.filter((a) => a.status === "no_show").length;
  const hasEmail = !p.email.endsWith(`@${NO_EMAIL_DOMAIN}`);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/admin/pacientes"><ArrowLeft /> Pacientes</Link></Button>
      <div className="flex flex-col gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-2xl font-semibold text-white shadow-glow">{initials(p.firstName, p.lastName)}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{p.firstName} {p.lastName}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><IdCard className="size-4" /> {p.dni ?? "Sin DNI"}</span>
            {p.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-4" /> {p.phone}</span>}
            <span className="inline-flex items-center gap-1.5"><Mail className="size-4" /> {hasEmail ? p.email : "Sin email"}</span>
            {p.insurance && <span className="inline-flex items-center gap-1.5"><ShieldPlus className="size-4" /> {p.insurance}</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {p.birthDate && <>Nació el {fmtDateShort(`${p.birthDate}T12:00:00Z`)} · </>}Paciente desde {fmtDateShort(p.createdAt)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.phone && <Button asChild variant="outline"><a href={whatsappLink(p.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>}
          <Button asChild><Link href="/admin/turnos/nuevo"><Plus /> Turno</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Turnos" value={history.length} icon={CalendarCheck} />
        <StatTile label="Atendido" value={completed} icon={UserCheck} />
        <StatTile label="No asistió" value={missed} icon={CalendarX2} />
      </div>

      <Card>
        <CardHeader><CardTitle>Historial de turnos</CardTitle></CardHeader>
        <CardContent className="p-0 pt-4">
          {history.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Sin turnos registrados.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {history.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/turnos/${a.id}`} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-muted/50">
                    <ServiceIcon icon={a.service.icon} color={a.service.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{a.service.name}</div>
                      <div className="text-sm text-muted-foreground">{fmtDateLong(a.startsAt)} · {fmtTime(a.startsAt)} h</div>
                      {a.adminNotes && <div className="mt-1 line-clamp-1 text-sm text-muted-foreground italic">{a.adminNotes}</div>}
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
