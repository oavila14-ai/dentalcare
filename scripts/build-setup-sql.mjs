// Genera supabase/produccion/instalacion-completa.sql = migraciones + datos base + demo,
// para pegar en el SQL Editor de Supabase en un solo paso.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const migrations = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
const parts = [
  ...migrations.map((f) => [`supabase/migrations/${f}`, readFileSync(`supabase/migrations/${f}`, "utf8")]),
  ["supabase/seed.sql", readFileSync("supabase/seed.sql", "utf8")],
  ["supabase/demo.sql", readFileSync("supabase/demo.sql", "utf8")],
];

const header = `-- ════════════════════════════════════════════════════════════════════
--  INSTALACIÓN COMPLETA — pegar en Supabase → SQL Editor → Run
--  Archivo generado con: npm run db:setup-sql (no editar a mano)
--  Incluye: esquema, datos base del consultorio y datos de DEMO.
--  ✏️ Antes de ejecutar, cambia el email/contraseña del admin en la sección DEMO.
-- ════════════════════════════════════════════════════════════════════
`;
const body = parts.map(([name, sql]) => `\n-- ┌─────────────── ${name} ───────────────┐\n${sql}`).join("\n");
writeFileSync("supabase/produccion/instalacion-completa.sql", header + body);
console.log(`✔ supabase/produccion/instalacion-completa.sql (${parts.length} partes)`);
