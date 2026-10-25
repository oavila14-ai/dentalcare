import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, professionals, professionalServices } from "@/db";
import { ManualAppointmentForm } from "@/components/admin/manual-appointment-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";
import { getActiveServices, getClinicSettings } from "@/lib/data";
import { toLocalDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Nuevo turno" };

export default async function NewManualAppointmentPage() {
  await requireAdmin();
  const [settings, services, links] = await Promise.all([
    getClinicSettings(),
    getActiveServices(),
    db
      .select({ serviceId: professionalServices.serviceId, p: professionals })
      .from(professionalServices)
      .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
      .where(eq(professionals.active, true)),
  ]);
  const options = services
    .map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      professionals: links.filter((l) => l.serviceId === s.id).map(({ p }) => ({ id: p.id, label: `${p.title} ${p.name}` })),
    }))
    .filter((s) => s.professionals.length);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Nuevo turno" description="Para pacientes que llaman o vienen al consultorio. El turno queda confirmado y, si tiene email, le avisamos." />
      <ManualAppointmentForm services={options} today={toLocalDateKey(new Date(), settings.timezone)} />
    </div>
  );
}
