import "server-only";
import { cache } from "react";
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import {
  appointments,
  clinicSettings,
  db,
  professionalServices,
  professionals,
  services,
  timeOff,
  workingHours,
} from "@/db";
import { computeAvailability, type Interval } from "@/lib/availability";
import { localToUtc, addDaysKey } from "@/lib/dates";

export const ACTIVE_STATUSES = ["pending", "confirmed"] as const;

export const getClinicSettings = cache(async () => {
  const row = await db.query.clinicSettings.findFirst({ where: eq(clinicSettings.id, 1) });
  if (!row) throw new Error("Falta la configuración del consultorio (clinic_settings)");
  return row;
});

export const getActiveServices = cache(async () =>
  db.query.services.findMany({
    where: eq(services.active, true),
    orderBy: [asc(services.sortOrder), asc(services.name)],
  }),
);

export const getActiveProfessionals = cache(async () =>
  db.query.professionals.findMany({
    where: eq(professionals.active, true),
    orderBy: asc(professionals.name),
  }),
);

/** Profesionales activos que realizan un servicio. */
export async function getProfessionalsForService(serviceId: string) {
  const rows = await db
    .select({ professional: professionals })
    .from(professionalServices)
    .innerJoin(professionals, eq(professionals.id, professionalServices.professionalId))
    .where(and(eq(professionalServices.serviceId, serviceId), eq(professionals.active, true)))
    .orderBy(asc(professionals.name));
  return rows.map((r) => r.professional);
}

/** Turnos activos + bloqueos de un profesional que tocan el rango [from, to). */
export async function getBusyIntervals(
  professionalId: string,
  from: Date,
  to: Date,
  excludeAppointmentId?: string,
): Promise<Interval[]> {
  const [appts, blocks] = await Promise.all([
    db
      .select({ id: appointments.id, start: appointments.startsAt, end: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          inArray(appointments.status, [...ACTIVE_STATUSES]),
          lt(appointments.startsAt, to),
          gt(appointments.endsAt, from),
        ),
      ),
    db
      .select({ start: timeOff.startsAt, end: timeOff.endsAt })
      .from(timeOff)
      .where(
        and(eq(timeOff.professionalId, professionalId), lt(timeOff.startsAt, to), gt(timeOff.endsAt, from)),
      ),
  ]);
  return [
    ...appts.filter((a) => a.id !== excludeAppointmentId).map(({ start, end }) => ({ start, end })),
    ...blocks,
  ];
}

/** Disponibilidad de un profesional para un servicio entre dos fechas locales (inclusive). */
export async function getAvailability(opts: {
  professionalId: string;
  durationMin: number;
  fromDate: string;
  toDate: string;
  /** Para turnos creados por el admin: ignora anticipación mínima. */
  ignoreLeadTime?: boolean;
}) {
  const settings = await getClinicSettings();
  const tz = settings.timezone;
  const [hours, busy] = await Promise.all([
    db.query.workingHours.findMany({ where: eq(workingHours.professionalId, opts.professionalId) }),
    getBusyIntervals(
      opts.professionalId,
      localToUtc(opts.fromDate, "00:00", tz),
      localToUtc(addDaysKey(opts.toDate, 1), "00:00", tz),
    ),
  ]);

  return computeAvailability({
    fromDate: opts.fromDate,
    toDate: opts.toDate,
    durationMin: opts.durationMin,
    workingHours: hours,
    busy,
    now: new Date(),
    minHoursBeforeBooking: opts.ignoreLeadTime ? 0 : settings.minHoursBeforeBooking,
    maxDaysAhead: opts.ignoreLeadTime ? 365 : settings.maxDaysAhead,
    stepMin: settings.slotStepMin,
    tz,
  });
}
