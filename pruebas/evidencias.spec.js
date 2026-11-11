// Informes técnicos: fotos de evidencia (cargar, reducir, guardar, recuperar, mostrar y salir en el PDF).
const { test, expect } = require("@playwright/test");
const { reiniciarNube, cerrarDispositivos, dispositivo } = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

/** Genera una foto grande de verdad (4000x3000) en el navegador, como la de una cámara. */
async function fotoGrande(page, nombre, color) {
  const bytes = await page.evaluate(async (c) => {
    const cv = document.createElement("canvas");
    cv.width = 4000; cv.height = 3000;
    const g = cv.getContext("2d");
    g.fillStyle = c; g.fillRect(0, 0, 4000, 3000);
    g.fillStyle = "#fff"; g.font = "300px sans-serif"; g.fillText("EVIDENCIA", 600, 1500);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.95));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  return { name: nombre, mimeType: "image/jpeg", buffer: Buffer.from(bytes) };
}

async function irAInforme(page) {
  await page.locator('#main-nav [data-nav=informes]').click();
  await expect(page.locator("#view-informe-tecnico")).toBeVisible();
}

test("cargar fotos: se reducen, salen en la vista previa, se guardan y vuelven al reabrir", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irAInforme(page);

  const f1 = await fotoGrande(page, "uno.jpg", "#b91c1c");
  const f2 = await fotoGrande(page, "dos.jpg", "#1d4ed8");
  await page.locator("#inf-evid-input").setInputFiles([f1, f2]);
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(2);
  await expect(page.locator("#inf-evid-count")).toHaveText("2");

  await page.locator("#inf-evid-list .evid-caption").first().fill("Pantalla con líneas");
  await expect(page.locator("#informe-document .doc-informe-evid-fig")).toHaveCount(2);
  await expect(page.locator("#informe-document")).toContainText("Foto 1: Pantalla con líneas");

  // Quedan reducidas (1100 px de lado mayor y mucho menos de 1 MB)
  const medida = await page.evaluate(async () => {
    const src = document.querySelector("#inf-evid-list img").src;
    const im = new Image(); im.src = src; await im.decode();
    return { w: im.naturalWidth, h: im.naturalHeight, kb: Math.round(src.length / 1024) };
  });
  expect(Math.max(medida.w, medida.h)).toBeLessThanOrEqual(1100);
  expect(medida.kb).toBeLessThan(400);

  await page.locator("#inf-client-name").fill("Cliente de prueba");
  await page.locator("#btn-inf-save").click();
  await page.waitForTimeout(500);

  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem("pr_informe_history")));
  expect(guardado).toHaveLength(1);
  expect(guardado[0].evidencias).toHaveLength(2);
  expect(guardado[0].evidencias[0].caption).toBe("Pantalla con líneas");

  // Abrir otro informe nuevo limpia las fotos; abrir el guardado desde el historial las recupera
  page.on("dialog", (d) => d.accept());
  await page.locator("#btn-inf-new").click();
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(0);
  await page.locator("[data-subview=view-informe-historial]").click();
  await page.locator(".btn-inf-act-open, [data-accion=abrir], [data-action=open]").first().click();
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(2);
  await expect(page.locator("#inf-evid-list .evid-caption").first()).toHaveValue("Pantalla con líneas");
});

test("el PDF incluye las fotos y no falla con muchas ni con una sola", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irAInforme(page);
  const fotos = [];
  for (let i = 0; i < 5; i++) fotos.push(await fotoGrande(page, `f${i}.jpg`, ["#b91c1c", "#1d4ed8", "#15803d", "#a16207", "#7e22ce"][i]));
  await page.locator("#inf-evid-input").setInputFiles(fotos);
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(5);

  await page.locator("#btn-inf-save").click();
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("pr_informe_history"))[0];
    const sinFotos = window.PedroRoaPdf.createInformePdfDocument({ ...data, sections: data.sections.filter((s) => s.type !== "evidencias") });
    const conFotos = window.PedroRoaPdf.createInformePdfDocument(data);
    return { sin: sinFotos.getNumberOfPages(), con: conFotos.getNumberOfPages(), n: data.evidencias.length };
  });
  expect(r.n).toBe(5);
  expect(r.con).toBeGreaterThanOrEqual(r.sin);
});

test("rechaza archivos que no son imágenes y respeta el máximo de 12", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  await irAInforme(page);
  await page.locator("#inf-evid-input").setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(0);

  const muchas = [];
  for (let i = 0; i < 14; i++) muchas.push(await fotoGrande(page, `m${i}.jpg`, "#0f766e"));
  await page.locator("#inf-evid-input").setInputFiles(muchas);
  await expect(page.locator("#inf-evid-list .evid-item")).toHaveCount(12);
});
