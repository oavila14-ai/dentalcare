import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appointments, db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { buildIcs } from "@/lib/ics";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });

  const appt = await db.query.appointments.findFirst({
    where:
      user.profile.role === "admin"
        ? eq(appointments.id, id)
        : and(eq(appointments.id, id), eq(appointments.patientId, user.id)),
    with: { service: true, professional: true },
  });
  if (!appt || appt.status !== "confirmed") return new NextResponse("No encontrado", { status: 404 });

  const clinic = await getClinicSettings();
  const ics = buildIcs({
    uid: appt.id,
    start: appt.startsAt,
    end: appt.endsAt,
    title: `${appt.service.name} — ${clinic.name}`,
    description: `Turno con ${appt.professional.title} ${appt.professional.name}`,
    location: clinic.address ? `${clinic.address}, ${clinic.city}` : undefined,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="turno-${appt.id.slice(0, 8)}.ics"`,
    },
  });
}
