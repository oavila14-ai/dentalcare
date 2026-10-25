import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, professionals, professionalServices } from "@/db";
import { BookingWizard, type WizardService } from "@/components/booking/booking-wizard";
import { MeshBackground } from "@/components/mesh-background";
import { requirePatient } from "@/lib/auth";
import { getActiveServices, getClinicSettings } from "@/lib/data";
import { addDaysKey, toLocalDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Solicitar turno" };

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const { servicio } = await searchParams;
  await requirePatient(`/turnos/nuevo${servicio ? `?servicio=${servicio}` : ""}`);

  const [settings, services, links] = await Promise.all([
    getClinicSettings(),
    getActiveServices(),
    db
      .select({ serviceId: professionalServices.serviceId, professional: professionals })
      .from(professionalServices)
      .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
      .where(eq(professionals.active, true)),
  ]);

  const wizardServices: WizardService[] = services
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      color: s.color,
      icon: s.icon,
      professionals: links
        .filter((l) => l.serviceId === s.id)
        .map(({ professional: p }) => ({ id: p.id, name: p.name, title: p.title, specialty: p.specialty })),
    }))
    .filter((s) => s.professionals.length > 0);

  const today = toLocalDateKey(new Date(), settings.timezone);

  return (
    <div className="relative isolate px-4 py-10 sm:px-6 sm:py-14">
      <MeshBackground intensity="soft" />
      <BookingWizard
        services={wizardServices}
        initialServiceId={servicio}
        today={today}
        maxDate={addDaysKey(today, settings.maxDaysAhead)}
      />
    </div>
  );
}
