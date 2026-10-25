/**
 * Crea (o promueve) un usuario administrador.
 *   npm run create-admin -- admin@consultorio.hn "ContraseñaSegura123" "Nombre" "Apellido"
 * Si el usuario ya existe, solo le asigna el rol de administrador.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

config({ path: ".env.local" });
config();

async function main() {
  const [email, password, firstName = "Administración", lastName = ""] = process.argv.slice(2);
  if (!email) {
    console.error('Uso: npm run create-admin -- <email> [contraseña] [nombre] [apellido]');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [existing] = await sql<{ id: string }[]>`select id from public.profiles where lower(email) = lower(${email})`;
  let id = existing?.id;

  if (!id) {
    if (!password || password.length < 8) throw new Error("Para crear el usuario indica una contraseña de al menos 8 caracteres");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, privacy_accepted: true },
    });
    if (error) throw error;
    id = data.user.id;
  }

  await sql`update public.profiles set role = 'admin' where id = ${id}`;
  console.log(`✔ ${email} es administrador`);
  await sql.end();
}

main().catch((e) => {
  console.error("✖", e.message ?? e);
  process.exit(1);
});
