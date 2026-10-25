import { addDaysKey, localToUtc, toLocalDateKey, weekdayOf } from "./dates";

export type Interval = { start: Date; end: Date };
export type WeeklyBlock = { weekday: number; startTime: string; endTime: string };

export type AvailabilityInput = {
  /** Primer y último día (inclusive) a calcular, como "YYYY-MM-DD" locales. */
  fromDate: string;
  toDate: string;
  durationMin: number;
  workingHours: WeeklyBlock[];
  /** Turnos activos y bloqueos del profesional. */
  busy: Interval[];
  now: Date;
  minHoursBeforeBooking: number;
  maxDaysAhead: number;
  stepMin: number;
  tz: string;
};

const MINUTE = 60_000;

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

/**
 * Calcula los horarios libres por día. Devuelve un mapa
 * fecha local → lista de inicios de turno (instantes UTC).
 *
 * Es una función pura: la base de datos sigue siendo la última barrera
 * contra reservas simultáneas (restricción `appointments_no_overlap`).
 */
export function computeAvailability(input: AvailabilityInput): Map<string, Date[]> {
  const { durationMin, workingHours, busy, now, tz } = input;
  const result = new Map<string, Date[]>();
  if (durationMin <= 0 || input.stepMin <= 0) return result;

  const earliest = new Date(now.getTime() + input.minHoursBeforeBooking * 60 * MINUTE);
  const lastDay = addDaysKey(toLocalDateKey(now, tz), input.maxDaysAhead);
  const sortedBusy = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let day = input.fromDate; day <= input.toDate; day = addDaysKey(day, 1)) {
    if (day > lastDay) break;
    const blocks = workingHours
      .filter((b) => b.weekday === weekdayOf(day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const slots: Date[] = [];
    for (const block of blocks) {
      const blockStart = localToUtc(day, block.startTime.slice(0, 5), tz);
      const blockEnd = localToUtc(day, block.endTime.slice(0, 5), tz);

      for (
        let t = blockStart.getTime();
        t + durationMin * MINUTE <= blockEnd.getTime();
        t += input.stepMin * MINUTE
      ) {
        const slot = { start: new Date(t), end: new Date(t + durationMin * MINUTE) };
        if (slot.start < earliest) continue;
        if (sortedBusy.some((b) => overlaps(slot, b))) continue;
        slots.push(slot.start);
      }
    }
    if (slots.length) result.set(day, slots);
  }

  return result;
}

/** ¿Es `start` un horario válido según la disponibilidad calculada? */
export function isSlotAvailable(availability: Map<string, Date[]>, dayKey: string, start: Date) {
  return availability.get(dayKey)?.some((s) => s.getTime() === start.getTime()) ?? false;
}
