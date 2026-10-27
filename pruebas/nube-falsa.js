// Imita la parte de supabase-js que usa la app (auth + tabla `registros`) contra el servidor de pruebas.
(() => {
  const BASE = location.origin + "/__db";
  const usuario = { id: "usuario-de-prueba", email: "prueba@local.test" };
  const oyentesDeSesion = [];
  const control = { sinSesion: false };

  function consulta() {
    const q = { cols: null, tipos: null, ids: null, de: 0, a: 99999 };
    const api = {
      select(cols) { q.cols = cols || null; return api; },
      order() { return api; },
      range(a, b) { q.de = a; q.a = b; return api; },
      in(columna, valores) { if (columna === "id") q.ids = valores; else q.tipos = valores; return api; },
      then(ok, mal) {
        const p = new URLSearchParams({ from: String(q.de), to: String(q.a) });
        if (q.cols) p.set("cols", q.cols.replace(/\s+/g, ""));
        if (q.tipos) p.set("tipos", q.tipos.join(","));
        if (q.ids) p.set("ids", q.ids.join(","));
        return fetch(BASE + "?" + p.toString())
          .then(async (r) => (r.ok ? { data: await r.json(), error: null } : { data: null, error: { message: "Server error " + r.status } }))
          .then(ok, mal);
      },
      upsert(filas) {
        return fetch(BASE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(filas) })
          .then((r) => (r.ok ? { error: null } : { error: { message: "Server error " + r.status } }));
      },
    };
    return api;
  }

  const cliente = {
    from: consulta,
    auth: {
      getSession: async () => ({ data: { session: control.sinSesion ? null : { user: usuario } }, error: null }),
      onAuthStateChange: (fn) => { oyentesDeSesion.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async () => { control.sinSesion = false; return { data: { user: usuario }, error: null }; },
      signOut: async () => ({ error: null }),
    },
  };

  window.supabase = { createClient: () => cliente };
  // Para las pruebas: simula que la sesión venció
  window.__nube = {
    vencerSesion() { control.sinSesion = true; oyentesDeSesion.forEach((fn) => fn("SIGNED_OUT", null)); },
  };
})();
