// Servidor de pruebas: sirve la app (solo lectura) y una «nube» falsa en memoria (/__db) que imita la tabla `registros`.
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const PUBLICO = new Set(["index.html", "sw.js", "manifest.webmanifest"]);
const CARPETAS = ["assets", "css", "js", "pruebas"];
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };

let filas = [];
const ceros = () => ({ descargas: 0, filasDescargadas: 0, filasConDatos: 0, bytesDescargados: 0, subidas: 0, filasSubidas: 0 });
const estadisticas = ceros();
const comportamiento = { falla: false, latenciaMs: 0 };

const leerCuerpo = (req) => new Promise((ok) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => ok(d)); });
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const json = (res, obj, estado = 200) => { res.writeHead(estado, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const ruta = url.pathname;

  if (ruta === "/__db") {
    if (comportamiento.latenciaMs) await esperar(comportamiento.latenciaMs);
    if (req.method === "POST") {
      if (comportamiento.falla) return json(res, { message: "fallo simulado" }, 500);
      const nuevas = JSON.parse(await leerCuerpo(req));
      for (const f of nuevas) {
        const fila = { id: f.id, tipo: f.tipo, datos: f.datos, deleted: !!f.deleted, updated_at: f.updated_at };
        const i = filas.findIndex((x) => x.id === f.id);
        if (i >= 0) filas[i] = fila; else filas.push(fila);
      }
      estadisticas.subidas++;
      estadisticas.filasSubidas += nuevas.length;
      return json(res, {});
    }
    if (comportamiento.falla) return json(res, { message: "fallo simulado" }, 500);

    const tipos = url.searchParams.get("tipos");
    const ids = url.searchParams.get("ids");
    const columnas = (url.searchParams.get("cols") || "").split(",").filter((c) => c && c !== "*");
    const de = Number(url.searchParams.get("from")) || 0;
    const a = Number(url.searchParams.get("to")) || 99999;

    let r = filas.slice().sort((x, y) => String(y.updated_at).localeCompare(String(x.updated_at)));
    if (tipos) r = r.filter((x) => tipos.split(",").includes(x.tipo));
    if (ids) r = r.filter((x) => ids.split(",").includes(x.id));
    r = r.slice(de, a + 1);

    const salida = columnas.length ? r.map((x) => Object.fromEntries(columnas.filter((c) => c in x).map((c) => [c, x[c]]))) : r;
    estadisticas.descargas++;
    estadisticas.filasDescargadas += r.length;
    if (!columnas.length || columnas.includes("datos")) estadisticas.filasConDatos += r.length;
    estadisticas.bytesDescargados += Buffer.byteLength(JSON.stringify(salida));
    return json(res, salida);
  }
  if (ruta === "/__db/ver") return json(res, filas);
  if (ruta === "/__db/estadisticas") return json(res, estadisticas);
  if (ruta === "/__db/reset") { filas = []; Object.assign(estadisticas, ceros()); Object.assign(comportamiento, { falla: false, latenciaMs: 0 }); return json(res, "ok"); }
  if (ruta === "/__db/comportamiento") { Object.assign(comportamiento, JSON.parse(await leerCuerpo(req))); return json(res, comportamiento); }

  let rel = decodeURIComponent(ruta).replace(/^\/+/, "") || "index.html";
  const primera = rel.split("/")[0];
  if (!PUBLICO.has(rel) && !CARPETAS.includes(primera)) { res.writeHead(404); return res.end("no encontrado"); }
  const archivo = path.resolve(RAIZ, rel);
  if (!archivo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (e, d) => {
    if (e) { res.writeHead(404); return res.end("no encontrado"); }
    res.writeHead(200, { "content-type": TIPOS[path.extname(archivo)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(d);
  });
}).listen(8099, "127.0.0.1", () => console.log("servidor de pruebas listo en 8099"));
