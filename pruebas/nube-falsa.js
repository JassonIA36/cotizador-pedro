// Imita la parte de supabase-js que usa la app (auth + tabla `registros`) contra el servidor de pruebas.
(() => {
  const BASE = location.origin + "/__db";
  const usuario = { id: "usuario-de-prueba", email: "prueba@local.test" };

  function consulta() {
    const q = { tipos: null, de: 0, a: 99999, desde: null };
    const api = {
      select() { return api; },
      order() { return api; },
      range(a, b) { q.de = a; q.a = b; return api; },
      in(_columna, valores) { q.tipos = valores; return api; },
      gt(_columna, valor) { q.desde = valor; return api; },
      then(ok, mal) {
        const url = BASE + "?from=" + q.de + "&to=" + q.a + (q.tipos ? "&tipos=" + q.tipos.join(",") : "") + (q.desde ? "&desde=" + encodeURIComponent(q.desde) : "");
        return fetch(url)
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
      getSession: async () => ({ data: { session: { user: usuario } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { user: usuario }, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
  window.supabase = { createClient: () => cliente };
})();
