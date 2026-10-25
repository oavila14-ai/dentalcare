import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { getClinicSettings } from "@/lib/data";

export async function SiteFooter() {
  const clinic = await getClinicSettings();
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Logo name={clinic.name} />
          <p className="max-w-xs text-sm text-muted-foreground">{clinic.tagline}</p>
        </div>
        <div className="space-y-2.5 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Contacto</div>
          {clinic.address && (
            <p className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" /> {clinic.address}, {clinic.city}
            </p>
          )}
          {clinic.phone && (
            <p className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" /> {clinic.phone}
            </p>
          )}
          {clinic.email && (
            <p className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" /> {clinic.email}
            </p>
          )}
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="font-medium">Pacientes</div>
          <Link href="/turnos/nuevo" className="block text-muted-foreground hover:text-foreground">Solicitar turno</Link>
          <Link href="/turnos" className="block text-muted-foreground hover:text-foreground">Mis turnos</Link>
          <Link href="/privacidad" className="block text-muted-foreground hover:text-foreground">Política de privacidad</Link>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {clinic.name}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
