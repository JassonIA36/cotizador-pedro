// El almacén a prueba de fallos: copia interna, recuperación y aviso.
const { test, expect } = require("@playwright/test");
const { ID_A, reiniciarNube, cerrarDispositivos, dispositivo, cotizacionesEnPantalla, cotizacion } = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

async function guardarCotizacionNueva(page, cliente) {
  if (await page.locator("#btn-main-cotizaciones").isVisible()) await page.locator("#btn-main-cotizaciones").click();
  await page.locator("#catalog-select").selectOption({ index: 1 });
  await page.locator("#btn-add-catalog").click();
  await page.locator("#q-client-name").fill(cliente);
  await page.locator("#btn-save-quote").click();
}

test("si el navegador borra localStorage, los datos se recuperan de la copia interna", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 1, cliente: "Carlos Gómez", total: 70000, hora: "2026-09-28T10:00:00.000Z" })]),
    pr_quote_num: "1",
  });
  await page.waitForTimeout(3800); // la copia inicial a la copia interna se hace unos segundos después de abrir
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1500);
  const tarjetas = await cotizacionesEnPantalla(page);
  expect(tarjetas.join(" | ")).toContain("Carlos Gómez");
});

test("con localStorage bloqueado la app sigue guardando y avisa", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  // Se simula un navegador que no deja escribir en localStorage (modo restringido o sin espacio)
  await page.evaluate(() => {
    Storage.prototype.setItem = function () { throw new DOMException("QuotaExceededError", "QuotaExceededError"); };
  });
  await guardarCotizacionNueva(page, "Cliente con almacenamiento bloqueado");
  await expect(page.locator("#pr-aviso-almacen")).toBeVisible();
  await expect(page.locator("#pr-aviso-almacen")).toContainText("copia interna");
  await page.waitForTimeout(600);

  // El bloqueo sigue al reabrir: la cotización sale de la copia interna
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException("QuotaExceededError", "QuotaExceededError"); };
  });
  await page.reload();
  await page.waitForTimeout(1500);
  const tarjetas = await cotizacionesEnPantalla(page);
  expect(tarjetas.join(" | ")).toContain("Cliente con almacenamiento bloqueado");
});

test("con espacio normal no aparece ningún aviso y los datos se guardan en localStorage", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await guardarCotizacionNueva(page, "Cliente normal");
  await expect(page.locator("#pr-aviso-almacen")).toHaveCount(0);
  const guardado = await page.evaluate(() => localStorage.getItem("pr_history"));
  expect(guardado).toContain("Cliente normal");
});
