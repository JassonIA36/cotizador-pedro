/**
 * Almacén de datos a prueba de fallos.
 *
 * - localStorage sigue siendo el almacén principal, con las mismas claves `pr_*` de siempre:
 *   los datos que ya hay en el teléfono se leen igual que antes.
 * - Cada escritura se copia también a IndexedDB, que no tiene el tope de ~5 MB de localStorage.
 * - Si localStorage no deja guardar (lleno o bloqueado), el dato queda en IndexedDB, se avisa en
 *   pantalla y, al volver a abrir la app, se recupera de ahí. Antes el error se ignoraba y la app
 *   decía «guardada» sin haber guardado nada.
 * - Si localStorage pierde datos (limpieza del navegador), se restauran desde la copia.
 */
(function () {
  'use strict';

  var NOMBRE_DB = 'pr-respaldo';
  var TABLA = 'kv';
  var PREFIJO = 'pr_';

  var memoria = new Map();        // valores de esta sesión (null = borrado)
  var soloRespaldo = new Set();   // claves que no cupieron en localStorage
  var pendientes = new Map();     // copias a IndexedDB por escribir
  var temporizador = null;
  var db = null;
  var estado = { fallo: false, sinRespaldo: false, claves: [] };
  var oyentes = [];

  // ---------------------------------------------------------------- IndexedDB
  function abrir() {
    return new Promise(function (ok) {
      try {
        if (!window.indexedDB) return ok(null);
        var peticion = indexedDB.open(NOMBRE_DB, 1);
        peticion.onupgradeneeded = function () {
          peticion.result.createObjectStore(TABLA, { keyPath: 'k' });
        };
        peticion.onsuccess = function () { ok(peticion.result); };
        peticion.onerror = function () { ok(null); };
        peticion.onblocked = function () { ok(null); };
      } catch (e) {
        ok(null);
      }
    });
  }

  function leerTodo() {
    return new Promise(function (ok) {
      try {
        var tx = db.transaction(TABLA, 'readonly');
        var pedido = tx.objectStore(TABLA).getAll();
        pedido.onsuccess = function () { ok(pedido.result || []); };
        pedido.onerror = function () { ok([]); };
      } catch (e) {
        ok([]);
      }
    });
  }

  function escribir(registros) {
    if (!db || registros.length === 0) return;
    try {
      var tx = db.transaction(TABLA, 'readwrite');
      var tabla = tx.objectStore(TABLA);
      registros.forEach(function (r) {
        if (r.borrar) tabla.delete(r.k);
        else tabla.put({ k: r.k, v: r.v, solo: !!r.solo, ts: Date.now() });
      });
    } catch (e) {
      /* la copia es un extra: si falla, localStorage sigue funcionando */
    }
  }

  function vaciarPendientes() {
    temporizador = null;
    var lista = Array.from(pendientes.values());
    pendientes.clear();
    escribir(lista);
  }

  function encolar(registro) {
    pendientes.set(registro.k, registro);
    if (!temporizador) temporizador = setTimeout(vaciarPendientes, 150);
  }

  // ------------------------------------------------------------------- aviso
  function textoAviso() {
    if (estado.sinRespaldo) {
      return '🔴 No se puede guardar en este teléfono. Lo que hagas ahora se perderá al cerrar la app. Descarga un respaldo y libera espacio.';
    }
    return '⚠️ Este teléfono no deja guardar más en la app. Tus cambios se están guardando en una copia interna. Libera espacio en el teléfono o descarga un respaldo.';
  }

  function mostrarAviso() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', mostrarAviso, { once: true });
      return;
    }
    var el = document.getElementById('pr-aviso-almacen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pr-aviso-almacen';
      el.className = 'aviso-almacen';
      el.setAttribute('role', 'alert');
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.textContent = textoAviso();
  }

  function marcarFallo(clave) {
    if (estado.claves.indexOf(clave) < 0) estado.claves.push(clave);
    estado.fallo = true;
    estado.sinRespaldo = !db;
    mostrarAviso();
    oyentes.forEach(function (fn) { try { fn(estado); } catch (e) { /* un oyente roto no debe afectar */ } });
  }

  // ----------------------------------------------------------------- lectura
  function leerLocal(clave) {
    try { return window.localStorage.getItem(clave); } catch (e) { return null; }
  }

  function get(clave) {
    if (memoria.has(clave)) return memoria.get(clave);
    return leerLocal(clave);
  }

  // --------------------------------------------------------------- escritura
  function set(clave, valor) {
    memoria.set(clave, valor);
    var guardado = false;
    try {
      window.localStorage.setItem(clave, valor);
      guardado = true;
    } catch (e) {
      guardado = false;
    }
    if (guardado) {
      soloRespaldo.delete(clave);
      encolar({ k: clave, v: valor, solo: false });
    } else {
      // No cabe o está bloqueado: la copia interna es ahora la única, así que se escribe de inmediato.
      soloRespaldo.add(clave);
      marcarFallo(clave);
      pendientes.delete(clave);
      escribir([{ k: clave, v: valor, solo: true }]);
    }
  }

  function remove(clave) {
    memoria.set(clave, null);
    soloRespaldo.delete(clave);
    try { window.localStorage.removeItem(clave); } catch (e) { /* nada que quitar */ }
    encolar({ k: clave, borrar: true });
  }

  // -------------------------------------------------------------- arranque
  function copiarTodoAlRespaldo() {
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var clave = window.localStorage.key(i);
        if (clave && clave.indexOf(PREFIJO) === 0 && !pendientes.has(clave)) {
          encolar({ k: clave, v: window.localStorage.getItem(clave), solo: soloRespaldo.has(clave) });
        }
      }
    } catch (e) { /* sin acceso a localStorage: nada que copiar */ }
  }

  /** Restaura desde la copia interna lo que localStorage no tenga o no haya podido guardar. */
  function hidratar() {
    var limite = new Promise(function (ok) { setTimeout(ok, 2500); });
    var trabajo = abrir().then(function (conexion) {
      db = conexion;
      if (!db) return null;
      return leerTodo().then(function (registros) {
        registros.forEach(function (r) {
          var enLocal = leerLocal(r.k);
          if (r.solo) {
            // La última vez no cupo en localStorage: la copia interna manda. Se reintenta guardarlo.
            memoria.set(r.k, r.v);
            try {
              window.localStorage.setItem(r.k, r.v);
              escribir([{ k: r.k, v: r.v, solo: false }]);
            } catch (e) {
              soloRespaldo.add(r.k);
              marcarFallo(r.k);
            }
          } else if (enLocal === null) {
            // localStorage perdió el dato (limpieza del navegador): se restaura desde la copia.
            memoria.set(r.k, r.v);
            try { window.localStorage.setItem(r.k, r.v); } catch (e) { soloRespaldo.add(r.k); marcarFallo(r.k); }
          }
        });
      });
    }).catch(function () { /* sin copia interna: se sigue con localStorage */ });

    return Promise.race([trabajo, limite]).then(function () {
      setTimeout(copiarTodoAlRespaldo, 3000);
      try {
        // Pide al navegador que no borre estos datos si se queda sin espacio.
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      } catch (e) { /* no es esencial */ }
    });
  }

  window.addEventListener('pagehide', vaciarPendientes);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') vaciarPendientes();
  });

  window.PRAlmacen = {
    get: get,
    set: set,
    remove: remove,
    hidratar: hidratar,
    estado: estado,
    alFallo: function (fn) { oyentes.push(fn); },
  };
})();
