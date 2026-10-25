import type { Metadata } from "next";
import { and, asc, eq, gt } from "drizzle-orm";
import { CalendarOff, Clock, Hospital, Stethoscope, UserRound } from "lucide-react";
import { db, professionals, services, timeOff, workingHours } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { ClinicForm } from "@/components/admin/settings/clinic-form";
import { HoursEditor } from "@/components/admin/settings/hours-editor";
import { ProfessionalForm } from "@/components/admin/settings/professional-form";
import { ServicesManager } from "@/components/admin/settings/services-manager";
import { TimeOffManager } from "@/components/admin/settings/time-off-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { toLocalDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const [settings, serviceList, pros] = await Promise.all([
    getClinicSettings(),
    db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name)),
    db.select().from(professionals).orderBy(asc(professionals.createdAt)),
  ]);
  // Por ahora el consultorio tiene un profesional principal; el esquema ya admite varios.
  const pro = pros[0];
  const [hours, blocks] = pro
    ? await Promise.all([
        db.select().from(workingHours).where(eq(workingHours.professionalId, pro.id)),
        db.select().from(timeOff).where(and(eq(timeOff.professionalId, pro.id), gt(timeOff.endsAt, new Date()))).orderBy(asc(timeOff.startsAt)),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Configuración" />
      <Tabs defaultValue={tab ?? "consultorio"}>
        <TabsList>
          <TabsTrigger value="consultorio"><Hospital /> Consultorio</TabsTrigger>
          <TabsTrigger value="servicios"><Stethoscope /> Servicios</TabsTrigger>
          <TabsTrigger value="horarios"><Clock /> Horarios</TabsTrigger>
          <TabsTrigger value="bloqueos"><CalendarOff /> Bloqueos</TabsTrigger>
          <TabsTrigger value="profesional"><UserRound /> Profesional</TabsTrigger>
        </TabsList>
        <TabsContent value="consultorio"><ClinicForm settings={settings} /></TabsContent>
        <TabsContent value="servicios"><ServicesManager services={serviceList} /></TabsContent>
        <TabsContent value="horarios">{pro && <HoursEditor professionalId={pro.id} initial={hours} />}</TabsContent>
        <TabsContent value="bloqueos">{pro && <TimeOffManager professionalId={pro.id} blocks={blocks} today={toLocalDateKey(new Date(), settings.timezone)} />}</TabsContent>
        <TabsContent value="profesional">{pro && <ProfessionalForm professional={pro} />}</TabsContent>
      </Tabs>
    </div>
  );
}
