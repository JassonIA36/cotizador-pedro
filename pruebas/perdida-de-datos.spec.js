// Fallos que el cliente reportó («a veces no me quedan guardadas las cotizaciones y cuentas de cobro»).
// Cada prueba reproduce una causa encontrada en el código; debe pasar cuando está corregida.
const { test, expect } = require("@playwright/test");
const {
  ID_A, ID_B, reiniciarNube, cerrarDispositivos, nube, dispositivo, sincronizar,
  cotizacionesEnPantalla, cuentasEnPantalla, cotizacion, cuentaDeCobro,
} = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

test("dos dispositivos con la misma COT-0007 conservan las DOS cotizaciones", async ({ browser, request }) => {
  const celular = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, cliente: "Cliente DEL CELULAR", total: 100000, hora: "2026-10-20T10:00:00.000Z" })]),
    pr_quote_num: "7",
  });
  await sincronizar(celular.page, request);

  const pc = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_B, cliente: "Cliente DEL COMPUTADOR", total: 250000, hora: "2026-10-20T11:00:00.000Z" })]),
    pr_quote_num: "7",
  });
  // Varias rondas de sincronización, como pasa al usar la app durante el día
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  const enNube = (await nube(request)).filter((f) => f.tipo === "cotizacion" && !f.deleted);
  expect(enNube).toHaveLength(2);

  for (const [nombre, d] of [["celular", celular], ["computador", pc]]) {
    const tarjetas = await cotizacionesEnPantalla(d.page);
    expect(tarjetas, `el ${nombre} debe ver las dos cotizaciones`).toHaveLength(2);
    expect(tarjetas.join(" | ")).toContain("DEL CELULAR");
    expect(tarjetas.join(" | ")).toContain("DEL COMPUTADOR");
  }
});

test("la cuenta de cobro N° 002 del mismo cliente creada en dos dispositivos conserva las DOS", async ({ browser, request }) => {
  const celular = await dispositivo(browser, {
    pr_cobro_history: JSON.stringify([cuentaDeCobro({ id: ID_A, concepto: "Servicio del CELULAR", monto: 300000, hora: "2026-10-20T10:00:00.000Z" })]),
  });
  await sincronizar(celular.page, request);

  const pc = await dispositivo(browser, {
    pr_cobro_history: JSON.stringify([cuentaDeCobro({ id: ID_B, concepto: "Servicio del COMPUTADOR", monto: 450000, hora: "2026-10-20T11:00:00.000Z" })]),
  });
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  const enNube = (await nube(request)).filter((f) => f.tipo === "cuenta_cobro" && !f.deleted);
  expect(enNube).toHaveLength(2);

  for (const [nombre, d] of [["celular", celular], ["computador", pc]]) {
    const tarjetas = await cuentasEnPantalla(d.page);
    expect(tarjetas, `el ${nombre} debe ver las dos cuentas`).toHaveLength(2);
  }
});

test("«Abrir» funciona también en la primera cotización del historial", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 1, cliente: "Carlos Gómez", total: 70000, hora: "2026-09-28T10:00:00.000Z", estado: "Aprobada" })]),
    pr_quote_num: "1",
  });
  await cotizacionesEnPantalla(page);
  await page.locator('#history-list .uhc-btn[data-accion="abrir"]').click();
  await expect(page.locator("#q-client-name")).toHaveValue("Carlos Gómez");
});

test("«Duplicar» y «Estado» funcionan en la primera cotización del historial", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 1, cliente: "Carlos Gómez", total: 70000, hora: "2026-09-28T10:00:00.000Z", estado: "Borrador" })]),
    pr_quote_num: "1",
  });
  await cotizacionesEnPantalla(page);
  await page.locator('#history-list .uhc-btn[data-accion="estado"]').click();
  await expect(page.locator("#history-list .unified-history-card")).toContainText(/Enviada/i);
});

test("volver a guardar una cotización aprobada no le quita el estado", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 1, cliente: "Carlos Gómez", total: 70000, hora: "2026-09-28T10:00:00.000Z", estado: "Aprobada" })]),
    pr_quote_num: "1",
  });
  await cotizacionesEnPantalla(page);
  await page.locator('#history-list .uhc-btn[data-accion="abrir"]').click();
  await page.locator("#q-equipment").fill("Portátil Lenovo (corregido)");
  await page.locator("#btn-save-quote").click();
  const tarjetas = await cotizacionesEnPantalla(page);
  expect(tarjetas).toHaveLength(1);
  expect(tarjetas[0]).toMatch(/Aprobada/i);
  expect(tarjetas[0]).toContain("Carlos Gómez");
});

// PENDIENTE (siguiente versión): guardado a prueba de almacenamiento lleno. Se deja marcada para no olvidarla.
test.fixme("con el almacenamiento lleno la cotización NO se pierde y la app avisa", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await page.evaluate(() => {
    const rellenar = (k, tam) => { let i = 0; try { for (;;) { localStorage.setItem(k + i, "x".repeat(tam)); i++; } } catch (e) { /* lleno */ } };
    rellenar("relleno_a_", 200000); rellenar("relleno_b_", 5000); rellenar("relleno_c_", 100); rellenar("relleno_d_", 1);
  });

  if (await page.locator("#btn-main-cotizaciones").isVisible()) await page.locator("#btn-main-cotizaciones").click();
  await page.locator("#catalog-select").selectOption({ index: 1 });
  await page.locator("#btn-add-catalog").click();
  await page.locator("#q-client-name").fill("Cliente con almacenamiento lleno");
  await page.locator("#btn-save-quote").click();

  // Recargar = cerrar y volver a abrir la app. La cotización debe seguir ahí.
  await page.reload();
  await page.waitForTimeout(1500);
  const tarjetas = await cotizacionesEnPantalla(page);
  expect(tarjetas.join(" | ")).toContain("Cliente con almacenamiento lleno");
});
