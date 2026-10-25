import type { Metadata } from "next";
import { getClinicSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Política de privacidad" };

export default async function PrivacyPage() {
  const clinic = await getClinicSettings();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Política de privacidad</h1>
      <p>
        En {clinic.name} cuidamos tus datos personales y de salud. Esta política explica qué
        información recopilamos, para qué la usamos y cuáles son tus derechos.
      </p>
      <h2>Datos que recopilamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Datos de identificación y contacto: nombre, DNI, fecha de nacimiento, teléfono y email.</li>
        <li>Datos de tus turnos: servicio solicitado, fecha, notas que escribas y estado del turno.</li>
        <li>Seguro médico, si decides indicarlo.</li>
      </ul>
      <h2>Para qué los usamos</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Gestionar tus turnos y comunicarnos contigo (confirmaciones, recordatorios y cambios).</li>
        <li>Identificarte correctamente como paciente y llevar tu historial de atención.</li>
      </ul>
      <p>No vendemos ni compartimos tus datos con terceros con fines comerciales.</p>
      <h2>Quién accede</h2>
      <p>
        Solo el personal autorizado del consultorio. Los datos se guardan en servidores con cifrado
        y acceso restringido.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes consultar y corregir tus datos desde &quot;Mi perfil&quot;, y solicitar su eliminación
        escribiendo a {clinic.email || "nuestro email de contacto"}.
      </p>
      <p className="text-sm">
        Este texto es una plantilla general; revísalo con tu asesor legal antes de publicar.
      </p>
    </article>
  );
}
