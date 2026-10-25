import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { PartyPopper } from "lucide-react";
import { appointments, db } from "@/db";
import { AppointmentCard } from "@/components/admin/appointment-card";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";
import { relativeDayLabel, toLocalDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Pendientes" };

export default async function PendingPage() {
  await requireAdmin();
  const rows = await db.query.appointments.findMany({
    where: eq(appointments.status, "pending"),
    with: { patient: true, service: true, professional: true },
    orderBy: asc(appointments.startsAt),
  });

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = toLocalDateKey(r.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Solicitudes pendientes"
        description={rows.length ? `${rows.length} ${rows.length === 1 ? "solicitud espera" : "solicitudes esperan"} tu aprobación. Al confirmar o rechazar avisamos al paciente por email.` : undefined}
      />
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card/50 p-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow"><PartyPopper className="size-6" /></span>
          <div>
            <div className="text-lg font-semibold">¡Todo al día!</div>
            <p className="text-muted-foreground">No hay solicitudes esperando aprobación.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {[...groups].map(([day, items]) => (
            <section key={day} className="space-y-3">
              <h2 className="sticky top-16 z-10 -mx-1 bg-muted/80 px-1 py-2 text-sm font-semibold backdrop-blur">
                {relativeDayLabel(items[0].startsAt)} <span className="font-normal text-muted-foreground">· {items.length}</span>
              </h2>
              {items.map((a) => <AppointmentCard key={a.id} a={a} />)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
