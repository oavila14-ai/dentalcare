"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, count, eq, gt, inArray } from "drizzle-orm";
import { appointmentEvents, appointments, db, professionalServices, services } from "@/db";
import { getSessionUser, isProfileComplete } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/availability";
import { ACTIVE_STATUSES, getAvailability, getClinicSettings } from "@/lib/data";
import { addDaysKey, toLocalDateKey } from "@/lib/dates";
import { isOverlapError } from "@/lib/db-errors";
import { notifyAppointment } from "@/lib/notifications";
import { fieldErrors, requestAppointmentSchema, type ActionResult } from "@/lib/validations";

/** Horarios libres de un mes para el wizard: { "2026-11-03": ["2026-11-03T14:00:00.000Z", ...] }. */
export async function getMonthAvailabilityAction(
  serviceId: string,
  professionalId: string,
  month: string,
): Promise<ActionResult<Record<string, string[]>>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Mes inválido" };

  const link = await db
    .select({ duration: services.durationMin })
    .from(professionalServices)
    .innerJoin(services, eq(services.id, professionalServices.serviceId))
    .where(
      and(
        eq(professionalServices.serviceId, serviceId),
        eq(professionalServices.professionalId, professionalId),
        eq(services.active, true),
      ),
    )
    .limit(1);
  if (!link[0]) return { ok: false, error: "Servicio no disponible" };

  const settings = await getClinicSettings();
  const today = toLocalDateKey(new Date(), settings.timezone);
  const first = `${month}-01`;
  const last = addDaysKey(addDaysKey(first, 31).slice(0, 7) + "-01", -1);
  if (last < today) return { ok: true, data: {} };

  const availability = await getAvailability({
    professionalId,
    durationMin: link[0].duration,
    fromDate: first < today ? today : first,
    toDate: last,
  });

  const data: Record<string, string[]> = {};
  for (const [day, slots] of availability) data[day] = slots.map((s) => s.toISOString());
  return { ok: true, data };
}

export async function requestAppointmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Ingresa de nuevo." };
  if (user.profile.role !== "patient") return { ok: false, error: "Los administradores cargan turnos desde el panel." };
  if (!isProfileComplete(user.profile)) return { ok: false, error: "Completa tu perfil antes de solicitar un turno." };

  const parsed = requestAppointmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos", fieldErrors: fieldErrors(parsed.error) };
  const { serviceId, professionalId, notes } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);

  const settings = await getClinicSettings();

  const [{ active }] = await db
    .select({ active: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, user.id),
        inArray(appointments.status, [...ACTIVE_STATUSES]),
        gt(appointments.startsAt, new Date()),
      ),
    );
  if (active >= settings.maxActivePerPatient) {
    return {
      ok: false,
      error: `Ya tienes ${active} turnos activos. Cancela alguno o espera a ser atendido para solicitar otro.`,
    };
  }

  const [service] = await db
    .select({ duration: services.durationMin })
    .from(services)
    .innerJoin(professionalServices, eq(professionalServices.serviceId, services.id))
    .where(
      and(
        eq(services.id, serviceId),
        eq(services.active, true),
        eq(professionalServices.professionalId, professionalId),
      ),
    )
    .limit(1);
  if (!service) return { ok: false, error: "El servicio ya no está disponible." };

  const day = toLocalDateKey(startsAt, settings.timezone);
  const availability = await getAvailability({ professionalId, durationMin: service.duration, fromDate: day, toDate: day });
  if (!isSlotAvailable(availability, day, startsAt)) {
    return { ok: false, error: "Ese horario ya no está disponible. Elige otro, por favor." };
  }

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(appointments)
        .values({
          patientId: user.id,
          professionalId,
          serviceId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + service.duration * 60_000),
          status: "pending",
          patientNotes: notes || null,
          createdBy: user.id,
        })
        .returning({ id: appointments.id });
      await tx.insert(appointmentEvents).values({ appointmentId: row.id, actorId: user.id, toStatus: "pending" });
      return row.id;
    });
  } catch (e) {
    if (isOverlapError(e)) {
      return { ok: false, error: "Alguien acaba de reservar ese horario. Elige otro, por favor." };
    }
    throw e;
  }

  after(() => notifyAppointment(id, "requested"));
  revalidatePath("/turnos");
  revalidatePath("/admin", "layout");
  return { ok: true, data: { id } };
}

export async function cancelMyAppointmentAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró" };

  const appt = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, id), eq(appointments.patientId, user.id)),
  });
  if (!appt) return { ok: false, error: "Turno no encontrado" };
  if (!ACTIVE_STATUSES.includes(appt.status as (typeof ACTIVE_STATUSES)[number])) {
    return { ok: false, error: "Este turno ya no se puede cancelar" };
  }

  const settings = await getClinicSettings();
  const hoursLeft = (appt.startsAt.getTime() - Date.now()) / 3_600_000;
  if (appt.status === "confirmed" && hoursLeft < settings.cancellationHours) {
    return {
      ok: false,
      error: `Solo puedes cancelar hasta ${settings.cancellationHours} h antes. Comunícate con el consultorio.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(appointments)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(appointments.id, id));
    await tx.insert(appointmentEvents).values({
      appointmentId: id,
      actorId: user.id,
      fromStatus: appt.status,
      toStatus: "cancelled",
      note: "Cancelado por el paciente",
    });
  });

  after(() => notifyAppointment(id, "cancelled_by_patient"));
  revalidatePath("/turnos");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
