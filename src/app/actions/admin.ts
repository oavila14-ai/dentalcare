"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  appointmentEvents,
  appointments,
  clinicSettings,
  db,
  professionals,
  professionalServices,
  profiles,
  services,
  timeOff,
  workingHours,
  type AppointmentStatus,
} from "@/db";
import { assertAdmin } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/availability";
import { getAvailability, getClinicSettings } from "@/lib/data";
import { localToUtc, toLocalDateKey, isValidDateKey, addDaysKey } from "@/lib/dates";
import { isOverlapError } from "@/lib/db-errors";
import { NO_EMAIL_DOMAIN } from "@/lib/mailer";
import { notifyAppointment, type AppointmentNotice } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/server";
import { fieldErrors, profileSchema, serviceSchema, type ActionResult } from "@/lib/validations";

/** Transiciones de estado permitidas desde el panel. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: ["no_show"],
  no_show: ["completed"],
  rejected: [],
  cancelled: [],
};

const NOTICE: Partial<Record<AppointmentStatus, AppointmentNotice>> = {
  confirmed: "confirmed",
  rejected: "rejected",
  cancelled: "cancelled_by_clinic",
};

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/turnos");
}

async function guard<T>(fn: (admin: Awaited<ReturnType<typeof assertAdmin>>) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  let admin;
  try {
    admin = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado" };
  }
  return fn(admin);
}

// ─── Turnos ─────────────────────────────────────────────────────────

export async function changeAppointmentStatusAction(
  id: string,
  to: AppointmentStatus,
  reason?: string,
): Promise<ActionResult> {
  return guard(async (admin) => {
    const appt = await db.query.appointments.findFirst({ where: eq(appointments.id, id) });
    if (!appt) return { ok: false, error: "Turno no encontrado" };
    if (!TRANSITIONS[appt.status].includes(to)) {
      return { ok: false, error: "Ese cambio de estado no está permitido" };
    }
    const note = reason?.trim().slice(0, 300) || null;
    if (to === "rejected" && !note) return { ok: false, error: "Indica el motivo del rechazo" };

    await db.transaction(async (tx) => {
      await tx
        .update(appointments)
        .set({
          status: to,
          ...(to === "confirmed" ? { confirmedAt: new Date() } : {}),
          ...(to === "cancelled" ? { cancelledAt: new Date() } : {}),
          ...(to === "rejected" || to === "cancelled" ? { rejectionReason: note } : {}),
        })
        .where(eq(appointments.id, id));
      await tx.insert(appointmentEvents).values({ appointmentId: id, actorId: admin.id, fromStatus: appt.status, toStatus: to, note });
    });

    const notice = NOTICE[to];
    if (notice) after(() => notifyAppointment(id, notice));
    revalidateAdmin();
    return { ok: true };
  });
}

export async function updateAdminNotesAction(id: string, notes: string): Promise<ActionResult> {
  return guard(async () => {
    await db.update(appointments).set({ adminNotes: notes.trim().slice(0, 2000) || null }).where(eq(appointments.id, id));
    revalidatePath(`/admin/turnos/${id}`);
    return { ok: true };
  });
}

export async function searchPatientsAction(q: string): Promise<ActionResult<{ id: string; name: string; dni: string | null; phone: string | null; email: string }[]>> {
  return guard(async () => {
    const term = q.trim();
    if (term.length < 2) return { ok: true, data: [] };
    const like = `%${term}%`;
    const rows = await db
      .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName, dni: profiles.dni, phone: profiles.phone, email: profiles.email })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "patient"),
          or(
            ilike(sql`${profiles.firstName} || ' ' || ${profiles.lastName}`, like),
            ilike(profiles.dni, like),
            ilike(profiles.phone, like),
            ilike(profiles.email, like),
          ),
        ),
      )
      .orderBy(asc(profiles.lastName))
      .limit(8);
    return {
      ok: true,
      data: rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`.trim(), dni: r.dni, phone: r.phone, email: r.email.endsWith(`@${NO_EMAIL_DOMAIN}`) ? "" : r.email })),
    };
  });
}

/** Horarios libres de un día para cargar un turno manual (ignora la anticipación mínima). */
export async function getAdminDaySlotsAction(serviceId: string, professionalId: string, day: string): Promise<ActionResult<string[]>> {
  return guard(async () => {
    if (!isValidDateKey(day)) return { ok: false, error: "Fecha inválida" };
    const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
    if (!service) return { ok: false, error: "Servicio no encontrado" };
    const availability = await getAvailability({ professionalId, durationMin: service.durationMin, fromDate: day, toDate: day, ignoreLeadTime: true });
    return { ok: true, data: (availability.get(day) ?? []).map((d) => d.toISOString()) };
  });
}

const newPatientSchema = profileSchema
  .pick({ firstName: true, lastName: true, dni: true, phone: true })
  .extend({ email: z.union([z.literal(""), z.email("Email inválido")]).optional().default("") });

const manualSchema = z.object({
  patientId: z.uuid().optional(),
  newPatient: newPatientSchema.optional(),
  serviceId: z.uuid(),
  professionalId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().default(""),
});

export async function createManualAppointmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async (admin) => {
    const parsed = manualSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
    const d = parsed.data;
    if (!d.patientId && !d.newPatient) return { ok: false, error: "Elige o crea un paciente" };

    const service = await db.query.services.findFirst({ where: eq(services.id, d.serviceId) });
    if (!service) return { ok: false, error: "Servicio no encontrado" };
    const startsAt = new Date(d.startsAt);
    const settings = await getClinicSettings();
    const day = toLocalDateKey(startsAt, settings.timezone);
    const availability = await getAvailability({ professionalId: d.professionalId, durationMin: service.durationMin, fromDate: day, toDate: day, ignoreLeadTime: true });
    if (!isSlotAvailable(availability, day, startsAt)) return { ok: false, error: "Ese horario ya no está libre" };

    let patientId = d.patientId;
    if (!patientId && d.newPatient) {
      const np = d.newPatient;
      const dniTaken = await db.query.profiles.findFirst({ where: eq(profiles.dni, np.dni), columns: { id: true } });
      if (dniTaken) return { ok: false, error: "Ya existe un paciente con ese DNI. Búscalo en la lista.", fieldErrors: { "newPatient.dni": "DNI ya registrado" } };

      // Se crea una cuenta real: el paciente podrá ingresar luego con "Olvidé mi contraseña".
      const email = np.email || `paciente-${np.dni.replace(/\D/g, "")}@${NO_EMAIL_DOMAIN}`;
      const { data, error } = await createAdminClient().auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: np.firstName, last_name: np.lastName, dni: np.dni, phone: np.phone },
      });
      if (error) {
        return error.code === "email_exists"
          ? { ok: false, error: "Ya existe una cuenta con ese email. Busca al paciente en la lista.", fieldErrors: { "newPatient.email": "Email ya registrado" } }
          : { ok: false, error: "No se pudo crear el paciente" };
      }
      patientId = data.user.id;
    }

    try {
      const id = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(appointments)
          .values({
            patientId: patientId!,
            professionalId: d.professionalId,
            serviceId: d.serviceId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
            status: "confirmed",
            confirmedAt: new Date(),
            adminNotes: d.notes || null,
            createdBy: admin.id,
          })
          .returning({ id: appointments.id });
        await tx.insert(appointmentEvents).values({ appointmentId: row.id, actorId: admin.id, toStatus: "confirmed", note: "Cargado por el consultorio" });
        return row.id;
      });
      after(() => notifyAppointment(id, "confirmed"));
      revalidateAdmin();
      return { ok: true, data: { id } };
    } catch (e) {
      if (isOverlapError(e)) return { ok: false, error: "Ese horario se acaba de ocupar" };
      throw e;
    }
  });
}

// ─── Configuración ──────────────────────────────────────────────────

const clinicSchema = z.object({
  name: z.string().trim().min(2, "Requerido").max(80),
  tagline: z.string().trim().max(120),
  address: z.string().trim().max(160),
  city: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  email: z.union([z.literal(""), z.email("Email inválido")]),
  mapsUrl: z.union([z.literal(""), z.url("URL inválida")]),
  minHoursBeforeBooking: z.coerce.number().int().min(0).max(168),
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
  cancellationHours: z.coerce.number().int().min(0).max(168),
  slotStepMin: z.coerce.number().int().min(5).max(120),
  maxActivePerPatient: z.coerce.number().int().min(1).max(20),
});

export async function updateClinicSettingsAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = clinicSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
    await db.update(clinicSettings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(clinicSettings.id, 1));
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function saveServiceAction(id: string | null, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
    const values = {
      ...parsed.data,
      description: parsed.data.description || null,
      price: parsed.data.price === null ? null : String(parsed.data.price),
    };
    if (id) {
      await db.update(services).set(values).where(eq(services.id, id));
    } else {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${services.sortOrder}), 0)` }).from(services);
      const [row] = await db.insert(services).values({ ...values, sortOrder: Number(max) + 1 }).returning({ id: services.id });
      // Por defecto, todos los profesionales activos ofrecen el nuevo servicio.
      const pros = await db.select({ id: professionals.id }).from(professionals).where(eq(professionals.active, true));
      if (pros.length) await db.insert(professionalServices).values(pros.map((p) => ({ professionalId: p.id, serviceId: row.id })));
    }
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const blockSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function saveWorkingHoursAction(professionalId: string, blocks: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = z.array(blockSchema).max(42).safeParse(blocks);
    if (!parsed.success) return { ok: false, error: "Horario inválido" };
    const list = parsed.data;
    for (const b of list) {
      if (b.endTime <= b.startTime) return { ok: false, error: "La hora de fin debe ser posterior al inicio" };
    }
    for (let wd = 0; wd < 7; wd++) {
      const day = list.filter((b) => b.weekday === wd).sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < day.length; i++) {
        if (day[i].startTime < day[i - 1].endTime) return { ok: false, error: "Hay bloques superpuestos en el mismo día" };
      }
    }
    await db.transaction(async (tx) => {
      await tx.delete(workingHours).where(eq(workingHours.professionalId, professionalId));
      if (list.length) await tx.insert(workingHours).values(list.map((b) => ({ ...b, professionalId })));
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

const timeOffSchema = z.object({
  professionalId: z.uuid(),
  fromDate: z.string().refine(isValidDateKey, "Fecha inválida"),
  toDate: z.string().refine(isValidDateKey, "Fecha inválida"),
  allDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().trim().max(120).optional().default(""),
});

export async function addTimeOffAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = timeOffSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
    const d = parsed.data;
    const tz = (await getClinicSettings()).timezone;
    const startsAt = d.allDay ? localToUtc(d.fromDate, "00:00", tz) : localToUtc(d.fromDate, d.startTime ?? "00:00", tz);
    const endsAt = d.allDay ? localToUtc(addDaysKey(d.toDate, 1), "00:00", tz) : localToUtc(d.toDate, d.endTime ?? "23:59", tz);
    if (endsAt <= startsAt) return { ok: false, error: "El fin debe ser posterior al inicio" };
    await db.insert(timeOff).values({ professionalId: d.professionalId, startsAt, endsAt, reason: d.reason || null });
    revalidatePath("/admin/configuracion");
    return { ok: true };
  });
}

export async function deleteTimeOffAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    await db.delete(timeOff).where(eq(timeOff.id, id));
    revalidatePath("/admin/configuracion");
    return { ok: true };
  });
}

const professionalSchema = z.object({
  name: z.string().trim().min(2, "Requerido").max(80),
  title: z.string().trim().max(10),
  specialty: z.string().trim().min(2, "Requerido").max(80),
  bio: z.string().trim().max(400).optional().default(""),
  photoUrl: z.union([z.literal(""), z.url("URL inválida")]).optional().default(""),
});

export async function updateProfessionalAction(id: string, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = professionalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
    await db
      .update(professionals)
      .set({ ...parsed.data, bio: parsed.data.bio || null, photoUrl: parsed.data.photoUrl || null })
      .where(eq(professionals.id, id));
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
