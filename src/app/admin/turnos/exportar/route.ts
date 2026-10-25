import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { appointmentOrder, buildAppointmentWhere } from "@/lib/admin-queries";
import { getClinicSettings } from "@/lib/data";
import { fmt } from "@/lib/dates";
import { STATUS_META } from "@/lib/status";

function csvCell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  // Evita inyección de fórmulas al abrir el archivo en Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") return new NextResponse("No autorizado", { status: 401 });

  const f = Object.fromEntries(req.nextUrl.searchParams);
  const tz = (await getClinicSettings()).timezone;
  const rows = await db.query.appointments.findMany({
    where: buildAppointmentWhere(f, tz),
    with: { patient: true, service: true, professional: true },
    orderBy: appointmentOrder,
    limit: 10_000,
  });

  const header = ["Fecha", "Hora", "Paciente", "DNI", "Teléfono", "Email", "Servicio", "Profesional", "Estado", "Nota del paciente", "Notas internas"];
  const lines = rows.map((a) =>
    [
      fmt(a.startsAt, "dd/MM/yyyy"),
      fmt(a.startsAt, "HH:mm"),
      `${a.patient.firstName} ${a.patient.lastName}`,
      a.patient.dni,
      a.patient.phone,
      a.patient.email.endsWith(".invalid") ? "" : a.patient.email,
      a.service.name,
      `${a.professional.title} ${a.professional.name}`,
      STATUS_META[a.status].label,
      a.patientNotes,
      a.adminNotes,
    ].map(csvCell).join(","),
  );
  // BOM para que Excel reconozca UTF-8 (tildes y ñ).
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="turnos-${fmt(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
