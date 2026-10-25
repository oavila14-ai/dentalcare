import type { Metadata } from "next";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import { appointments, db, services } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { appointmentOrder, buildAppointmentWhere, type AppointmentFilters } from "@/lib/admin-queries";
import { getClinicSettings } from "@/lib/data";
import { fmt } from "@/lib/dates";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";

export const metadata: Metadata = { title: "Turnos" };
const PAGE_SIZE = 25;

export default async function AppointmentsListPage({ searchParams }: { searchParams: Promise<AppointmentFilters> }) {
  await requireAdmin();
  const f = await searchParams;
  const tz = (await getClinicSettings()).timezone;
  const page = Math.max(1, Number(f.page) || 1);
  const where = buildAppointmentWhere(f, tz);

  const [rows, [{ total }], serviceList] = await Promise.all([
    db.query.appointments.findMany({
      where,
      with: { patient: true, service: true },
      orderBy: appointmentOrder,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ total: count() }).from(appointments).where(where),
    db.select({ id: services.id, name: services.name }).from(services).orderBy(asc(services.sortOrder)),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);
    return `?${p}`;
  };
  const exportQs = qs({ page: "" });

  return (
    <div>
      <PageHeader
        title="Turnos"
        description={`${total} ${total === 1 ? "turno" : "turnos"}`}
        actions={
          <>
            <Button asChild variant="outline"><a href={`/admin/turnos/exportar${exportQs}`}><Download /> Exportar CSV</a></Button>
            <Button asChild><Link href="/admin/turnos/nuevo"><Plus /> Nuevo turno</Link></Button>
          </>
        }
      />

      <form className="mb-4 grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={f.q} placeholder="Paciente, DNI, teléfono…" className="pl-10" aria-label="Buscar paciente" />
        </div>
        <NativeSelect name="estado" defaultValue={f.estado ?? ""} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </NativeSelect>
        <NativeSelect name="servicio" defaultValue={f.servicio ?? ""} aria-label="Servicio">
          <option value="">Todos los servicios</option>
          {serviceList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </NativeSelect>
        <Input type="date" name="desde" defaultValue={f.desde} aria-label="Desde" />
        <Input type="date" name="hasta" defaultValue={f.hasta} aria-label="Hasta" />
        <div className="flex gap-2">
          <Button type="submit" variant="solid" className="h-11 flex-1">Filtrar</Button>
          <Button asChild variant="ghost" className="h-11"><Link href="/admin/turnos">Limpiar</Link></Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No hay turnos con estos filtros.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id} className="relative cursor-pointer">
                  <TableCell>
                    <Link href={`/admin/turnos/${a.id}`} className="after:absolute after:inset-0">
                      <div className="font-medium tabular-nums">{fmt(a.startsAt, "dd/MM/yyyy")}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{fmt(a.startsAt, "EEE HH:mm")}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.patient.firstName} {a.patient.lastName}</div>
                    <div className="text-xs text-muted-foreground">{a.patient.dni ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: a.service.color }} />{a.service.name}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{a.patient.phone ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
              {page > 1 ? <Link href={qs({ page: page - 1 })}><ChevronLeft /> Anterior</Link> : <span><ChevronLeft /> Anterior</span>}
            </Button>
            <Button asChild={page < pages} variant="outline" size="sm" disabled={page >= pages}>
              {page < pages ? <Link href={qs({ page: page + 1 })}>Siguiente <ChevronRight /></Link> : <span>Siguiente <ChevronRight /></span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
