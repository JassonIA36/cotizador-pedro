// Páginas completas de cada vista en celular: node pruebas/capturas-vistas.cjs <carpeta>
const { chromium, devices } = require("@playwright/test");
const path = require("path");
const salida = process.argv[2] || ".impeccable/review/vistas";
const vistas = [
  ["cobro", "cuentas-cobro", "view-cuentas-cobro"], ["cobro-emisor", "cuentas-cobro", "view-cobro-emisor"],
  ["informe", "informes", "view-informe-tecnico"], ["informe-plantillas", "informes", "view-informe-plantillas"],
  ["informe-datos", "informes", "view-informe-datos"], ["catalogo", "cotizaciones", "view-catalogo"],
];
(async () => {
  const b = await chromium.launch();
  for (const [n, sec, sub] of vistas) {
    const ctx = await b.newContext({ ...devices["Pixel 7"], baseURL: "http://127.0.0.1:8099", serviceWorkers: "block" });
    await ctx.route((u) => /cdn\.jsdelivr\.net|supabase-[\d.]+\.min\.js/.test(u.href), (r) => r.abort());
    await ctx.addInitScript({ path: path.resolve(__dirname, "nube-falsa.js") });
    const p = await ctx.newPage();
    await p.goto("/index.html"); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: "*{animation:none!important;transition:none!important}.toast-msg{display:none!important}.main-nav,.mobile-sticky-bar{position:absolute!important}" });
    await p.locator(`#main-nav [data-nav=${sec}]`).click();
    await p.locator(`[data-subview=${sub}]`).click(); await p.waitForTimeout(300);
    for (const [k, y] of [[1, 0], [2, 780], [3, 1560]]) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(120); await p.screenshot({ path: `${salida}/${n}-${k}.png` }); }
    await ctx.close();
  }
  await b.close();
})();
