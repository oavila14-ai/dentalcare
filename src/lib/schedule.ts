export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
/** Orden de la semana empezando el lunes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Agrupa el horario semanal: [{ day: "Lunes", ranges: "08:00–12:00 · 14:00–18:00" }]. */
export function summarizeSchedule(blocks: { weekday: number; startTime: string; endTime: string }[]) {
  return WEEK_ORDER.map((wd) => {
    const ranges = blocks
      .filter((b) => b.weekday === wd)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((b) => `${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`);
    return { weekday: wd, day: WEEKDAYS[wd], ranges: ranges.length ? ranges.join(" · ") : null };
  });
}
