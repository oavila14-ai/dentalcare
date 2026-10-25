import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  // En modo dev cada ruta se compila en su primera visita: margen extra para las aserciones.
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Un solo worker: los proyectos comparten la agenda y competirían por el mismo horario.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-HN",
    timezoneId: "America/Tegucigalpa",
    trace: "retain-on-failure",
    // Para usar un Chromium ya instalado en el sistema: PW_CHROMIUM_PATH=/ruta/a/chromium
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
