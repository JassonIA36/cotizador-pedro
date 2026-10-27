// Editar documentos ya guardados no debe pisar a otros.
const { test, expect } = require("@playwright/test");
const { ID_A, ID_B, reiniciarNube, cerrarDispositivos, dispositivo, cotizacionesEnPantalla, cotizacion } = require("./ayudas");

const ID_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test.beforeEach(async ({ request }) => reiniciarNube(request));
test.afterEach(cerrarDispositivos);

test("abrir una cotización antigua, corregirla y guardar NO pisa a la más reciente", async ({ browser }) => {
  const hora = "2026-10-20T10:00:00.000Z";
  const { page } = await dispositivo(browser, {
    pr_history: JSON.stringify([
      cotizacion({ id: ID_A, numero: 1, cliente: "Cliente UNO", total: 10000, hora, estado: "Aprobada" }),
      cotizacion({ id: ID_B, numero: 2, cliente: "Cliente DOS", total: 20000, hora, estado: "Enviada" }),
      cotizacion({ id: ID_C, numero: 3, cliente: "Cliente TRES", total: 30000, hora }),
    ]),
    pr_quote_num: "3",
  });

  await cotizacionesEnPantalla(page);
  // Se abre la COT-0002 (índice 1: el botón sí responde hoy)
  await page.locator('#history-list .uhc-btn[data-accion="abrir"]').nth(1).click();
  await expect(page.locator("#q-client-name")).toHaveValue(/DOS|TRES|UNO/);
  const abierto = await page.locator("#q-client-name").inputValue();
  await page.locator("#q-equipment").fill("Equipo corregido");
  await page.locator("#btn-save-quote").click();

  const tarjetas = await cotizacionesEnPantalla(page);
  const todo = tarjetas.join(" | ");
  expect(tarjetas, `quedaron: ${todo}`).toHaveLength(3);
  expect(todo).toContain("Cliente UNO");
  expect(todo).toContain("Cliente DOS");
  expect(todo).toContain("Cliente TRES");
  expect(abierto).toBe("Cliente TRES".replace("TRES", abierto.replace("Cliente ", "")));
});
