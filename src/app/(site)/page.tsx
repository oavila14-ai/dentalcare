import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, MapPin, MousePointerClick, Phone, Stethoscope } from "lucide-react";
import { db } from "@/db";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FadeIn } from "@/components/motion";
import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { WhatsAppButton, whatsappLink } from "@/components/whatsapp-button";
import { getActiveProfessionals, getActiveServices, getClinicSettings } from "@/lib/data";
import { summarizeSchedule } from "@/lib/schedule";
import { formatLempiras, initials } from "@/lib/utils";

const STEPS = [
  { icon: MousePointerClick, title: "Elige el servicio", text: "Control, limpieza, ortodoncia y más. Ves la duración y el precio de referencia." },
  { icon: CalendarCheck, title: "Escoge día y hora", text: "Solo te mostramos horarios realmente libres en la agenda del consultorio." },
  { icon: Stethoscope, title: "Te confirmamos", text: "Revisamos tu solicitud y te avisamos por email. Te recordamos un día antes." },
];

export default async function HomePage() {
  const [clinic, services, professionals, hours] = await Promise.all([
    getClinicSettings(),
    getActiveServices(),
    getActiveProfessionals(),
    db.query.workingHours.findMany(),
  ]);
  const schedule = summarizeSchedule(hours);

  const faq = [
    { q: "¿Necesito crear una cuenta para sacar turno?", a: "Sí. Con tu cuenta puedes ver, cancelar y consultar el historial de tus turnos, y recibes avisos por email." },
    { q: "¿Mi turno queda confirmado al instante?", a: "Tu solicitud reserva el horario de inmediato y el consultorio la confirma en breve. Te avisaremos por email en cuanto esté confirmada." },
    { q: "¿Puedo cancelar o cambiar mi turno?", a: `Sí, desde "Mis turnos" puedes cancelarlo hasta ${clinic.cancellationHours} horas antes y solicitar uno nuevo.` },
    { q: "¿Los precios son definitivos?", a: "Los precios son de referencia. El costo final se define en consulta según el diagnóstico y el tratamiento." },
    { q: "¿Qué pasa si tengo una urgencia?", a: `Solicita un turno de "Urgencia" o escríbenos por WhatsApp${clinic.whatsapp ? ` al ${clinic.whatsapp}` : ""} para atenderte lo antes posible.` },
  ];

  return (
    <>
      <Hero clinicName={clinic.name} tagline={clinic.tagline} />

      {/* Servicios */}
      <section id="servicios" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Servicios"
            title="Todo para tu salud bucal, en un solo lugar"
            description="Elige el servicio al solicitar tu turno. Así reservamos el tiempo justo para atenderte."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <FadeIn key={s.id} delay={(i % 3) * 0.06}>
                <Link
                  href={`/turnos/nuevo?servicio=${s.id}`}
                  className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-transparent"
                >
                  <div
                    className="absolute inset-0 -z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(120% 80% at 0% 0%, ${s.color}1f, transparent 60%)` }}
                  />
                  <div className="relative flex items-start justify-between">
                    <ServiceIcon icon={s.icon} color={s.color} size="lg" />
                    <ArrowRight className="size-5 -translate-x-2 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <div className="relative space-y-1.5">
                    <h3 className="text-lg font-semibold tracking-tight">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                  <div className="relative mt-auto flex items-center gap-3 pt-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {s.durationMin} min</span>
                    {formatLempiras(s.price) && (
                      <span className="font-medium text-foreground">desde {formatLempiras(s.price)}</span>
                    )}
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative overflow-hidden border-y border-border/60 bg-card/40 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Cómo funciona" title="Tu turno en tres pasos" />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.1} className="relative rounded-2xl border border-border/70 bg-background/70 p-7 shadow-soft">
                <div className="text-gradient absolute top-5 right-6 text-5xl font-bold opacity-30">{i + 1}</div>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.text}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section id="equipo" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Nosotros" title="Profesionales que te escuchan" />
          <div className="mx-auto mt-14 grid max-w-4xl gap-6">
            {professionals.map((p) => (
              <FadeIn key={p.id} className="glass grid items-center gap-6 rounded-3xl p-6 shadow-soft sm:grid-cols-[auto_1fr] sm:p-8">
                <div className="relative mx-auto">
                  <div className="absolute -inset-1.5 rounded-full bg-brand-gradient opacity-70 blur-md" />
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt={p.name} className="relative size-32 rounded-full object-cover ring-4 ring-background" />
                  ) : (
                    <div className="relative flex size-32 items-center justify-center rounded-full bg-brand-gradient text-3xl font-semibold text-white ring-4 ring-background">
                      {initials(p.name.split(" ")[0], p.name.split(" ")[1])}
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="text-2xl font-semibold tracking-tight">{p.title} {p.name}</h3>
                  <div className="text-gradient font-medium">{p.specialty}</div>
                  {p.bio && <p className="text-muted-foreground">{p.bio}</p>}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Ubicación y horarios */}
      <section id="ubicacion" className="scroll-mt-20 border-t border-border/60 bg-card/40 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <FadeIn className="space-y-6">
            <SectionHeading eyebrow="Ubicación" title="Te esperamos" className="mx-0 text-left" />
            <div className="space-y-4 text-muted-foreground">
              {clinic.address && (
                <p className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" /> {clinic.address}, {clinic.city}</p>
              )}
              {clinic.phone && (
                <p className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0 text-primary" /> {clinic.phone}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {clinic.mapsUrl && (
                <Button asChild variant="outline"><a href={clinic.mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin /> Cómo llegar</a></Button>
              )}
              {clinic.whatsapp && (
                <Button asChild variant="outline"><a href={whatsappLink(clinic.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>
              )}
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="rounded-3xl border border-border/70 bg-background/70 p-6 shadow-soft sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><Clock className="size-5 text-primary" /> Horario de atención</h3>
            <dl className="mt-5 divide-y divide-border/70">
              {schedule.map((d) => (
                <div key={d.weekday} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="font-medium">{d.day}</dt>
                  <dd className={d.ranges ? "text-right tabular-nums" : "text-muted-foreground"}>{d.ranges ?? "Cerrado"}</dd>
                </div>
              ))}
            </dl>
          </FadeIn>
        </div>
      </section>

      {/* Preguntas */}
      <section id="preguntas" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Preguntas frecuentes" title="Resolvemos tus dudas" />
          <div className="mt-12"><Faq items={faq} /></div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-24 sm:px-6">
        <FadeIn className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-14 text-center text-white shadow-glow sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">¿Listo para cuidar tu sonrisa?</h2>
            <p className="text-lg text-white/85">Solicita tu turno ahora. Te confirmamos por email.</p>
            <Button asChild size="lg" variant="solid" className="bg-white text-slate-900 hover:bg-white/90">
              <Link href="/turnos/nuevo">Solicitar turno <ArrowRight /></Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      <WhatsAppButton phone={clinic.whatsapp} />
    </>
  );
}
