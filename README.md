# DentalCare — Turnos en línea para consultorio odontológico

Aplicación web para que los pacientes **creen su cuenta y soliciten turnos** eligiendo el servicio
(control general, limpieza, ortodoncia…), y para que el consultorio **apruebe, gestione y vea todos
los turnos** desde un panel de administración. Pensada para Honduras (hora `America/Tegucigalpa`,
DNI de 13 dígitos, teléfonos `+504`, precios en Lempiras) y **100 % gratuita** de operar.

## Funcionalidades

**Pacientes**
- Landing con servicios, equipo, horarios, ubicación, preguntas frecuentes y botón de WhatsApp.
- Registro con verificación de email (o Google, opcional), recuperación de contraseña.
- Wizard de reserva: servicio → día y hora (solo horarios realmente libres) → confirmar.
- "Mis turnos": próximos e historial, cancelación (hasta N horas antes), agregar a Google Calendar / `.ics`.
- Emails: solicitud recibida, confirmado (con `.ics`), rechazado (con motivo), cancelado, recordatorio 24 h antes.

**Consultorio (panel `/admin`)**
- Resumen con KPIs (pendientes, turnos de hoy, ocupación semanal, cancelaciones) y gráficos.
- Bandeja de pendientes: confirmar o rechazar en un clic (avisa al paciente por email).
- Calendario día / semana / mes, con bloqueos y horario de atención.
- Listado con búsqueda y filtros, exportación a CSV, ficha de cada turno con notas internas e historial.
- Turnos manuales (pacientes que llaman), incluso para pacientes sin email.
- Pacientes: listado y ficha con historial.
- Configuración: datos del consultorio, reglas de reserva, servicios (duración, precio, color, ícono),
  horario semanal con bloques partidos, bloqueos (feriados/vacaciones) y perfil del profesional.

**Garantías**
- La base de datos impide turnos superpuestos (`EXCLUDE USING gist`), incluso con reservas simultáneas.
- RLS activado en todas las tablas sin políticas: la API pública de Supabase no expone datos;
  todo pasa por el servidor, que valida sesión, rol y datos (Zod) en cada acción.

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Radix UI · Motion ·
Supabase (Postgres + Auth) · Drizzle ORM · Zod · React Hook Form · date-fns-tz · Nodemailer +
React Email · Recharts · Vitest · Playwright. Hosting: Netlify. CI y backups: GitHub Actions.

## Desarrollo local

Requisitos: Node 22 y Docker (para Supabase local).

```bash
npm install
npm run db:start          # Supabase local: Postgres, Auth y Mailpit (emails de prueba)
npm run db:reset          # aplica migraciones + datos iniciales (supabase/seed.sql)
cp .env.example .env.local
# completa NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY con lo que muestra `npx supabase status`
npm run create-admin -- admin@clinica.test Admin12345 Recepción
npm run dev               # http://localhost:3000
```

- Emails de prueba: http://127.0.0.1:54324 (Mailpit).
- Panel: ingresa con el admin creado → `/admin`.

### Pruebas

```bash
npm test                  # unitarias (disponibilidad) + integración (anti-doble-reserva, requiere db:start)
npm run test:e2e          # Playwright: registro → reserva → aprobación (requiere db:start, admin creado y dev server)
npm run lint && npm run typecheck
```

Si ya tienes un Chromium instalado: `PW_CHROMIUM_PATH=/ruta/chromium npm run test:e2e`.

## Publicar en 3 pasos (camino rápido)

1. **Supabase** (supabase.com → New project). Copia de *Project Settings → API Keys* la URL, la
   *Publishable key* y la *Secret key*, y del botón **Connect** la cadena *Transaction pooler*
   (reemplaza `[YOUR-PASSWORD]`). En *Authentication → Sign In / Providers → Email* desactiva
   **Confirm email** (así los pacientes entran sin esperar un correo; actívalo cuando configures Gmail).
2. **Netlify** (netlify.com → Add new project → Import from GitHub → `dentalcare`). Antes de
   *Deploy*, agrega estas variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_DEMO=true`, `CRON_SECRET` (cualquier texto largo)
   y `NEXT_PUBLIC_SITE_URL` (la URL que te asigne Netlify; si aún no la sabes, agrégala y vuelve a desplegar).
   En el primer deploy se crean solas las tablas, el administrador y los datos de demo.
3. **Supabase → Authentication → URL Configuration**: *Site URL* = tu URL de Netlify.

Listo: entra a `https://tu-sitio.netlify.app/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Paciente de demo: `paciente@demo.invalid` / `Demo2026!`. Los pasos de abajo (Gmail, plantillas,
backups) se pueden hacer después.

## Puesta en producción (gratis)

### 1. Supabase (plan Free)
1. Crea un proyecto en [supabase.com](https://supabase.com) (región `us-east-1` es la más cercana a Honduras).
2. Abre **SQL Editor → New query**, pega todo `supabase/produccion/instalacion-completa.sql`
   y presiona **Run**. Crea las tablas, las protecciones, los datos base del consultorio y datos de
   **demo** (15 pacientes ficticios, ~170 turnos alrededor de la fecha actual y un bloqueo de agenda).
   - ✏️ Antes de ejecutarlo cambia el email y la contraseña del admin (sección DEMO, al inicio del bloque `do $$`).
   - Paciente de prueba para ver la app como paciente: `paciente@demo.invalid` / `Demo2026!`.
   - Antes de abrir al público, borra la demo con `supabase/demo-borrar.sql` (conserva servicios y configuración)
     y crea el admin real con `npm run create-admin`.
   - Si cambias migraciones o datos, regenera el archivo con `npm run db:setup-sql`.
3. **Authentication → URL Configuration**: *Site URL* = `https://tu-sitio.netlify.app`; agrega
   `https://tu-sitio.netlify.app/**` a *Redirect URLs*.
4. **Authentication → Email Templates**: pega el contenido de `supabase/templates/confirmation.html`
   (plantilla "Confirm signup") y `supabase/templates/recovery.html` ("Reset password").
5. **Authentication → SMTP Settings**: activa SMTP personalizado con Gmail (ver paso 3). El SMTP
   integrado de Supabase solo permite unos pocos emails por hora.
6. Guarda: *Project URL*, *Publishable key*, *Secret key* (Settings → API Keys) y la cadena de
   conexión *Transaction pooler* (Connect → ORMs) para `DATABASE_URL`.

### 2. Netlify (plan Free — permite uso comercial)
1. Sube el repo a GitHub e impórtalo en [netlify.com](https://netlify.com). Netlify detecta Next.js.
2. Variables de entorno: todas las de `.env.example` con valores de producción
   (`NEXT_PUBLIC_SITE_URL` = tu URL de Netlify, `CRON_SECRET` = valor largo aleatorio).
3. La función programada `netlify/functions/reminders.mts` corre todos los días a las 8:00 (hora de
   Honduras), envía los recordatorios y mantiene activo el proyecto de Supabase (el plan Free se
   pausa tras 7 días sin actividad).

### 3. Email con Gmail (gratis, ~500/día)
1. Crea una cuenta Gmail para el consultorio y activa la verificación en 2 pasos.
2. Genera una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones).
3. Variables: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`,
   `SMTP_USER=tu@gmail.com`, `SMTP_PASS=<contraseña de aplicación>`, `MAIL_FROM="Clínica <tu@gmail.com>"`.
4. Usa los mismos datos en el SMTP de Supabase (paso 1.5).

Cuando tengas dominio propio puedes cambiar a Resend u otro proveedor: solo cambian las variables SMTP.

### 4. Administrador
```bash
# con las variables de producción en .env.local (o exportadas en la terminal)
npm run create-admin -- recepcion@tuconsultorio.hn "ContraseñaSegura" "Recepción"
```

### 5. Backups (GitHub Actions)
En el repo: *Settings → Secrets and variables → Actions* agrega `SUPABASE_DB_URL` (conexión
*Session pooler*) y `BACKUP_PASSPHRASE`. El workflow `backup-db.yml` guarda cada domingo un
`pg_dump` cifrado como artefacto (90 días). Para restaurar:
`gpg -d backup-AAAA-MM-DD.sql.gz.gpg | gunzip | psql "<url>"`.

### Google (opcional)
Configura el proveedor Google en Supabase (*Authentication → Providers*) y pon
`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Los usuarios de Google completan DNI y teléfono al primer ingreso.

## Estructura

```
src/app/(site)/           landing, mis turnos, wizard, perfil, privacidad
src/app/(auth)/           login, registro, recuperar, restablecer
src/app/admin/            panel: resumen, pendientes, calendario, turnos, pacientes, configuración
src/app/actions/          server actions (auth, turnos del paciente, panel admin)
src/app/api/cron/         recordatorios diarios
src/lib/availability.ts   motor de disponibilidad (función pura, con tests)
src/lib/notifications.ts  emails por evento del turno
src/db/schema.ts          esquema Drizzle (refleja las migraciones)
supabase/migrations/      esquema SQL: tablas, anti-solapamiento, RLS, triggers
supabase/seed.sql         datos iniciales (placeholders editables)
netlify/functions/        función programada de recordatorios
```

## Antes de abrir al público

- Reemplaza los datos de ejemplo (nombre, dirección, profesional, precios) desde **Configuración**.
- Revisa la política de privacidad (`/privacidad`) con un asesor legal.
- Costo mensual: **L 0**. Opcional: dominio propio (~USD 10–15/año).
