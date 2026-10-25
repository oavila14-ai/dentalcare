import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getClinicSettings } from "@/lib/data";
import { initials } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const PUBLIC_LINKS = [
  { href: "/#servicios", label: "Servicios" },
  { href: "/#equipo", label: "Nosotros" },
  { href: "/#ubicacion", label: "Ubicación" },
  { href: "/#preguntas", label: "Preguntas" },
];

export async function SiteHeader() {
  const [user, clinic] = await Promise.all([getSessionUser(), getClinicSettings()]);
  const isAdmin = user?.profile.role === "admin";

  const mobileLinks = [
    ...PUBLIC_LINKS,
    ...(user
      ? isAdmin
        ? [{ href: "/admin", label: "Panel de administración" }]
        : [
            { href: "/turnos/nuevo", label: "Solicitar turno" },
            { href: "/turnos", label: "Mis turnos" },
            { href: "/perfil", label: "Mi perfil" },
          ]
      : [
          { href: "/login", label: "Ingresar" },
          { href: "/registro", label: "Crear cuenta" },
        ]),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo name={clinic.name} className="min-w-0 text-[15px]" />
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              {!isAdmin && (
                <Button asChild size="sm" className="hidden h-9 sm:inline-flex">
                  <Link href="/turnos/nuevo">Solicitar turno</Link>
                </Button>
              )}
              <UserMenu
                name={`${user.profile.firstName} ${user.profile.lastName}`.trim() || user.email}
                email={user.email}
                initials={initials(user.profile.firstName, user.profile.lastName)}
                isAdmin={isAdmin}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden h-9 sm:inline-flex">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button asChild size="sm" className="h-9">
                <Link href="/registro">Sacar turno</Link>
              </Button>
            </>
          )}
          <MobileNav links={mobileLinks} />
        </div>
      </div>
    </header>
  );
}
