import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

/** Zona horaria del consultorio. Honduras: UTC-6 todo el año. */
export const CLINIC_TZ = "America/Tegucigalpa";

/** Formatea un instante en la hora local del consultorio. */
export function fmt(date: Date | string, pattern: string, tz = CLINIC_TZ) {
  return formatInTimeZone(new Date(date), tz, pattern, { locale: es });
}

export const fmtTime = (d: Date | string) => fmt(d, "HH:mm");
export const fmtDate = (d: Date | string) => fmt(d, "d 'de' MMMM yyyy");
export const fmtDateLong = (d: Date | string) => capitalize(fmt(d, "EEEE d 'de' MMMM"));
export const fmtDateShort = (d: Date | string) => fmt(d, "dd/MM/yyyy");
export const fmtDateTime = (d: Date | string) => `${fmtDateLong(d)}, ${fmtTime(d)} h`;

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Fecha calendario local ("YYYY-MM-DD") de un instante. */
export function toLocalDateKey(date: Date | string, tz = CLINIC_TZ) {
  return formatInTimeZone(new Date(date), tz, "yyyy-MM-dd");
}

/** Instante UTC correspondiente a una fecha y hora locales del consultorio. */
export function localToUtc(dateKey: string, time = "00:00", tz = CLINIC_TZ) {
  return fromZonedTime(`${dateKey}T${time.length === 5 ? `${time}:00` : time}`, tz);
}

/** Día de la semana (0 = domingo) de una fecha calendario "YYYY-MM-DD". */
export function weekdayOf(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

/** Suma días a una fecha calendario "YYYY-MM-DD". */
export function addDaysKey(dateKey: string, days: number) {
  return addDays(new Date(`${dateKey}T12:00:00Z`), days).toISOString().slice(0, 10);
}

/** Lunes de la semana de una fecha calendario. */
export function startOfWeekKey(dateKey: string) {
  const wd = weekdayOf(dateKey);
  return addDaysKey(dateKey, wd === 0 ? -6 : 1 - wd);
}

/** Rango UTC [inicio, fin) de un día local completo. */
export function dayRangeUtc(dateKey: string, tz = CLINIC_TZ) {
  return { start: localToUtc(dateKey, "00:00", tz), end: localToUtc(addDaysKey(dateKey, 1), "00:00", tz) };
}

export function isValidDateKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function relativeDayLabel(date: Date | string, now = new Date()) {
  const key = toLocalDateKey(date);
  const today = toLocalDateKey(now);
  if (key === today) return "Hoy";
  if (key === addDaysKey(today, 1)) return "Mañana";
  if (key === addDaysKey(today, -1)) return "Ayer";
  return fmtDateLong(date);
}
