import "server-only";
import { eq } from "drizzle-orm";
import { appointments, db } from "@/db";
import { getClinicSettings } from "@/lib/data";
import { fmtDateLong, fmtTime } from "@/lib/dates";
import { buildIcs } from "@/lib/ics";
import { sendAppointmentEmail } from "@/lib/mailer";

export type AppointmentNotice =
  | "requested"
  | "confirmed"
  | "rejected"
  | "cancelled_by_patient"
  | "cancelled_by_clinic"
  | "reminder";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function loadAppointment(id: string) {
  return db.query.appointments.findFirst({
    where: eq(appointments.id, id),
    with: { patient: true, service: true, professional: true },
  });
}

/** Envía los emails correspondientes a un evento del turno. Nunca lanza errores. */
export async function notifyAppointment(id: string, notice: AppointmentNotice) {
  try {
    const [appt, clinic] = await Promise.all([loadAppointment(id), getClinicSettings()]);
    if (!appt) return;

    const name = appt.patient.firstName || "paciente";
    const when = `${fmtDateLong(appt.startsAt)}, ${fmtTime(appt.startsAt)} h`;
    const details = [
      { label: "Servicio", value: appt.service.name },
      { label: "Fecha", value: when },
      { label: "Profesional", value: `${appt.professional.title} ${appt.professional.name}` },
      ...(clinic.address ? [{ label: "Dirección", value: `${clinic.address}, ${clinic.city}` }] : []),
    ];
    const base = { clinicName: clinic.name, details };
    const myAppointments = { label: "Ver mis turnos", url: `${siteUrl()}/turnos` };
    const to = appt.patient.email;

    switch (notice) {
      case "requested": {
        await sendAppointmentEmail({
          to,
          subject: `Recibimos tu solicitud de turno — ${appt.service.name}`,
          props: {
            ...base,
            preview: `Tu solicitud para el ${when} está pendiente de confirmación`,
            heading: "Solicitud recibida",
            intro: `Hola ${name}, recibimos tu solicitud. El horario quedó reservado y el consultorio la confirmará en breve. Te avisaremos por este medio.`,
            cta: myAppointments,
          },
        });
        const adminTo = process.env.ADMIN_NOTIFY_EMAIL || clinic.email;
        if (adminTo) {
          await sendAppointmentEmail({
            to: adminTo,
            subject: `Nueva solicitud: ${appt.patient.firstName} ${appt.patient.lastName} — ${when}`,
            props: {
              clinicName: clinic.name,
              preview: "Hay una solicitud de turno esperando aprobación",
              heading: "Nueva solicitud de turno",
              intro: "Un paciente solicitó un turno. Revísalo y apruébalo desde el panel.",
              details: [
                { label: "Paciente", value: `${appt.patient.firstName} ${appt.patient.lastName}` },
                { label: "Teléfono", value: appt.patient.phone ?? "—" },
                ...details.slice(0, 2),
              ],
              note: appt.patientNotes ? { title: "Nota del paciente", text: appt.patientNotes } : undefined,
              cta: { label: "Revisar pendientes", url: `${siteUrl()}/admin/pendientes` },
              footer: "Notificación interna del sistema de turnos.",
            },
          });
        }
        break;
      }
      case "confirmed":
      case "reminder": {
        const isReminder = notice === "reminder";
        await sendAppointmentEmail({
          to,
          subject: isReminder ? `Recordatorio: tu turno es mañana a las ${fmtTime(appt.startsAt)}` : `¡Turno confirmado! ${when}`,
          props: {
            ...base,
            tone: "success",
            preview: isReminder ? `Te esperamos el ${when}` : `Tu turno del ${when} está confirmado`,
            heading: isReminder ? "Te esperamos mañana" : "¡Tu turno está confirmado!",
            intro: isReminder
              ? `Hola ${name}, te recordamos tu turno. Si no puedes asistir, cancélalo desde la web para liberar el horario.`
              : `Hola ${name}, tu turno fue confirmado. Te adjuntamos el evento para agregarlo a tu calendario.`,
            note: { title: "Recomendaciones", text: "Llega 10 minutos antes y trae tu DNI. Si tienes estudios o radiografías previas, tráelos." },
            cta: myAppointments,
          },
          ics: buildIcs({
            uid: appt.id,
            start: appt.startsAt,
            end: appt.endsAt,
            title: `${appt.service.name} — ${clinic.name}`,
            description: `Turno con ${appt.professional.title} ${appt.professional.name}`,
            location: clinic.address ? `${clinic.address}, ${clinic.city}` : undefined,
          }),
        });
        break;
      }
      case "rejected":
        await sendAppointmentEmail({
          to,
          subject: "No pudimos confirmar tu turno",
          props: {
            ...base,
            tone: "danger",
            preview: "Tu solicitud de turno no pudo ser confirmada",
            heading: "No pudimos confirmar tu turno",
            intro: `Hola ${name}, lamentablemente no podemos atenderte en el horario solicitado. Puedes elegir otro horario cuando quieras.`,
            note: appt.rejectionReason ? { title: "Motivo", text: appt.rejectionReason } : undefined,
            cta: { label: "Elegir otro horario", url: `${siteUrl()}/turnos/nuevo?servicio=${appt.serviceId}` },
          },
        });
        break;
      case "cancelled_by_clinic":
      case "cancelled_by_patient": {
        const byClinic = notice === "cancelled_by_clinic";
        await sendAppointmentEmail({
          to,
          subject: `Turno cancelado — ${when}`,
          props: {
            ...base,
            tone: "neutral",
            preview: "Tu turno fue cancelado",
            heading: "Turno cancelado",
            intro: byClinic
              ? `Hola ${name}, el consultorio tuvo que cancelar tu turno. Disculpa las molestias; puedes solicitar uno nuevo cuando quieras.`
              : `Hola ${name}, cancelamos tu turno como pediste. ¡Esperamos verte pronto!`,
            note: byClinic && appt.rejectionReason ? { title: "Motivo", text: appt.rejectionReason } : undefined,
            cta: { label: "Solicitar nuevo turno", url: `${siteUrl()}/turnos/nuevo` },
          },
        });
        break;
      }
    }
  } catch (e) {
    console.error(`[notifications] ${notice} ${id}:`, e);
  }
}
