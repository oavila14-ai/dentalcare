import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { ArrowRight, CalendarCheck, CalendarX2, Gauge, Inbox } from "lucide-react";
import { appointments, db, services, workingHours } from "@/db";
import { AppointmentCard } from "@/components/admin/appointment-card";
import { ChartTable, DailyColumns, ServiceBars } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { addDaysKey, dayRangeUtc, fmt, fmtDateLong, localToUtc, startOfWeekKey, toLocalDateKey, weekdayOf } from "@/lib/dates";

export const metadata: Metadata = { title: "Resumen" };

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const tz = (await getClinicSettings()).timezone;
  const now = new Date();
  const today = toLocalDateKey(now, tz);
  const todayRange = dayRangeUtc(today, tz);
  const weekStart = startOfWeekKey(today);
  const weekFrom = localToUtc(weekStart, "00:00", tz);
  const weekTo = localToUtc(addDaysKey(weekStart, 7), "00:00", tz);
  const in14 = localToUtc(addDaysKey(today, 14), "00:00", tz);
  const ago30 = new Date(now.getTime() - 30 * 86_400_000);

  const [todayAppts, pendingList, [{ pendingCount }], weekRows, hours, upcoming, byService, [{ lost, total30 }]] = await Promise.all([
    db.query.appointments.findMany({
      where: and(gte(appointments.startsAt, todayRange.start), lt(appointments.startsAt, todayRange.end), inArray(appointments.status, ["pending", "confirmed", "completed", "no_show"])),
      with: { patient: true, service: true, professional: true },
      orderBy: asc(appointments.startsAt),
    }),
    db.query.appointments.findMany({
      where: eq(appointments.status, "pending"),
      with: { patient: true, service: true, professional: true },
      orderBy: asc(appointments.startsAt),
      limit: 3,
    }),
    db.select({ pendingCount: count() }).from(appointments).where(eq(appointments.status, "pending")),
    db
      .select({ start: appointments.startsAt, end: appointments.endsAt })
      .from(appointments)
      .where(and(gte(appointments.startsAt, weekFrom), lt(appointments.startsAt, weekTo), inArray(appointments.status, ["pending", "confirmed", "completed", "no_show"]))),
    db.select().from(workingHours),
    db
      .select({ start: appointments.startsAt })
      .from(appointments)
      .where(and(gte(appointments.startsAt, todayRange.start), lt(appointments.startsAt, in14), inArray(appointments.status, ["pending", "confirmed"]))),
    db
      .select({ label: services.name, value: count() })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(and(gte(appointments.startsAt, ago30), inArray(appointments.status, ["pending", "confirmed", "completed", "no_show"])))
      .groupBy(services.name)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        lost: sql<number>`count(*) filter (where ${appointments.status} in ('cancelled','no_show'))`.mapWith(Number),
        total30: count(),
      })
      .from(appointments)
      .where(and(gte(appointments.startsAt, ago30), lt(appointments.startsAt, now))),
  ]);

  // Ocupación semanal: minutos reservados / minutos de atención de la semana.
  let workMinutes = 0;
  for (let i = 0; i < 7; i++) {
    const wd = weekdayOf(addDaysKey(weekStart, i));
    for (const h of hours.filter((x) => x.weekday === wd)) workMinutes += minutes(h.endTime) - minutes(h.startTime);
  }
  const bookedMinutes = weekRows.reduce((acc, r) => acc + (r.end.getTime() - r.start.getTime()) / 60_000, 0);
  const occupancy = workMinutes ? Math.min(100, Math.round((bookedMinutes / workMinutes) * 100)) : 0;

  const daily = Array.from({ length: 14 }, (_, i) => {
    const key = addDaysKey(today, i);
    return {
      label: i === 0 ? "Hoy" : fmt(localToUtc(key, "12:00", tz), "EEE d"),
      value: upcoming.filter((u) => toLocalDateKey(u.start, tz) === key).length,
    };
  });

  const hour = Number(fmt(now, "H"));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const lostRate = total30 ? Math.round((lost / total30) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting}, ${admin.profile.firstName}`} description={fmtDateLong(now)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Pendientes" value={pendingCount} hint="Esperando tu aprobación" icon={Inbox} highlight={pendingCount > 0} />
        <StatTile label="Turnos hoy" value={todayAppts.length} hint={`${todayAppts.filter((a) => a.status === "confirmed").length} confirmados`} icon={CalendarCheck} />
        <StatTile label="Ocupación semanal" value={`${occupancy}%`} hint={`${Math.round(bookedMinutes / 60)} h de ${Math.round(workMinutes / 60)} h`} icon={Gauge} />
        <StatTile label="Cancelaciones" value={`${lostRate}%`} hint={`${lost} de ${total30} (últimos 30 días)`} icon={CalendarX2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Por aprobar</CardTitle>
                <CardDescription>Solicitudes más próximas</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm"><Link href="/admin/pendientes">Ver todas <ArrowRight /></Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingList.length ? (
                pendingList.map((a) => <AppointmentCard key={a.id} a={a} />)
              ) : (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">¡Todo al día! No hay solicitudes pendientes.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Turnos por día</CardTitle>
              <CardDescription>Pendientes y confirmados, próximas 2 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyColumns data={daily} />
              <ChartTable data={daily} header={["Día", "Turnos"]} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Agenda de hoy</CardTitle>
                <CardDescription>{todayAppts.length ? `${todayAppts.length} turnos` : "Sin turnos"}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm"><Link href="/admin/calendario?vista=dia">Calendario <ArrowRight /></Link></Button>
            </CardHeader>
            <CardContent>
              {todayAppts.length ? (
                <ol className="relative space-y-1 border-l border-border pl-5">
                  {todayAppts.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/turnos/${a.id}`} className="relative -ml-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted">
                        <span className="absolute -left-[18px] size-2.5 rounded-full ring-4 ring-card" style={{ background: a.service.color }} />
                        <span className="w-12 text-sm font-semibold tabular-nums">{fmt(a.startsAt, "HH:mm")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{a.patient.firstName} {a.patient.lastName}</span>
                          <span className="block truncate text-xs text-muted-foreground">{a.service.name}</span>
                        </span>
                        {a.status === "pending" && <span className="size-2 rounded-full bg-amber-500" title="Pendiente" />}
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No hay turnos agendados para hoy.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Turnos por servicio</CardTitle>
              <CardDescription>Últimos 30 días y agendados</CardDescription>
            </CardHeader>
            <CardContent>
              {byService.length ? (
                <>
                  <ServiceBars data={byService} />
                  <ChartTable data={byService} header={["Servicio", "Turnos"]} />
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay datos.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
