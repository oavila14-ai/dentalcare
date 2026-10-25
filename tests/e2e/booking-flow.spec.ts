/**
 * Flujo completo: registro → confirmación por email → solicitud de turno →
 * aprobación del admin → el paciente ve su turno confirmado.
 *
 * Requiere: Supabase local (npm run db:start) con Mailpit y un admin creado con
 *   npm run create-admin -- admin@clinica.test Admin12345 Recepción
 */
import { expect, test, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@clinica.test", password: process.env.E2E_ADMIN_PASSWORD ?? "Admin12345" };

async function confirmationLink(email: string) {
  for (let i = 0; i < 20; i++) {
    const { messages } = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const m = messages.find((x: { To: { Address: string }[] }) => x.To[0]?.Address === email);
    if (m) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
      return full.HTML.match(/href="([^"]*auth\/confirm[^"]*)"/)[1].replace(/&amp;/g, "&") as string;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el email de confirmación a ${email}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("paciente reserva y el admin confirma", async ({ page, browser }, info) => {
  const id = `${Date.now()}${info.project.name === "mobile" ? 1 : 0}`;
  const email = `e2e-${id}@example.com`;
  const dni = `0801${id.slice(-9)}`;
  const firstName = `Test${id.slice(-5)}`;

  // 1. Registro
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(firstName);
  await page.getByLabel("Apellido").fill("Paciente");
  await page.getByLabel("DNI").fill(dni);
  await page.getByLabel("Teléfono / WhatsApp").fill("98765432");
  await page.getByLabel("Fecha de nacimiento").fill("1992-03-15");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill("Prueba1234");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Revisa tu correo")).toBeVisible();

  // 2. Confirmación por email → llega directo al wizard
  await page.goto(await confirmationLink(email));
  await expect(page).toHaveURL(/\/turnos\/nuevo/);

  // 3. Solicitud de turno
  await page.getByRole("button", { name: /Control general/ }).click();
  const slot = page.locator("button[aria-pressed]").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible({ timeout: 15_000 });
  await slot.click();
  await page.getByRole("button", { name: /Continuar ·/ }).click();
  await page.getByLabel(/Motivo o comentario/).fill("Prueba automática");
  await page.getByRole("button", { name: "Solicitar turno" }).last().click();
  await expect(page.getByText("¡Solicitud enviada!")).toBeVisible({ timeout: 15_000 });

  await page.goto("/turnos");
  await expect(page.getByText("Esperando confirmación del consultorio")).toBeVisible();

  // 4. Un paciente no puede entrar al panel
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/turnos$/);

  // 5. El admin confirma la solicitud
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN.email, ADMIN.password);
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto("/admin/pendientes");
  const card = admin.locator("article").filter({ hasText: firstName });
  await card.getByRole("button", { name: "Confirmar" }).click();
  await expect(admin.getByText("Turno confirmado")).toBeVisible();
  await adminCtx.close();

  // 6. El paciente lo ve confirmado
  await page.goto("/turnos");
  await expect(page.locator("article").getByText("Confirmado")).toBeVisible();
});

test("las páginas privadas piden iniciar sesión", async ({ page }) => {
  await page.goto("/turnos");
  await expect(page).toHaveURL(/\/login\?next=%2Fturnos/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
