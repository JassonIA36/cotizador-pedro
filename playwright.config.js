const { defineConfig, devices } = require("@playwright/test");

// Pruebas automáticas del cotizador. Corren la app real en Chromium contra una «nube» falsa en memoria,
// así que nunca tocan la cuenta de Supabase ni los datos del cliente.
module.exports = defineConfig({
  testDir: "pruebas",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:8099", ...devices["Pixel 7"] },
  webServer: {
    command: "node pruebas/servidor-de-prueba.cjs",
    url: "http://127.0.0.1:8099/index.html",
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
