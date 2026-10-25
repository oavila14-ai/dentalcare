import { describe, expect, it } from "vitest";
import { computeAvailability, type AvailabilityInput } from "@/lib/availability";
import { fmtTime, localToUtc } from "@/lib/dates";

const TZ = "America/Tegucigalpa";
// Lunes 2 de noviembre de 2026, 07:00 hora de Honduras.
const NOW = localToUtc("2026-11-02", "07:00", TZ);

const base: AvailabilityInput = {
  fromDate: "2026-11-02",
  toDate: "2026-11-02",
  durationMin: 30,
  workingHours: [
    { weekday: 1, startTime: "08:00:00", endTime: "12:00:00" },
    { weekday: 1, startTime: "14:00:00", endTime: "16:00:00" },
  ],
  busy: [],
  now: NOW,
  minHoursBeforeBooking: 0,
  maxDaysAhead: 60,
  stepMin: 30,
  tz: TZ,
};

const times = (m: Map<string, Date[]>, day = "2026-11-02") => (m.get(day) ?? []).map(fmtTime);

describe("computeAvailability", () => {
  it("genera turnos en bloques partidos (mañana y tarde)", () => {
    const r = times(computeAvailability(base));
    expect(r).toEqual([
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "14:00", "14:30", "15:00", "15:30",
    ]);
  });

  it("usa la hora local de Honduras (UTC-6)", () => {
    const first = computeAvailability(base).get("2026-11-02")![0];
    expect(first.toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("no ofrece turnos que no entran completos en el bloque", () => {
    const r = times(computeAvailability({ ...base, durationMin: 90, stepMin: 15 }));
    expect(r).toContain("10:30");
    expect(r).not.toContain("10:45");
    expect(r).toContain("14:30");
    expect(r).not.toContain("14:45");
  });

  it("excluye horarios ocupados por turnos existentes", () => {
    const busy = [{ start: localToUtc("2026-11-02", "09:00", TZ), end: localToUtc("2026-11-02", "10:00", TZ) }];
    const r = times(computeAvailability({ ...base, busy }));
    expect(r).not.toContain("09:00");
    expect(r).not.toContain("09:30");
    expect(r).toContain("08:30");
    expect(r).toContain("10:00");
  });

  it("excluye solapamientos parciales", () => {
    const busy = [{ start: localToUtc("2026-11-02", "08:45", TZ), end: localToUtc("2026-11-02", "09:15", TZ) }];
    const r = times(computeAvailability({ ...base, busy }));
    expect(r).not.toContain("08:30");
    expect(r).not.toContain("09:00");
    expect(r).toContain("08:00");
    expect(r).toContain("09:30");
  });

  it("respeta bloqueos de día completo (feriados)", () => {
    const busy = [{ start: localToUtc("2026-11-02", "00:00", TZ), end: localToUtc("2026-11-03", "00:00", TZ) }];
    expect(computeAvailability({ ...base, busy }).has("2026-11-02")).toBe(false);
  });

  it("respeta la anticipación mínima", () => {
    const r = times(computeAvailability({ ...base, minHoursBeforeBooking: 3 })); // ahora 07:00 → desde 10:00
    expect(r[0]).toBe("10:00");
  });

  it("no ofrece días sin horario de atención", () => {
    const m = computeAvailability({ ...base, fromDate: "2026-11-01", toDate: "2026-11-01" }); // domingo
    expect(m.size).toBe(0);
  });

  it("respeta el máximo de días hacia adelante", () => {
    const m = computeAvailability({ ...base, fromDate: "2026-11-02", toDate: "2026-11-30", maxDaysAhead: 7 });
    expect([...m.keys()]).toEqual(["2026-11-02", "2026-11-09"]);
  });

  it("no ofrece horarios del pasado", () => {
    const now = localToUtc("2026-11-02", "15:10", TZ);
    expect(times(computeAvailability({ ...base, now }))).toEqual(["15:30"]);
  });
});
