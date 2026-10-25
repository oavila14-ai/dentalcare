import { CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { MeshBackground } from "@/components/mesh-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { getClinicSettings } from "@/lib/data";

// Lee la configuración del consultorio en cada request (cambia desde el panel).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const clinic = await getClinicSettings();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative isolate hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <MeshBackground className="opacity-90" />
        <Logo name={clinic.name} className="text-white" />
        <div className="mt-auto max-w-md space-y-8">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            Tu próxima cita, <span className="text-gradient">a un clic</span>.
          </h2>
          <ul className="space-y-4 text-white/80">
            <li className="flex items-center gap-3"><span className="glass flex size-9 items-center justify-center rounded-xl"><CalendarCheck className="size-4" /></span> Elige día y hora con disponibilidad real</li>
            <li className="flex items-center gap-3"><span className="glass flex size-9 items-center justify-center rounded-xl"><Sparkles className="size-4" /></span> Confirmación y recordatorio por email</li>
            <li className="flex items-center gap-3"><span className="glass flex size-9 items-center justify-center rounded-xl"><ShieldCheck className="size-4" /></span> Tus datos, protegidos y privados</li>
          </ul>
        </div>
        <p className="mt-12 text-sm text-white/50">© {new Date().getFullYear()} {clinic.name}</p>
      </aside>
      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Logo name={clinic.name} className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
