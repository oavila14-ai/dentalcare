import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, gt, inArray, lt } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { appointments, db, timeOff, workingHours } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { addDaysKey, capitalize, fmt, isValidDateKey, localToUtc, startOfWeekKey, toLocalDateKey, weekdayOf } from "@/lib/dates";
import { WEEKDAYS_SHORT } from "@/lib/schedule";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendario" };

type View = "dia" | "semana" | "mes";
const HOUR_PX = 64;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function monthGridStart(dateKey: string) {
  return startOfWeekKey(`${dateKey.slice(0, 7)}-01`);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tz = (await getClinicSettings()).timezone;
  const today = toLocalDateKey(new Date(), tz);
  const view: View = sp.vista === "dia" || sp.vista === "mes" ? sp.vista : "semana";
  const date = isValidDateKey(sp.fecha) ? sp.fecha : today;

  // Rango visible
  let days: string[];
  if (view === "dia") days = [date];
  else if (view === "semana") days = Array.from({ length: 7 }, (_, i) => addDaysKey(startOfWeekKey(date), i));
  else days = Array.from({ length: 42 }, (_, i) => addDaysKey(monthGridStart(date), i));

  const from = localToUtc(days[0], "00:00", tz);
  const to = localToUtc(addDaysKey(days[days.length - 1], 1), "00:00", tz);

  const [appts, hours, blocks] = await Promise.all([
    db.query.appointments.findMany({
      where: and(lt(appointments.startsAt, to), gt(appointments.endsAt, from), inArray(appointments.status, ["pending", "confirmed", "completed", "no_show"])),
      with: { patient: true, service: true },
      orderBy: asc(appointments.startsAt),
    }),
    db.select().from(workingHours),
    db.select().from(timeOff).where(and(lt(timeOff.startsAt, to), gt(timeOff.endsAt, from))),
  ]);

  // Navegación
  const step = (dir: number) =>
    view === "dia" ? addDaysKey(date, dir) : view === "semana" ? addDaysKey(date, dir * 7) : addDaysKey(`${date.slice(0, 7)}-15`, dir * 30).slice(0, 7) + "-01";
  const href = (v: View, f: string) => `/admin/calendario?vista=${v}&fecha=${f}`;
  const mid = localToUtc(view === "mes" ? `${date.slice(0, 7)}-15` : days[0], "12:00", tz);
  const title =
    view === "dia"
      ? capitalize(fmt(mid, "EEEE d 'de' MMMM yyyy"))
      : view === "semana"
        ? `${fmt(localToUtc(days[0], "12:00", tz), "d MMM")} – ${fmt(localToUtc(days[6], "12:00", tz), "d MMM yyyy")}`
        : capitalize(fmt(mid, "MMMM yyyy"));

  // Rango horario del grid (según horario de atención y turnos)
  const starts = [...hours.map((h) => toMin(h.startTime)), ...appts.map((a) => toMin(fmt(a.startsAt, "HH:mm")))];
  const ends = [...hours.map((h) => toMin(h.endTime)), ...appts.map((a) => toMin(fmt(a.endsAt, "HH:mm")) || 24 * 60)];
  const gridStart = Math.floor(Math.min(7 * 60, ...starts) / 60) * 60;
  const gridEnd = Math.ceil(Math.max(19 * 60, ...ends) / 60) * 60;
  const hourMarks = Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => gridStart / 60 + i);

  const apptsByDay = (day: string) => appts.filter((a) => toLocalDateKey(a.startsAt, tz) === day);
  const nowMin = toMin(fmt(new Date(), "HH:mm"));

  return (
    <div className="space-y-5">
      <PageHeader title="Calendario" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon-sm"><Link href={href(view, step(-1))} aria-label="Anterior"><ChevronLeft /></Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={href(view, today)}>Hoy</Link></Button>
          <Button asChild variant="outline" size="icon-sm"><Link href={href(view, step(1))} aria-label="Siguiente"><ChevronRight /></Link></Button>
          <h2 className="ml-2 text-lg font-semibold">{title}</h2>
        </div>
        <div className="inline-flex rounded-2xl bg-card p-1 shadow-soft">
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <Link
              key={v}
              href={href(v, date)}
              className={cn("rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors", v === view ? "bg-brand-gradient text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {{ dia: "Día", semana: "Semana", mes: "Mes" }[v]}
            </Link>
          ))}
        </div>
      </div>

      {view !== "mes" ? (
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
          <div className={cn(view === "semana" && "min-w-[760px]")}>
            {/* Encabezado de días */}
            <div className="sticky top-0 z-10 grid border-b border-border/70 bg-card" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
              <div />
              {days.map((d) => (
                <Link key={d} href={href("dia", d)} className="flex flex-col items-center gap-0.5 border-l border-border/50 py-2.5 hover:bg-muted/50">
                  <span className="text-xs text-muted-foreground uppercase">{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
                  <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums", d === today && "bg-brand-gradient text-white shadow-glow")}>
                    {Number(d.slice(8))}
                  </span>
                </Link>
              ))}
            </div>
            {/* Grid horario */}
            <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
              <div>
                {hourMarks.map((h, i) => (
                  <div key={h} className="relative text-right" style={{ height: HOUR_PX }}>
                    <span className={cn("absolute right-2 text-[11px] text-muted-foreground tabular-nums", i === 0 ? "top-1" : "-top-2")}>{String(h).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
              {days.map((d) => {
                const wd = weekdayOf(d);
                const open = hours.filter((h) => h.weekday === wd);
                const dayStart = localToUtc(d, "00:00", tz).getTime();
                const dayBlocks = blocks
                  .map((b) => ({
                    ...b,
                    s: Math.max(gridStart, (b.startsAt.getTime() - dayStart) / 60_000),
                    e: Math.min(gridEnd, (b.endsAt.getTime() - dayStart) / 60_000),
                  }))
                  .filter((b) => b.e > b.s);
                const items = apptsByDay(d);
                // Carriles para turnos superpuestos (varios profesionales)
                const lanes: number[] = [];
                const placed = items.map((a) => {
                  const s = toMin(fmt(a.startsAt, "HH:mm"));
                  const e = s + (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000;
                  let lane = lanes.findIndex((end) => end <= s);
                  if (lane === -1) lane = lanes.push(e) - 1;
                  else lanes[lane] = e;
                  return { a, s, e, lane };
                });
                const laneCount = Math.max(1, lanes.length);
                return (
                  <div key={d} className="relative border-l border-border/50 bg-muted/40" style={{ height: hourMarks.length * HOUR_PX }}>
                    {open.map((h) => (
                      <div key={h.id} className="absolute inset-x-0 bg-card" style={{ top: ((toMin(h.startTime) - gridStart) / 60) * HOUR_PX, height: ((toMin(h.endTime) - toMin(h.startTime)) / 60) * HOUR_PX }} />
                    ))}
                    {hourMarks.map((h, i) => (
                      <div key={h} className="absolute inset-x-0 border-t border-border/50" style={{ top: i * HOUR_PX }} />
                    ))}
                    {dayBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="absolute inset-x-1 flex items-start rounded-lg border border-dashed border-border bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,transparent_6px_12px)] p-1.5 text-[11px] text-muted-foreground"
                        style={{ top: ((b.s - gridStart) / 60) * HOUR_PX, height: ((b.e - b.s) / 60) * HOUR_PX }}
                      >
                        {b.reason ?? "Bloqueado"}
                      </div>
                    ))}
                    {placed.map(({ a, s, e, lane }) => {
                      const height = Math.max(22, ((e - s) / 60) * HOUR_PX - 3);
                      return (
                        <Link
                          key={a.id}
                          href={`/admin/turnos/${a.id}`}
                          title={`${fmt(a.startsAt, "HH:mm")} ${a.patient.firstName} ${a.patient.lastName} — ${a.service.name} (${STATUS_META[a.status].label})`}
                          className={cn(
                            "absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-xs shadow-sm transition-transform hover:z-10 hover:scale-[1.02]",
                            a.status === "pending" && "border-dashed opacity-90",
                            (a.status === "no_show") && "opacity-60",
                          )}
                          style={{
                            top: ((s - gridStart) / 60) * HOUR_PX + 1,
                            height,
                            left: `calc(${(lane / laneCount) * 100}% + 3px)`,
                            width: `calc(${100 / laneCount}% - 6px)`,
                            borderLeftColor: a.service.color,
                            background: `color-mix(in srgb, ${a.service.color} 16%, var(--card))`,
                          }}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <span className="tabular-nums">{fmt(a.startsAt, "HH:mm")}</span>
                            <span className="truncate">{a.patient.firstName} {a.patient.lastName}</span>
                            {a.status === "pending" && <span className={cn("ml-auto size-1.5 shrink-0 rounded-full", STATUS_META.pending.dot)} />}
                          </div>
                          {height > 36 && <div className="truncate text-muted-foreground">{a.service.name}</div>}
                        </Link>
                      );
                    })}
                    {d === today && nowMin >= gridStart && nowMin <= gridEnd && (
                      <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - gridStart) / 60) * HOUR_PX }}>
                        <span className="-ml-1 size-2 rounded-full bg-rose-500" />
                        <span className="h-px flex-1 bg-rose-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <div className="grid grid-cols-7 border-b border-border/70">
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <div key={wd} className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">{WEEKDAYS_SHORT[wd]}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const items = apptsByDay(d);
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              return (
                <Link
                  key={d}
                  href={href("dia", d)}
                  className={cn("min-h-24 border-r border-b border-border/50 p-1.5 transition-colors hover:bg-muted/50 sm:min-h-28 sm:p-2", !inMonth && "bg-muted/40 text-muted-foreground")}
                >
                  <div className={cn("mb-1 flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums", d === today && "bg-brand-gradient text-white")}>{Number(d.slice(8))}</div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[11px]" style={{ background: `color-mix(in srgb, ${a.service.color} 14%, transparent)` }}>
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: a.service.color }} />
                        <span className="hidden tabular-nums sm:inline">{fmt(a.startsAt, "HH:mm")}</span>
                        <span className="truncate">{a.patient.lastName}</span>
                      </div>
                    ))}
                    {items.length > 3 && <div className="px-1 text-[11px] font-medium text-muted-foreground">+{items.length - 3} más</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-5 rounded-sm border-l-[3px] border-dashed border-l-primary bg-primary/15" /> Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-5 rounded-sm border-l-[3px] border-l-primary bg-primary/15" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-5 rounded-sm border border-dashed border-muted-foreground/40 bg-[repeating-linear-gradient(135deg,var(--border)_0_3px,transparent_3px_6px)]" /> Bloqueado</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-5 rounded-sm border border-border bg-muted" /> Fuera de horario</span>
      </div>
    </div>
  );
}
