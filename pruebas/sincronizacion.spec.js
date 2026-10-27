// Sincronización fiable: poco consumo de datos, nada se queda esperando, reintentos y avisos claros.
const { test, expect } = require("@playwright/test");
const {
  reiniciarNube, cerrarDispositivos, dispositivo, sincronizar, nube, estadisticas, comportamiento,
  cotizacion,
} = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

const uuid = (i) => "00000000-0000-4000-8000-" + String(i).padStart(12, "0");

async function guardarCotizacionNueva(page, cliente) {
  if (await page.locator("#btn-main-cotizaciones").isVisible()) await page.locator("#btn-main-cotizaciones").click();
  await page.locator("#catalog-select").selectOption({ index: 1 });
  await page.locator("#btn-add-catalog").click();
  await page.locator("#q-client-name").fill(cliente);
  await page.locator("#btn-save-quote").click();
}

const enNube = async (request, cliente) =>
  (await nube(request)).filter((f) => f.tipo === "cotizacion" && !f.deleted && f.datos.clientName === cliente).length;

test("una sincronización sin cambios descarga solo un índice liviano, no los documentos", async ({ browser, request }) => {
  const cotizaciones = Array.from({ length: 150 }, (_, i) =>
    cotizacion({ id: uuid(i + 1), numero: i + 1, cliente: `Cliente ${i + 1}`, total: 10000 + i, hora: "2026-10-20T10:00:00.000Z" }));
  const a = await dispositivo(browser, { pr_history: JSON.stringify(cotizaciones), pr_quote_num: "150" });
  await sincronizar(a.page, request);

  const b = await dispositivo(browser, {});
  await sincronizar(b.page, request);

  const antes = await estadisticas(request);
  await sincronizar(b.page, request);
  const despues = await estadisticas(request);

  expect(despues.filasConDatos - antes.filasConDatos, "no debe volver a bajar documentos completos").toBe(0);
  expect(despues.bytesDescargados - antes.bytesDescargados, "bytes descargados en una sincronización sin cambios").toBeLessThan(40_000);

  // Y el dispositivo B sí recibió las 150 cotizaciones la primera vez
  await b.page.locator("#btn-main-cotizaciones").click();
  await expect(b.page.locator("#badge-quotes-count")).toHaveText("150");
});

test("la fila de configuración ya no sube el logo (24 KB) en cada sincronización", async ({ browser, request }) => {
  const d = await dispositivo(browser, {});
  await sincronizar(d.page, request);
  const config = (await nube(request)).find((f) => f.tipo === "config");
  expect(config).toBeTruthy();
  expect(JSON.stringify(config.datos).length).toBeLessThan(5000);
});

test("un cambio hecho mientras se sincroniza se sube enseguida, sin esperar un minuto", async ({ browser, request }) => {
  const d = await dispositivo(browser, {});
  await comportamiento(request, { latenciaMs: 1500 });
  await d.page.evaluate(() => document.getElementById("topbar-sync-btn").click()); // empieza una sincronización lenta
  await d.page.waitForTimeout(300);
  await guardarCotizacionNueva(d.page, "Cliente durante la sincronización");
  await d.page.waitForTimeout(2500);
  await comportamiento(request, { latenciaMs: 0 });
  await expect.poll(() => enNube(request, "Cliente durante la sincronización"), { timeout: 20_000 }).toBe(1);
});

test("si el servidor falla, el cambio queda pendiente y se reintenta solo", async ({ browser, request }) => {
  const d = await dispositivo(browser, {});
  await comportamiento(request, { falla: true });
  await guardarCotizacionNueva(d.page, "Cliente con el servidor caído");
  await expect(d.page.locator("#sync-text")).toContainText(/error|pendiente/i, { timeout: 12_000 });
  expect(await enNube(request, "Cliente con el servidor caído")).toBe(0);

  await comportamiento(request, { falla: false });
  await expect.poll(() => enNube(request, "Cliente con el servidor caído"), { timeout: 40_000 }).toBe(1);
  await expect(d.page.locator("#sync-text")).toContainText(/Sincronizado/i, { timeout: 10_000 });
});

test("si la sesión vence, la app lo dice claramente y no interrumpe con una ventana", async ({ browser }) => {
  const d = await dispositivo(browser, {});
  await d.page.evaluate(() => window.__nube.vencerSesion());
  await expect(d.page.locator("#sync-text")).toContainText("Sesión vencida");
  await expect(d.page.locator("#auth-modal-overlay")).toBeHidden();
});

test("el panel de diagnóstico muestra el estado de la sincronización y del almacenamiento", async ({ browser, request }) => {
  const d = await dispositivo(browser, {});
  await sincronizar(d.page, request);
  await d.page.locator("#btn-main-cotizaciones").click();
  await d.page.locator("[data-subview=view-config]").click();
  const panel = d.page.locator("#sync-diagnostico");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Última sincronización");
  await expect(panel).toContainText("Cambios pendientes");
  await expect(panel).toContainText("Almacenamiento");
  await expect(panel).toContainText("Versión");
  await expect(d.page.locator("#btn-copiar-diagnostico")).toBeVisible();
});
