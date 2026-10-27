// Cuando dos dispositivos ya usaron el mismo número, la app lo marca y deja renumerar una de las dos.
const { test, expect } = require("@playwright/test");
const {
  ID_A, ID_B, reiniciarNube, cerrarDispositivos, dispositivo, sincronizar,
  cotizacionesEnPantalla, cuentasEnPantalla, cotizacion, cuentaDeCobro,
} = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

test("las cotizaciones con número repetido se marcan y se pueden renumerar", async ({ browser, request }) => {
  const celular = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, cliente: "Cliente DEL CELULAR", total: 100000, hora: "2026-10-20T10:00:00.000Z" })]),
    pr_quote_num: "7",
  });
  await sincronizar(celular.page, request);
  const pc = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_B, cliente: "Cliente DEL COMPUTADOR", total: 250000, hora: "2026-10-20T11:00:00.000Z" })]),
    pr_quote_num: "7",
  });
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  // Las dos están a la vista y marcadas
  let tarjetas = await cotizacionesEnPantalla(pc.page);
  expect(tarjetas).toHaveLength(2);
  await expect(pc.page.locator("#history-list .dup-alert")).toHaveCount(2);

  // En el computador se renumera una (se acepta la confirmación)
  pc.page.on("dialog", (d) => d.accept());
  await pc.page.locator('#history-list .uhc-btn[data-accion="renumerar"]').first().click();
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  for (const [nombre, d] of [["computador", pc], ["celular", celular]]) {
    tarjetas = await cotizacionesEnPantalla(d.page);
    expect(tarjetas, `el ${nombre} sigue viendo las dos`).toHaveLength(2);
    await expect(d.page.locator("#history-list .dup-alert"), `el ${nombre} ya no tiene números repetidos`).toHaveCount(0);
    const numeros = tarjetas.map((t) => (t.match(/COT-\d{4}/) || [])[0]);
    expect(new Set(numeros).size).toBe(2);
  }
});

test("las cuentas de cobro con número repetido se marcan y se pueden renumerar", async ({ browser, request }) => {
  const celular = await dispositivo(browser, {
    pr_cobro_history: JSON.stringify([cuentaDeCobro({ id: ID_A, concepto: "Servicio del CELULAR", monto: 300000, hora: "2026-10-20T10:00:00.000Z" })]),
  });
  await sincronizar(celular.page, request);
  const pc = await dispositivo(browser, {
    pr_cobro_history: JSON.stringify([cuentaDeCobro({ id: ID_B, concepto: "Servicio del COMPUTADOR", monto: 450000, hora: "2026-10-20T11:00:00.000Z" })]),
  });
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  let tarjetas = await cuentasEnPantalla(pc.page);
  expect(tarjetas).toHaveLength(2);
  await expect(pc.page.locator("#cc-history-list .dup-alert")).toHaveCount(2);

  pc.page.on("dialog", (d) => d.accept());
  await pc.page.locator('#cc-history-list .uhc-btn[data-accion="renumerar"]').first().click();
  for (const d of [pc, celular, pc, celular]) await sincronizar(d.page, request);

  for (const [nombre, d] of [["computador", pc], ["celular", celular]]) {
    tarjetas = await cuentasEnPantalla(d.page);
    expect(tarjetas, `el ${nombre} sigue viendo las dos`).toHaveLength(2);
    await expect(d.page.locator("#cc-history-list .dup-alert"), `el ${nombre} ya no tiene números repetidos`).toHaveCount(0);
  }
});

test("una cotización nueva no toma un número que ya existe: usa el siguiente libre", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 7, cliente: "Cliente EXISTENTE", total: 100000, hora: "2026-10-20T10:00:00.000Z" })]),
    pr_quote_num: "7", // el consecutivo en curso quedó atrasado respecto a lo que ya hay guardado
  });
  if (await page.locator("#btn-main-cotizaciones").isVisible()) await page.locator("#btn-main-cotizaciones").click();
  await page.locator("#catalog-select").selectOption({ index: 1 });
  await page.locator("#btn-add-catalog").click();
  await page.locator("#q-client-name").fill("Cliente NUEVO");
  await page.locator("#btn-save-quote").click();

  const tarjetas = await cotizacionesEnPantalla(page);
  expect(tarjetas).toHaveLength(2);
  const existente = tarjetas.find((t) => t.includes("Cliente EXISTENTE"));
  const nueva = tarjetas.find((t) => t.includes("Cliente NUEVO"));
  expect(existente).toContain("COT-0007");
  expect(nueva).not.toContain("COT-0007");
});
