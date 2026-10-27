// Capturas con datos extremos y en tema oscuro: node pruebas/capturas-extremas.cjs <carpeta>
const { chromium, devices } = require("@playwright/test");
const path = require("path");
const BASE = "http://127.0.0.1:8099";
const salida = process.argv[2] || ".impeccable/review/extremos";

const largo = "Inversiones y Comercializadora Internacional de Tecnología Avanzada del Norte y Sur SAS";
const sinCortes = "CorporacionInternacionalDeSuministrosTecnologicosYServiciosIntegralesDelCaribe";
const quote = (id, n, cliente, total, estado, extra = {}) => ({
  id, quoteNumber: "COT-" + String(n).padStart(4, "0"), clientName: cliente, clientPhone: "+57 300 123 4567",
  equipment: extra.equipo || "Impresora", items: Array.from({ length: extra.items || 1 }, (_, i) => ({ q: 1, d: "Servicio " + (i + 1), p: Math.round(total / (extra.items || 1)) })),
  issueDate: "2026-10-20", expireDate: "2026-11-04", subtotal: total, total, status: estado, updatedAt: "2026-10-20T10:00:00.000Z",
});
const datos = [
  quote("11111111-1111-4111-8111-111111111111", 99, largo, 98765432100, "Enviada", { equipo: "Servidor de rack " + largo, items: 14 }),
  quote("22222222-2222-4222-8222-222222222222", 98, sinCortes, 1234567, "Aprobada"),
  quote("33333333-3333-4333-8333-333333333333", 97, "A", 0, "Rechazada"),
  quote("44444444-4444-4444-8444-444444444444", 96, "Ñandú Ünïcode 日本語 😀 اختبار", 50000, "Borrador"),
];

(async () => {
  const browser = await chromium.launch();
  const escenarios = [
    ["movil360-historial", { ...devices["Pixel 7"], viewport: { width: 360, height: 760 } }, "#btn-main-cotizaciones", "view-historial", false, true],
    ["movil-oscuro-inicio", { ...devices["Pixel 7"] }, null, null, true, false],
    ["movil-oscuro-historial", { ...devices["Pixel 7"] }, "#btn-main-cotizaciones", "view-historial", true, false],
    ["movil-oscuro-cotizador", { ...devices["Pixel 7"] }, "#btn-main-cotizaciones", null, true, true],
    ["escritorio-historial", { viewport: { width: 1280, height: 800 } }, "#btn-main-cotizaciones", "view-historial", false, false],
    ["escritorio-oscuro-inicio", { viewport: { width: 1280, height: 800 } }, null, null, true, false],
  ];
  for (const [nombre, vp, boton, sub, oscuro, completa] of escenarios) {
    const ctx = await browser.newContext({ ...vp, baseURL: BASE, serviceWorkers: "block" });
    await ctx.route((u) => /cdn\.jsdelivr\.net|supabase-[\d.]+\.min\.js/.test(u.href), (r) => r.abort());
    await ctx.addInitScript({ path: path.resolve(__dirname, "nube-falsa.js") });
    await ctx.addInitScript(([d, os]) => {
      if (!sessionStorage.getItem("__s")) {
        sessionStorage.setItem("__s", "1");
        localStorage.setItem("pr_history", JSON.stringify(d));
        localStorage.setItem("pr_quote_num", "100");
        if (os) localStorage.setItem("pr_theme", "dark");
      }
    }, [datos, oscuro]);
    const page = await ctx.newPage();
    await page.goto("/index.html");
    await page.waitForFunction(() => /Sincronizado|Conectado/.test(document.getElementById("sync-text")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
    await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}.toast-msg{display:none!important}" });
    if (boton) { await page.locator(boton).click(); await page.waitForTimeout(250); }
    if (sub) { await page.locator(`[data-subview=${sub}]`).click(); await page.waitForTimeout(250); }
    if (nombre.includes("cotizador")) {
      await page.locator("#q-client-name").fill(largo);
      await page.locator("#q-equipment").fill("Equipo " + sinCortes);
      for (let i = 0; i < 3; i++) { await page.locator("#catalog-select").selectOption({ index: 1 + i }); await page.locator("#btn-add-catalog").click(); }
      await page.locator("#quote-lines input[type=number]").first().fill("99999");
      await page.waitForTimeout(300);
    }
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(nombre, "desborde horizontal:", sobra, "px");
    await page.screenshot({ path: `${salida}/${nombre}.png`, fullPage: completa });
    await ctx.close();
  }
  await browser.close();
})();
