import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { appointments, db } from "@/db";
import { getClinicSettings } from "@/lib/data";
import { addDaysKey, dayRangeUtc, toLocalDateKey } from "@/lib/dates";
import { notifyAppointment } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/**
 * Envía recordatorios de los turnos confirmados de mañana.
 * Lo llama una vez por día la función programada de Netlify (netlify/functions/reminders.mts).
 * Además mantiene activo el proyecto gratuito de Supabase (se pausa tras 7 días sin uso).
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tz = (await getClinicSettings()).timezone;
  const tomorrow = addDaysKey(toLocalDateKey(new Date(), tz), 1);
  const { start, end } = dayRangeUtc(tomorrow, tz);

  const due = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.status, "confirmed"), gte(appointments.startsAt, start), lt(appointments.startsAt, end), isNull(appointments.reminderSentAt)));

  let sent = 0;
  for (const { id } of due) {
    // Marca antes de enviar para no duplicar si el job se ejecuta dos veces.
    const [claimed] = await db
      .update(appointments)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(appointments.id, id), isNull(appointments.reminderSentAt)))
      .returning({ id: appointments.id });
    if (!claimed) continue;
    await notifyAppointment(id, "reminder");
    sent++;
  }

  return NextResponse.json({ date: tomorrow, due: due.length, sent });
}
