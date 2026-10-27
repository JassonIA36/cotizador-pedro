// Importar un historial desde un archivo no debe pisar documentos de otros clientes.
const { test, expect } = require("@playwright/test");
const { ID_A, ID_B, reiniciarNube, cerrarDispositivos, dispositivo, cuentasEnPantalla, cuentaDeCobro } = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

test("importar la cuenta N° 001 de OTRO cliente no sobrescribe la N° 001 existente", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_cobro_history: JSON.stringify([
      cuentaDeCobro({ id: ID_A, numero: 1, cliente: "Cliente A", concepto: "Servicio de A", monto: 100000, hora: "2026-10-20T10:00:00.000Z" }),
    ]),
  });
  page.on("dialog", (d) => d.accept());
  await cuentasEnPantalla(page);

  const deOtroCliente = cuentaDeCobro({ id: ID_B, numero: 1, cliente: "Cliente B", concepto: "Servicio de B", monto: 250000, hora: "2026-10-21T10:00:00.000Z" });
  await page.locator("#cc-import-history-file").setInputFiles({
    name: "historial.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([deOtroCliente])),
  });
  await page.waitForTimeout(800);

  const tarjetas = await cuentasEnPantalla(page);
  expect(tarjetas, `quedaron: ${tarjetas.join(" | ")}`).toHaveLength(2);
  expect(tarjetas.join(" | ")).toContain("Cliente A");
  expect(tarjetas.join(" | ")).toContain("Cliente B");
});

test("importar dos veces el mismo archivo no duplica las cuentas", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  page.on("dialog", (d) => d.accept());
  await cuentasEnPantalla(page);
  const archivo = {
    name: "historial.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([cuentaDeCobro({ id: ID_A, numero: 1, cliente: "Cliente A", concepto: "Servicio de A", monto: 100000, hora: "2026-10-20T10:00:00.000Z" })])),
  };
  await page.locator("#cc-import-history-file").setInputFiles(archivo);
  await page.waitForTimeout(600);
  await page.locator("#cc-import-history-file").setInputFiles(archivo);
  await page.waitForTimeout(600);
  expect(await cuentasEnPantalla(page)).toHaveLength(1);
});
