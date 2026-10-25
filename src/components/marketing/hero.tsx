import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { FadeIn, Float } from "@/components/motion";
import { Button } from "@/components/ui/button";

export function Hero({ clinicName, tagline }: { clinicName: string; tagline: string }) {
  return (
    <section className="relative isolate overflow-hidden">
      <MeshBackground />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeIn className="space-y-7">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-soft">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Turnos en línea las 24 horas
          </span>
          <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.25rem]">
            Tu sonrisa merece <span className="text-gradient">lo mejor</span>.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground sm:text-xl">
            {tagline}. En {clinicName} eliges el servicio, el día y la hora en menos de un minuto —
            sin llamadas ni filas.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/turnos/nuevo">
                Solicitar turno <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/#servicios">Ver servicios</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Datos protegidos</li>
            <li className="flex items-center gap-2"><BellRing className="size-4 text-primary" /> Recordatorio 24 h antes</li>
            <li className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" /> Confirmación por email</li>
          </ul>
        </FadeIn>

        <FadeIn delay={0.15} className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-3xl" />
          <Float>
            <div className="glass rounded-[1.75rem] p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Próximo turno</div>
                  <div className="mt-0.5 font-semibold">Limpieza dental</div>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Confirmado
                </span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px]">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <div key={i} className="text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: 14 }, (_, i) => i + 9).map((n) => (
                  <div
                    key={n}
                    className={
                      n === 12
                        ? "rounded-lg bg-brand-gradient py-1.5 font-semibold text-white shadow-glow"
                        : n % 7 === 1
                          ? "py-1.5 text-muted-foreground/40"
                          : "rounded-lg bg-card/70 py-1.5"
                    }
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["08:30", "09:15", "10:00", "10:45", "14:00", "15:30"].map((t) => (
                  <div
                    key={t}
                    className={
                      t === "10:00"
                        ? "rounded-xl border border-transparent bg-foreground py-2 text-center text-sm font-medium text-background"
                        : "rounded-xl border bg-card/70 py-2 text-center text-sm"
                    }
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Float>
          <Float transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-8 -left-6 sm:-left-12">
            <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-white"><Sparkles className="size-4" /></span>
              <div className="text-sm">
                <div className="font-medium">¡Solicitud enviada!</div>
                <div className="text-xs text-muted-foreground">Te avisamos al confirmar</div>
              </div>
            </div>
          </Float>
          <Float transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute -top-6 -right-3 sm:-right-8">
            <div className="glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm shadow-soft">
              <Clock className="size-4 text-primary" /> 45 min
            </div>
          </Float>
        </FadeIn>
      </div>
    </section>
  );
}
