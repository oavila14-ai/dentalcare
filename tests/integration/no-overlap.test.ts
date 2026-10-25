/**
 * Verifica la garantía anti-doble-reserva a nivel de base de datos.
 * Requiere Postgres con las migraciones aplicadas (npm run db:start).
 */
import { config } from "dotenv";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
const PRO = "00000000-0000-4000-8000-000000000001";
const SERVICE = "00000000-0000-4000-8000-000000000101";

describe.skipIf(!url)("restricción appointments_no_overlap", () => {
  const sql = postgres(url!, { max: 4 });
  let patientId: string;
  const created: string[] = [];

  beforeAll(async () => {
    const [p] = await sql<{ id: string }[]>`select id from profiles where role = 'patient' limit 1`;
    if (!p) throw new Error("Se necesita al menos un paciente (registra uno o corre los e2e)");
    patientId = p.id;
  });

  afterAll(async () => {
    if (created.length) await sql`delete from appointments where id in ${sql(created)}`;
    await sql.end();
  });

  const insert = (start: string, end: string, status = "pending") =>
    sql<{ id: string }[]>`
      insert into appointments (patient_id, professional_id, service_id, starts_at, ends_at, status)
      values (${patientId}, ${PRO}, ${SERVICE}, ${start}, ${end}, ${status})
      returning id`.then((r) => (created.push(r[0].id), r[0].id));

  it("de dos reservas simultáneas del mismo horario, solo una se guarda", async () => {
    const results = await Promise.allSettled([
      insert("2030-01-07 14:00+00", "2030-01-07 14:30+00"),
      insert("2030-01-07 14:00+00", "2030-01-07 14:30+00"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.code).toBe("23P01");
  });

  it("rechaza solapamientos parciales", async () => {
    await expect(insert("2030-01-07 14:15+00", "2030-01-07 15:00+00")).rejects.toMatchObject({ code: "23P01" });
  });

  it("permite turnos contiguos", async () => {
    await expect(insert("2030-01-07 14:30+00", "2030-01-07 15:00+00")).resolves.toBeTypeOf("string");
  });

  it("libera el horario cuando el turno se cancela", async () => {
    const id = await insert("2030-01-08 14:00+00", "2030-01-08 14:30+00", "confirmed");
    await sql`update appointments set status = 'cancelled' where id = ${id}`;
    await expect(insert("2030-01-08 14:00+00", "2030-01-08 14:30+00")).resolves.toBeTypeOf("string");
  });
});
