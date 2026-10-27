// Rediseño: navegación, tema, historial compacto y datos extremos sin romper la pantalla.
const { test, expect } = require("@playwright/test");
const { reiniciarNube, cerrarDispositivos, dispositivo, cotizacion, ID_A, ID_B } = require("./ayudas");

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

test("la barra inferior lleva a cada módulo y marca dónde estás", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  const nav = page.locator("#main-nav");
  await expect(nav.locator('[data-nav=inicio]')).toHaveAttribute("aria-current", "page");

  await nav.locator('[data-nav=cuentas-cobro]').click();
  await expect(page.locator("#view-cuentas-cobro")).toBeVisible();
  await expect(nav.locator('[data-nav=cuentas-cobro]')).toHaveAttribute("aria-current", "page");

  await nav.locator('[data-nav=informes]').click();
  await expect(page.locator("#view-informe-tecnico")).toBeVisible();

  await nav.locator('[data-nav=cotizaciones]').click();
  await expect(page.locator("#view-cotizador")).toBeVisible();

  await nav.locator('[data-nav=inicio]').click();
  await expect(page.locator("#view-main-menu")).toBeVisible();
});

test("arranca en tema claro y el oscuro se recuerda", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBeNull();
  await page.locator("#theme-toggle").click();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
});

test("la barra de tintas de la cabecera refleja el estado de la sincronización", async ({ browser }) => {
  const { page } = await dispositivo(browser, {});
  const opacidad = (n) => page.evaluate((i) => getComputedStyle(document.querySelectorAll(".cmyk-bar i")[i]).opacity, n);
  await page.evaluate(() => { document.getElementById("sync-dot").className = "sync-dot pending"; });
  await page.waitForTimeout(400);
  expect(Number(await opacidad(0))).toBeLessThan(0.5); // cian apagado
  expect(Number(await opacidad(2))).toBe(1); // solo el amarillo queda encendido
  await page.evaluate(() => { document.getElementById("sync-dot").className = "sync-dot synced"; });
  await page.waitForTimeout(400);
  expect(Number(await opacidad(0))).toBe(1);
});

test("en el historial solo se ven las acciones principales y «Más opciones» muestra el resto", async ({ browser }) => {
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([cotizacion({ id: ID_A, numero: 1, cliente: "Carlos Gómez", total: 70000, hora: "2026-09-28T10:00:00.000Z" })]),
    pr_quote_num: "1",
  });
  await page.locator("#main-nav [data-nav=cotizaciones]").click();
  await page.locator("[data-subview=view-historial]").click();
  const tarjeta = page.locator("#history-list .unified-history-card");
  await expect(tarjeta.locator('.uhc-btn[data-accion="abrir"]')).toBeVisible();
  await expect(tarjeta.locator('.uhc-btn[data-accion="whatsapp"]')).toBeVisible();
  await expect(tarjeta.locator('.uhc-btn[data-accion="eliminar"]')).toBeHidden();
  await tarjeta.locator("summary").click();
  await expect(tarjeta.locator('.uhc-btn[data-accion="eliminar"]')).toBeVisible();
});

test("nombres larguísimos, importes enormes y 360 px de ancho no desbordan la pantalla", async ({ browser }) => {
  const largo = "Inversiones y Comercializadora Internacional de Tecnología Avanzada del Norte y Sur SAS";
  const sinCortes = "CorporacionInternacionalDeSuministrosTecnologicosYServiciosIntegralesDelCaribe";
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([
      cotizacion({ id: ID_A, numero: 1, cliente: largo, total: 98765432100, hora: "2026-09-28T10:00:00.000Z", estado: "Enviada" }),
      cotizacion({ id: ID_B, numero: 2, cliente: sinCortes, total: 1234567, hora: "2026-09-29T10:00:00.000Z", estado: "Aprobada" }),
    ]),
    pr_quote_num: "3",
  });
  await page.setViewportSize({ width: 360, height: 760 });
  for (const sub of ["view-historial", "view-cotizador", "view-catalogo", "view-config"]) {
    if (sub === "view-historial") await page.locator("#main-nav [data-nav=cotizaciones]").click();
    await page.locator(`[data-subview=${sub}]`).click();
    await page.waitForTimeout(250);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, `desborde horizontal en ${sub}`).toBeLessThanOrEqual(0);
  }
  await page.locator("[data-subview=view-cotizador]").click();
  await page.locator("#q-client-name").fill(largo);
  await page.locator("#q-equipment").fill("Equipo " + sinCortes);
  await page.locator("#catalog-select").selectOption({ index: 1 });
  await page.locator("#btn-add-catalog").click();
  await page.locator("#quote-lines input[type=number]").first().fill("99999");
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra, "desborde con importes enormes").toBeLessThanOrEqual(0);
});
