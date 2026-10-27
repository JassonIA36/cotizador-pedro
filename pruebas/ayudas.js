const path = require("path");
const { devices } = require("@playwright/test");

const BASE = "http://127.0.0.1:8099";
const abiertos = [];

/** Vacía la nube falsa y sus contadores. */
async function reiniciarNube(request) {
  await request.get(BASE + "/__db/reset");
}

async function nube(request) {
  return (await request.get(BASE + "/__db/ver")).json();
}

async function estadisticas(request) {
  return (await request.get(BASE + "/__db/estadisticas")).json();
}

async function comportamiento(request, cambios) {
  await request.post(BASE + "/__db/comportamiento", { data: cambios });
}

/**
 * Abre la app como un dispositivo nuevo e independiente (su propio almacenamiento, como un celular o un PC distintos).
 * `almacen` se siembra en localStorage solo la primera vez, antes de que cargue la app.
 */
async function dispositivo(browser, almacen = {}) {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL: BASE });
  abiertos.push(context);
  await context.route("**/cdn.jsdelivr.net/**", (ruta) => ruta.abort());
  await context.addInitScript({ path: path.resolve(__dirname, "nube-falsa.js") });
  await context.addInitScript((datos) => {
    if (!sessionStorage.getItem("__sembrado")) {
      for (const [k, v] of Object.entries(datos)) localStorage.setItem(k, v);
      sessionStorage.setItem("__sembrado", "1");
    }
  }, almacen);
  const page = await context.newPage();
  await page.goto("/index.html");
  await page.waitForFunction(() => /Sincronizado|Conectado/.test(document.getElementById("sync-text")?.textContent || ""), null, { timeout: 15000 });
  await page.waitForTimeout(800);
  return { context, page };
}

/** Cierra todos los dispositivos abiertos por la prueba, para que no sigan sincronizando en la siguiente. */
async function cerrarDispositivos() {
  for (const c of abiertos.splice(0)) await c.close().catch(() => {});
}

/** Pide una sincronización y espera a que termine. */
async function sincronizar(page, request) {
  const antes = (await estadisticas(request)).descargas;
  await page.evaluate(() => document.getElementById("topbar-sync-btn").click());
  for (let i = 0; i < 60; i++) {
    if ((await estadisticas(request)).descargas > antes) break;
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(900);
}

async function abrirSeccion(page, botonSeccion, subvista) {
  if (await page.locator(botonSeccion).isVisible()) await page.locator(botonSeccion).click();
  await page.locator(`[data-subview=${subvista}]`).click();
  await page.waitForTimeout(250);
}

/** Textos de las tarjetas del historial de cotizaciones. */
async function cotizacionesEnPantalla(page) {
  await abrirSeccion(page, "#btn-main-cotizaciones", "view-historial");
  return page.locator("#history-list .unified-history-card").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
}

/** Textos de las tarjetas del historial de cuentas de cobro. */
async function cuentasEnPantalla(page) {
  await abrirSeccion(page, "#btn-main-cobro", "view-cobro-historial");
  return page.locator("#cc-history-list .unified-history-card").evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, " ")));
}

const ID_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function cotizacion({ id, numero = 7, cliente, total, hora, estado = "Borrador" }) {
  return {
    id,
    quoteNumber: "COT-" + String(numero).padStart(4, "0"),
    businessName: "Pedro Roa",
    clientName: cliente,
    clientPhone: "+57 300 123 4567",
    equipment: "Portátil",
    items: [{ q: 1, d: "Servicio de prueba", p: total }],
    issueDate: "2026-10-20",
    expireDate: "2026-11-04",
    notes: "Garantía 30 días",
    subtotal: total,
    total,
    status: estado,
    updatedAt: hora,
  };
}

function cuentaDeCobro({ id, numero = 2, cliente = "Inversiones Delgado SAS", concepto, monto, hora }) {
  return {
    id,
    cobroNum: numero,
    cobroNumber: String(numero).padStart(3, "0"),
    date: "2026-10-20",
    status: "pendiente",
    clientName: cliente,
    clientNit: "900123456",
    conceptos: [{ desc: concepto, amount: monto }],
    adelantos: [],
    total: monto,
    updatedAt: hora,
  };
}

module.exports = {
  BASE, ID_A, ID_B, reiniciarNube, nube, estadisticas, comportamiento, dispositivo, cerrarDispositivos, sincronizar,
  cotizacionesEnPantalla, cuentasEnPantalla, cotizacion, cuentaDeCobro,
};
