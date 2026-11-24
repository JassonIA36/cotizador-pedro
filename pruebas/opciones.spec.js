// Cotización con varias opciones de precio y fotos pequeñas por ítem.
const { test, expect } = require("@playwright/test");
const { reiniciarNube, cerrarDispositivos, dispositivo, cotizacion, ID_A } = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

async function irACotizador(page) {
  await page.locator("#main-nav [data-nav=cotizaciones]").click();
  await page.locator("[data-subview=view-cotizador]").click();
  await expect(page.locator("#view-cotizador")).toBeVisible();
}

async function lineaLibre(page, descripcion, precio) {
  await page.locator("#btn-add-line").click();
  const filas = page.locator("#quote-lines .line-item");
  const ultima = filas.nth((await filas.count()) - 1);
  await ultima.locator('[data-field="d"]').fill(descripcion);
  await ultima.locator('[data-field="p"]').fill(String(precio));
}

async function fotoGrande(page, nombre, color) {
  const bytes = await page.evaluate(async (c) => {
    const cv = document.createElement("canvas");
    cv.width = 3000; cv.height = 2000;
    const g = cv.getContext("2d");
    g.fillStyle = c; g.fillRect(0, 0, 3000, 2000);
    g.fillStyle = "#fff"; g.font = "250px sans-serif"; g.fillText("PIEZA", 700, 1100);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.95));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  return { name: nombre, mimeType: "image/jpeg", buffer: Buffer.from(bytes) };
}

test("una sola opción se ve y se guarda como siempre", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irACotizador(page);
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(0);
  await expect(page.locator("#opt-bar .opt-add")).toBeVisible();
  await lineaLibre(page, "Mantenimiento", 50000);
  await expect(page.locator("#preview-total")).toHaveText("$50.000");
  await page.locator("#btn-save-quote").click();
  await page.waitForTimeout(400);
  const guardada = await page.evaluate(() => JSON.parse(localStorage.getItem("pr_history"))[0]);
  expect(guardada.opciones).toBeUndefined();
  expect(guardada.items).toHaveLength(1);
  expect(guardada.total).toBe(50000);
});

test("dos opciones: cada una con su total, vista previa, texto de WhatsApp, PDF y reabrir", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irACotizador(page);
  await page.locator("#q-client-name").fill("Cliente Opciones");
  await lineaLibre(page, "Cambio de pantalla genérica", 200000);
  await page.locator("#q-delivery").fill("10000");

  await page.locator('#opt-bar [data-action="add-opt"]').click();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(2);
  await expect(page.locator("#opt-bar .opt-tab.active .opt-tab-letter")).toHaveText("B");
  // el domicilio se copia de la opción anterior
  await expect(page.locator("#q-delivery")).toHaveValue("10000");
  await page.locator("#opt-name").fill("Pantalla original");
  await lineaLibre(page, "Cambio de pantalla original", 350000);
  await page.locator("#q-discount").fill("10");

  // totales por opción: A = 200.000 + 10.000 ; B = 350.000 - 10 % + 10.000
  await expect(page.locator("#opt-bar .opt-tab").nth(0).locator(".opt-tab-total")).toHaveText("$210.000");
  await expect(page.locator("#opt-bar .opt-tab").nth(1).locator(".opt-tab-total")).toHaveText("$325.000");
  await expect(page.locator("#opt-bar .opt-tab").nth(1).locator(".opt-tab-name")).toHaveText("Pantalla original");

  // cambiar de pestaña restaura el descuento de cada opción
  await page.locator("#opt-bar .opt-tab").nth(0).click();
  await expect(page.locator("#q-discount")).toHaveValue("0");
  await expect(page.locator("#quote-lines .line-item")).toHaveCount(1);
  await page.locator("#opt-bar .opt-tab").nth(1).click();
  await expect(page.locator("#q-discount")).toHaveValue("10");

  // vista previa con las dos opciones y el resumen
  await expect(page.locator("#preview-multi")).toBeVisible();
  await expect(page.locator("#preview-single")).toBeHidden();
  await expect(page.locator("#preview-multi .doc-opcion")).toHaveCount(2);
  await expect(page.locator("#preview-multi .doc-resumen-opciones")).toContainText("$325.000");

  await page.locator("#btn-save-quote").click();
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => JSON.parse(localStorage.getItem("pr_history"))[0]);
  expect(g.opciones).toHaveLength(2);
  expect(g.total).toBe(210000); // lo «de siempre» es la primera opción
  expect(g.opciones[1].total).toBe(325000);
  expect(g.opciones[1].nombre).toBe("Pantalla original");

  // texto de WhatsApp y PDF
  const r = await page.evaluate(() => {
    const doc = window.PedroRoaPdf.createPdfDocument(JSON.parse(localStorage.getItem("pr_history"))[0]);
    return { paginas: doc.getNumberOfPages() };
  });
  expect(r.paginas).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => { window.__abierto = null; window.open = (u) => { window.__abierto = u; return null; }; });
  await page.locator("#btn-send-whatsapp-text").click();
  const texto = decodeURIComponent((await page.evaluate(() => window.__abierto)).split("text=")[1]);
  expect(texto).toContain("OPCIÓN A");
  expect(texto).toContain("OPCIÓN B · PANTALLA ORIGINAL");
  expect(texto).toContain("Total Opción B: $325.000");

  // en el historial se muestra «desde» y la cantidad de opciones
  await page.locator("[data-subview=view-historial]").click();
  await expect(page.locator("#history-list .unified-history-card").first()).toContainText("2 opciones de precio");
  await expect(page.locator("#history-list .unified-history-card").first()).toContainText("$210.000");

  // reabrir la cotización recupera las dos opciones
  await page.locator("#history-list [data-accion=abrir]").first().click();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(2);
  await page.locator("#opt-bar .opt-tab").nth(1).click();
  await expect(page.locator("#q-discount")).toHaveValue("10");
  await expect(page.locator('#quote-lines [data-field="d"]').first()).toHaveValue("Cambio de pantalla original");
});

test("duplicar y quitar una opción; una opción vacía no se puede enviar", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irACotizador(page);
  await lineaLibre(page, "Servicio base", 100000);
  await page.locator('#opt-bar [data-action="add-opt"]').click();
  await page.locator('#opt-bar [data-action="dup-opt"]').click();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(3);

  // B está vacía: no deja guardar/enviar y lleva a esa opción
  await page.locator("#btn-preview-pdf").click();
  await expect(page.locator("#opt-bar .opt-tab.active .opt-tab-letter")).toHaveText("B");
  await expect(page.locator("#toast, .toast").first()).toContainText("no tiene ítems");

  page.on("dialog", (d) => d.accept());
  await page.locator('#opt-bar [data-action="del-opt"]').click();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(2);
  await page.locator('#opt-bar [data-action="del-opt"]').click();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(0);
  await expect(page.locator("#opt-bar .opt-add")).toBeVisible();
});

test("fotos por ítem: máximo 3, se reducen, salen en la vista previa, se guardan y van al PDF", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irACotizador(page);
  await lineaLibre(page, "Memoria RAM 8GB", 120000);

  const fotos = [];
  for (let i = 0; i < 4; i++) fotos.push(await fotoGrande(page, `f${i}.jpg`, ["#b91c1c", "#1d4ed8", "#15803d", "#a16207"][i]));
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.locator('#quote-lines [data-action="add-foto"]').click()]);
  await chooser.setFiles(fotos);
  await expect(page.locator("#quote-lines .line-foto")).toHaveCount(3);
  await expect(page.locator('#quote-lines [data-action="add-foto"]')).toHaveCount(0);
  await expect(page.locator("#preview-table-body .doc-item-fotos img")).toHaveCount(3);

  // pequeñas: lado mayor ≤ 560 px y pocos KB
  const medida = await page.evaluate(async () => {
    const src = document.querySelector("#quote-lines .line-foto img").src;
    const im = new Image(); im.src = src; await im.decode();
    return { lado: Math.max(im.naturalWidth, im.naturalHeight), kb: Math.round(src.length / 1024) };
  });
  expect(medida.lado).toBeLessThanOrEqual(560);
  expect(medida.kb).toBeLessThan(120);

  await page.locator('#quote-lines [data-action="del-foto"]').first().click();
  await expect(page.locator("#quote-lines .line-foto")).toHaveCount(2);

  await page.locator("#btn-save-quote").click();
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("pr_history"))[0]);
  expect(data.items[0].fotos).toHaveLength(2);

  const r = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("pr_history"))[0];
    const conFotos = window.PedroRoaPdf.createPdfDocument(d);
    const sin = window.PedroRoaPdf.createPdfDocument({ ...d, items: d.items.map((i) => ({ ...i, fotos: undefined })) });
    return { con: conFotos.output("arraybuffer").byteLength, sin: sin.output("arraybuffer").byteLength };
  });
  expect(r.con).toBeGreaterThan(r.sin);
});

test("una cotización antigua (sin opciones) se abre como una sola opción y sigue igual", async ({ browser }) => {
  const { page } = await dispositivo(browser, { pr_history: JSON.stringify([cotizacion({ id: ID_A, quoteNumber: "COT-0007", clientName: "Cliente Antiguo" })]) });
  await page.locator("#main-nav [data-nav=cotizaciones]").click();
  await page.locator("[data-subview=view-historial]").click();
  await page.locator("#history-list [data-accion=abrir]").first().click();
  await expect(page.locator("#view-cotizador")).toBeVisible();
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(0);
  await expect(page.locator("#preview-single")).toBeVisible();
  await expect(page.locator("#quote-lines .line-item")).not.toHaveCount(0);
});

test("datos extremos: nombres larguísimos, 6 opciones y celular de 390 px sin desbordar", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irACotizador(page);
  await lineaLibre(page, "Ítem con un nombre larguísimo ".repeat(8), 1234567);
  for (let i = 0; i < 5; i++) {
    await page.locator('#opt-bar [data-action="add-opt"]').click();
    await page.locator("#opt-name").fill("Nombre de opción muy largo número " + i + " ".repeat(2) + "xxxxxxxxxxxxxxxxxxxxxxxxxx");
    await lineaLibre(page, "Otro ítem " + i, 99999999);
  }
  await expect(page.locator("#opt-bar .opt-tab")).toHaveCount(6);
  await expect(page.locator("#opt-bar .opt-add")).toHaveCount(0); // máximo 6
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
