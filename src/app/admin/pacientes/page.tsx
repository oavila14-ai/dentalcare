import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { appointments, db, profiles } from "@/db";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { fmtDateShort } from "@/lib/dates";
import { NO_EMAIL_DOMAIN } from "@/lib/mailer";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Pacientes" };
const PAGE_SIZE = 30;

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const term = q?.trim();
  const like = `%${term}%`;
  const where = and(
    eq(profiles.role, "patient"),
    term
      ? or(ilike(sql`${profiles.firstName} || ' ' || ${profiles.lastName}`, like), ilike(profiles.dni, like), ilike(profiles.phone, like), ilike(profiles.email, like))
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        dni: profiles.dni,
        phone: profiles.phone,
        email: profiles.email,
        createdAt: profiles.createdAt,
        visits: sql<number>`count(${appointments.id}) filter (where ${appointments.status} = 'completed')`.mapWith(Number),
        lastVisit: sql<Date | null>`max(${appointments.startsAt}) filter (where ${appointments.status} = 'completed')`.mapWith((v) => (v ? new Date(v) : null)),
        next: sql<Date | null>`min(${appointments.startsAt}) filter (where ${appointments.status} in ('pending','confirmed') and ${appointments.startsAt} > now())`.mapWith((v) => (v ? new Date(v) : null)),
      })
      .from(profiles)
      .leftJoin(appointments, eq(appointments.patientId, profiles.id))
      .where(where)
      .groupBy(profiles.id)
      .orderBy(asc(profiles.lastName), asc(profiles.firstName))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(profiles).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/pacientes?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHeader title="Pacientes" description={`${total} ${total === 1 ? "paciente" : "pacientes"}`} />
      <form className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={term} placeholder="Buscar por nombre, DNI, teléfono o email" className="pl-10" aria-label="Buscar paciente" />
        </div>
        <Button type="submit" variant="solid" className="h-11">Buscar</Button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No se encontraron pacientes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Paciente</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Visitas</TableHead>
                <TableHead>Próximo turno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="relative">
                  <TableCell>
                    <Link href={`/admin/pacientes/${p.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials(p.firstName, p.lastName)}</span>
                      <span className="font-medium">{p.lastName}, {p.firstName}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{p.dni ?? "—"}</TableCell>
                  <TableCell>
                    <div className="tabular-nums">{p.phone ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email.endsWith(`@${NO_EMAIL_DOMAIN}`) ? "Sin email" : p.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums">{p.visits}</div>
                    {p.lastVisit && <div className="text-xs text-muted-foreground">Última: {fmtDateShort(p.lastVisit)}</div>}
                  </TableCell>
                  <TableCell className="tabular-nums">{p.next ? fmtDateShort(p.next) : <span className="text-muted-foreground">—</span>}</TableCell>
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
            {page > 1 && <Button asChild variant="outline" size="sm"><Link href={link(page - 1)}><ChevronLeft /> Anterior</Link></Button>}
            {page < pages && <Button asChild variant="outline" size="sm"><Link href={link(page + 1)}>Siguiente <ChevronRight /></Link></Button>}
          </div>
        </div>
      )}
    </div>
  );
}
