import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/render";
import { AppointmentEmail, type AppointmentEmailProps } from "@/emails/appointment-email";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Pacientes cargados por recepción sin email reciben un email ficticio en este dominio. */
export const NO_EMAIL_DOMAIN = "sin-email.invalid";

export async function sendAppointmentEmail(opts: {
  to: string;
  subject: string;
  props: AppointmentEmailProps;
  ics?: string;
}) {
  if (!opts.to || opts.to.endsWith(`@${NO_EMAIL_DOMAIN}`)) return;
  const t = getTransporter();
  if (!t) {
    console.warn(`[mailer] SMTP no configurado; no se envió "${opts.subject}" a ${opts.to}`);
    return;
  }
  const html = await render(<AppointmentEmail {...opts.props} />);
  const text = await render(<AppointmentEmail {...opts.props} />, { plainText: true });
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      attachments: opts.ics
        ? [{ filename: "turno.ics", content: opts.ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }]
        : undefined,
    });
  } catch (e) {
    console.error(`[mailer] Error enviando "${opts.subject}" a ${opts.to}:`, e);
  }
}
