import "server-only";
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { appointments, profiles, type AppointmentStatus } from "@/db";
import { ALL_STATUSES } from "@/lib/status";
import { addDaysKey, isValidDateKey, localToUtc } from "@/lib/dates";

export type AppointmentFilters = { q?: string; estado?: string; servicio?: string; desde?: string; hasta?: string; page?: string };

/** Construye el WHERE del listado de turnos a partir de los filtros de la URL. */
export function buildAppointmentWhere(f: AppointmentFilters, tz: string) {
  const conds: SQL[] = [];
  if (f.estado && ALL_STATUSES.includes(f.estado as AppointmentStatus)) conds.push(eq(appointments.status, f.estado as AppointmentStatus));
  if (f.servicio && /^[0-9a-f-]{36}$/i.test(f.servicio)) conds.push(eq(appointments.serviceId, f.servicio));
  if (isValidDateKey(f.desde)) conds.push(gte(appointments.startsAt, localToUtc(f.desde, "00:00", tz)));
  if (isValidDateKey(f.hasta)) conds.push(lt(appointments.startsAt, localToUtc(addDaysKey(f.hasta, 1), "00:00", tz)));
  const q = f.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conds.push(
      sql`${appointments.patientId} in (select ${profiles.id} from ${profiles} where ${or(
        ilike(sql`${profiles.firstName} || ' ' || ${profiles.lastName}`, like),
        ilike(profiles.dni, like),
        ilike(profiles.phone, like),
        ilike(profiles.email, like),
      )})`,
    );
  }
  return conds.length ? and(...conds) : undefined;
}

export const appointmentOrder = desc(appointments.startsAt);
