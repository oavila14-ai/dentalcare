import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { ExternalLink, Plus } from "lucide-react";
import { appointments, db } from "@/db";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminNav } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [clinic, [{ pending }]] = await Promise.all([
    getClinicSettings(),
    db.select({ pending: count() }).from(appointments).where(eq(appointments.status, "pending")),
  ]);

  return (
    <div className="min-h-dvh bg-muted/40 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="hidden border-r border-border/60 bg-muted/60 lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
        <Logo name={clinic.name} href="/admin" className="px-2 pt-2 text-[15px]" />
        <AdminNav pendingCount={pending} />
        <div className="mt-auto space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-glow">
            <div className="text-sm font-semibold">Turno por teléfono</div>
            <p className="mt-1 text-xs text-white/85">Cárgalo en segundos y queda confirmado.</p>
            <Button asChild size="sm" variant="solid" className="mt-3 bg-white text-slate-900 hover:bg-white/90">
              <Link href="/admin/turnos/nuevo"><Plus /> Nuevo turno</Link>
            </Button>
          </div>
          <Link href="/" target="_blank" className="flex items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-3.5" /> Ver sitio público
          </Link>
        </div>
      </aside>
      </div>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <AdminMobileNav pendingCount={pending} />
          <Logo name={clinic.name} href="/admin" className="min-w-0 text-[15px] lg:hidden" />
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild size="sm" className="hidden h-9 sm:inline-flex"><Link href="/admin/turnos/nuevo"><Plus /> Nuevo turno</Link></Button>
            <ThemeToggle />
            <UserMenu
              name={`${admin.profile.firstName} ${admin.profile.lastName}`.trim()}
              email={admin.email}
              initials={initials(admin.profile.firstName, admin.profile.lastName)}
              isAdmin
            />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
