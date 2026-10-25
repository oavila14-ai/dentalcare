/**
 * Prepara la base de datos automáticamente (se ejecuta en cada deploy de Netlify, antes del build).
 * Es idempotente: solo hace lo que falta.
 *   1. Si no existen las tablas → aplica migraciones + datos base del consultorio.
 *   2. Si no hay ningún administrador → crea el admin con ADMIN_EMAIL / ADMIN_PASSWORD
 *      y, salvo SEED_DEMO=false, carga los datos de demo.
 * Sin DATABASE_URL no hace nada (por ejemplo en CI).
 */
import { readdirSync, readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || url.includes("127.0.0.1:1/")) {
  console.log("[setup-db] DATABASE_URL no definido: se omite la preparación de la base.");
  process.exit(0);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: (n) => console.log(`[setup-db] ${n.message}`) });
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

try {
  const [{ exists }] = await sql`select to_regclass('public.appointments') is not null as exists`;
  if (!exists) {
    console.log("[setup-db] Creando tablas y datos base…");
    for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
      await sql.unsafe(readFileSync(`supabase/migrations/${f}`, "utf8"));
    }
    await sql.unsafe(readFileSync("supabase/seed.sql", "utf8"));
  } else {
    console.log("[setup-db] Las tablas ya existen.");
  }

  const [{ admins }] = await sql`select count(*)::int as admins from public.profiles where role = 'admin'`;
  if (admins === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) {
      throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) para crear el administrador.");
    }
    if (process.env.SEED_DEMO !== "false") {
      console.log("[setup-db] Creando administrador y datos de demo…");
      const demo = readFileSync("supabase/demo.sql", "utf8")
        .replace(/v_admin_email\s+text := '[^']*';/, `v_admin_email text := ${quote(email)};`)
        .replace(/v_admin_password\s+text := '[^']*';/, `v_admin_password text := ${quote(password)};`);
      await sql.unsafe(demo);
    } else {
      console.log("[setup-db] Creando administrador…");
      await sql.begin(async (tx) => {
        const [u] = await tx`
          insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change)
          values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            ${email}, extensions.crypt(${password}, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            '{"first_name":"Recepción","last_name":"","privacy_accepted":"true"}', now(), now(), '', '', '', '')
          returning id, email`;
        await tx`
          insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
          values (gen_random_uuid(), ${u.id}, ${u.id}::text,
            ${sql.json({ sub: u.id, email: u.email, email_verified: true })}, 'email', now(), now(), now())`;
        await tx`update public.profiles set role = 'admin' where id = ${u.id}`;
      });
    }
  } else {
    console.log(`[setup-db] Ya hay ${admins} administrador(es).`);
  }
  console.log("[setup-db] ✔ Base de datos lista.");
} catch (e) {
  console.error("[setup-db] ✖", e.message ?? e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
