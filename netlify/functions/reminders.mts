import type { Config } from "@netlify/functions";

/**
 * Función programada (gratis en Netlify): todos los días a las 8:00 de Honduras (14:00 UTC)
 * llama al endpoint de recordatorios de la app.
 */
export default async function reminders() {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`${base}/api/cron/reminders`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("reminders", res.status, await res.text());
}

export const config: Config = { schedule: "0 14 * * *" };
