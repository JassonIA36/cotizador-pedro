// Capturas para revisión visual: node pruebas/capturas.cjs <carpeta de salida>
const { chromium, devices } = require("@playwright/test");
const path = require("path");
const BASE = "http://127.0.0.1:8099";
const salida = process.argv[2] || ".impeccable/review";
const vistas = [
  ["inicio", null, null],
  ["cotizador", "#btn-main-cotizaciones", null],
  ["historial", "#btn-main-cotizaciones", "view-historial"],
  ["catalogo", "#btn-main-cotizaciones", "view-catalogo"],
  ["config", "#btn-main-cotizaciones", "view-config"],
  ["cobro", "#btn-main-cobro", null],
  ["cobro-historial", "#btn-main-cobro", "view-cobro-historial"],
  ["informe", "#btn-main-informes", null],
];
(async () => {
  const browser = await chromium.launch();
  for (const [nombre, vp] of [["movil", { ...devices["Pixel 7"] }], ["escritorio", { viewport: { width: 1280, height: 800 } }]]) {
   for (const [n, boton, sub] of vistas) {
    const ctx = await browser.newContext({ ...vp, baseURL: BASE, serviceWorkers: "block" });
    await ctx.route((u) => /cdn\.jsdelivr\.net|supabase-[\d.]+\.min\.js/.test(u.href), (r) => r.abort());
    await ctx.addInitScript({ path: path.resolve(__dirname, "nube-falsa.js") });
    await ctx.addInitScript(() => {
      if (!sessionStorage.getItem("__s")) { sessionStorage.setItem("__s", "1"); localStorage.setItem("pr_history", JSON.stringify([
        { id: "11111111-1111-4111-8111-111111111111", quoteNumber: "COT-0012", clientName: "Inversiones Delgado y Asociados SAS", clientPhone: "+57 300 123 4567", equipment: "Impresora Epson L565", items: [{ q: 1, d: "Mantenimiento general", p: 85000 }, { q: 2, d: "Cabezal de impresión", p: 180000 }], issueDate: "2026-10-20", expireDate: "2026-11-04", subtotal: 445000, total: 445000, status: "Enviada", updatedAt: "2026-10-20T10:00:00.000Z" },
        { id: "22222222-2222-4222-8222-222222222222", quoteNumber: "COT-0011", clientName: "Carlos Gómez", equipment: "Portátil Lenovo", items: [{ q: 1, d: "Cambio de pantalla", p: 320000 }], issueDate: "2026-10-18", expireDate: "2026-11-02", subtotal: 320000, total: 320000, status: "Aprobada", updatedAt: "2026-10-18T10:00:00.000Z" },
        { id: "33333333-3333-4333-8333-333333333333", quoteNumber: "COT-0010", clientName: "Ana", equipment: "PC de escritorio", items: [{ q: 1, d: "Formateo", p: 60000 }], issueDate: "2026-10-10", expireDate: "2026-10-25", subtotal: 60000, total: 60000, status: "Borrador", updatedAt: "2026-10-10T10:00:00.000Z" },
      ])); localStorage.setItem("pr_quote_num", "13"); }
    });
    const page = await ctx.newPage();
    await page.goto("/index.html");
    await page.waitForFunction(() => /Sincronizado|Conectado/.test(document.getElementById("sync-text")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
    await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    {
      if (boton) { await page.locator(boton).click(); await page.waitForTimeout(300); }
      if (sub) { await page.locator(`[data-subview=${sub}]`).click(); await page.waitForTimeout(300); }
      await page.screenshot({ path: `${salida}/${nombre}-${n}.png`, fullPage: false });
    }
    await ctx.close();
   }
  }
  await browser.close();
})();
