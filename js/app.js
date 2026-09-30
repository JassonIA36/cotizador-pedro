/**
 * Cotizador Pedro Roa - Core Application Logic & Supabase Sync
 */

// Supabase Configuration
const SUPABASE_URL = "https://shzyqffmovlrpsndyfer.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6PcKQ0q8B8dKG-enbClDGg_pYDPwwtG";

(function () {
  'use strict';

  // --- Initial Default Catalog ---
  const DEFAULT_CATALOG = [
    { c: "Mantenimiento", n: "Mantenimiento preventivo PC escritorio", p: 50000 },
    { c: "Mantenimiento", n: "Mantenimiento portátil (pasta térmica + limpieza)", p: 70000 },
    { c: "Mantenimiento", n: "Mantenimiento preventivo impresora", p: 45000 },
    { c: "Reparación", n: "Formateo + Windows + Programas básicos", p: 45000 },
    { c: "Reparación", n: "Cambio de pasta térmica alta conductividad (Thermal Grizzly/Arctic)", p: 35000 },
    { c: "Reparación", n: "Cambio de pantalla portátil (Mano de obra)", p: 70000 },
    { c: "Reparación", n: "Diagnóstico especializado de hardware", p: 25000 },
    { c: "Reparación", n: "Limpieza y desensamble de tarjeta de video GPU", p: 80000 },
    { c: "Ensamble PC", n: "Mano de obra ensamble Custom PC Gaming / Workstation", p: 120000 },
    { c: "Ensamble PC", n: "PC Oficina Básica Core i5 / 16GB RAM / SSD 512GB", p: 1350000 },
    { c: "Ensamble PC", n: "PC Gamer Ryzen 5 5600 / RTX 3060 / 16GB / SSD 1TB", p: 3100000 },
    { c: "Ensamble PC", n: "Portátil Asus / Lenovo Ryzen 5 / 8GB / 512GB SSD", p: 1850000 },
    { c: "Repuestos y Upgrades", n: "Unidad SSD 480GB / 512GB SATA III", p: 140000 },
    { c: "Repuestos y Upgrades", n: "Unidad SSD 1TB NVMe M.2 PCIe Gen4", p: 260000 },
    { c: "Repuestos y Upgrades", n: "Memoria RAM DDR4 8GB 3200MHz", p: 95000 },
    { c: "Repuestos y Upgrades", n: "Memoria RAM DDR4 16GB 3200MHz", p: 175000 },
    { c: "Repuestos y Upgrades", n: "Fuente de poder certificada 600W 80 Plus Bronze", p: 210000 },
    { c: "Impresoras", n: "Impresora Multifuncional Epson EcoTank L3250", p: 780000 },
    { c: "Impresoras", n: "Juego de tintas originales 4 colores", p: 130000 }
  ];

  // --- Clave fija para el catálogo en localStorage ---
  const CATALOG_STORAGE_KEY = 'pr_catalog';

  // Helper storage functions con try/catch para evitar errores si el almacenamiento está bloqueado
  function loadCatalogFromStorage() {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      if (stored !== null && stored !== undefined) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('No se pudo leer el catálogo de localStorage:', e);
    }
    // Solo si no hay nada guardado en localStorage, se usa el catálogo de ejemplo
    // Se retorna una copia para no mutar el array original
    return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
  }

  function saveCatalogToStorage(catalog) {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
    } catch (e) {
      console.warn('No se pudo guardar el catálogo en localStorage:', e);
    }
  }

  // --- Estado de la vista previa de factura (Plegar / Desplegar) ---
  const PREVIEW_COLLAPSE_KEY = 'pr_preview_collapsed';

  function getPreviewCollapsed() {
    try {
      const val = localStorage.getItem(PREVIEW_COLLAPSE_KEY);
      // Por defecto empieza desplegada (retorna false si no hay nada guardado)
      return val === 'true';
    } catch (e) {
      console.warn('No se pudo leer el estado de la vista previa:', e);
      return false;
    }
  }

  function setPreviewCollapsed(collapsed) {
    try {
      localStorage.setItem(PREVIEW_COLLAPSE_KEY, collapsed ? 'true' : 'false');
    } catch (e) {
      console.warn('No se pudo guardar el estado de la vista previa:', e);
    }
  }

  function updatePreviewCollapseUI(isCollapsed) {
    const container = $('preview-collapsible');
    const btn = $('btn-toggle-preview');
    const txt = $('preview-toggle-text');
    const icon = $('preview-toggle-icon');

    if (!container) return;

    if (isCollapsed) {
      container.classList.add('is-collapsed');
      if (btn) {
        btn.classList.add('is-collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }
      if (txt) txt.textContent = 'Mostrar vista previa';
      if (icon) icon.textContent = '▼';
    } else {
      container.classList.remove('is-collapsed');
      if (btn) {
        btn.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded', 'true');
      }
      if (txt) txt.textContent = 'Ocultar vista previa';
      if (icon) icon.textContent = '▲';
    }
  }

  function togglePreviewCollapse() {
    const container = $('preview-collapsible');
    if (!container) return;
    const willCollapse = !container.classList.contains('is-collapsed');
    updatePreviewCollapseUI(willCollapse);
    setPreviewCollapsed(willCollapse);
  }

  function getStorage(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // ==========================================================================
  // SUPABASE CLOUD SYNC ENGINE (Offline-First, Realtime & Multi-Dispositivo)
  // ==========================================================================

  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function isValidUUID(str) {
    return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  function ensureItemUuid(item) {
    if (!item) return '';
    if (!item.id || !isValidUUID(item.id)) {
      item.id = generateUUID();
    }
    if (!item.updatedAt) {
      item.updatedAt = new Date().toISOString();
    }
    return item.id;
  }

  function getConfigId() {
    let id = getStorage('pr_config_uuid', null);
    if (!id || !isValidUUID(id)) {
      id = generateUUID();
      setStorage('pr_config_uuid', id);
    }
    return id;
  }

  function getConsecutivoId() {
    let id = getStorage('pr_consecutivo_uuid', null);
    if (!id || !isValidUUID(id)) {
      id = generateUUID();
      setStorage('pr_consecutivo_uuid', id);
    }
    return id;
  }

  function getTombstones() {
    return getStorage('pr_deleted_records', {});
  }

  function recordTombstone(id, tipo) {
    if (!id) return;
    const tombs = getTombstones();
    tombs[id] = { id, tipo, deleted: true, updated_at: new Date().toISOString() };
    setStorage('pr_deleted_records', tombs);
    markSyncPending();
  }

  function cleanLocalTombstones(cloudMap) {
    try {
      const tombs = getTombstones();
      let changed = false;
      Object.keys(tombs).forEach(id => {
        const cloudRec = cloudMap.get(id);
        if (cloudRec && cloudRec.deleted === true) {
          delete tombs[id];
          changed = true;
        }
      });
      if (changed) {
        setStorage('pr_deleted_records', tombs);
      }
    } catch (e) {
      console.warn('Error limpiando marcas de borrado:', e);
    }
  }

  const syncState = {
    client: null,
    user: null,
    status: 'no-auth',
    statusMessage: 'Modo local listo',
    lastSyncTime: getStorage('pr_sync_last_time', null),
    pendingChanges: getStorage('pr_sync_pending', false),
    isSyncing: false,
    debounceTimer: null
  };

  function markSyncPending() {
    syncState.pendingChanges = true;
    setStorage('pr_sync_pending', true);
    if (syncState.user && navigator.onLine && syncState.status !== 'syncing') {
      setSyncStatus('pending', 'Pendiente de sincronizar');
    }
  }

  function formatSyncTime(dateVal) {
    if (!dateVal) return 'Nunca';
    try {
      const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
      if (isNaN(d.getTime())) return 'Nunca';
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    } catch (e) {
      return 'Nunca';
    }
  }

  function setSyncStatus(status, message) {
    syncState.status = status;
    syncState.statusMessage = message;
    updateSyncUI();
  }

  function updateSyncUI() {
    try {
      const dot = $('sync-dot');
      const txt = $('sync-text');
      const topbarBtn = $('topbar-sync-btn');

      if (dot && txt) {
        dot.className = `sync-dot ${syncState.status}`;

        if (!navigator.onLine) {
          txt.textContent = 'Sin conexión · Modo local activo';
        } else if (!syncState.user) {
          txt.textContent = 'Modo local · Iniciar sesión para sincronizar';
        } else if (syncState.status === 'syncing') {
          txt.textContent = 'Sincronizando datos...';
        } else if (syncState.status === 'synced') {
          txt.textContent = `Sincronizado (${formatSyncTime(syncState.lastSyncTime)})`;
        } else if (syncState.status === 'pending') {
          txt.textContent = 'Pendiente de sincronizar';
        } else if (syncState.status === 'error') {
          txt.textContent = 'Error de sincronización · Modo local seguro';
        } else {
          txt.textContent = syncState.statusMessage || 'Modo local activo';
        }
      }

      if (topbarBtn) {
        if (!syncState.user) {
          topbarBtn.title = 'Modo local (Sin cuenta). Toca aquí para iniciar sesión y sincronizar.';
        } else {
          topbarBtn.title = `Cuenta: ${syncState.user.email} · Estado: ${syncState.statusMessage || syncState.status}. Toca para sincronizar.`;
        }
      }

      const emailEls = document.querySelectorAll('.sync-user-email-text');
      emailEls.forEach(el => {
        el.textContent = syncState.user ? syncState.user.email : 'No has iniciado sesión';
      });

      const detailEls = document.querySelectorAll('.sync-status-detail-text');
      detailEls.forEach(el => {
        if (!navigator.onLine) {
          el.textContent = 'Sin conexión (Modo local activo)';
        } else if (!syncState.user) {
          el.textContent = 'Modo local (Sin sesión iniciada)';
        } else if (syncState.status === 'syncing') {
          el.textContent = 'Sincronizando ahora...';
        } else if (syncState.status === 'synced') {
          el.textContent = '🟢 Todo sincronizado con la nube';
        } else if (syncState.status === 'pending') {
          el.textContent = '🟡 Cambios pendientes por subir';
        } else if (syncState.status === 'error') {
          el.textContent = '🔴 ' + (syncState.statusMessage || 'Error al conectar');
        } else {
          el.textContent = syncState.statusMessage || 'Listo';
        }
      });

      const timeEls = document.querySelectorAll('.sync-last-time-text');
      timeEls.forEach(el => {
        el.textContent = formatSyncTime(syncState.lastSyncTime);
      });

      const badgeEls = document.querySelectorAll('.sync-status-badge');
      badgeEls.forEach(badge => {
        let badgeClass = 'card-badge sync-status-badge';
        let badgeText = 'Modo local';

        if (!navigator.onLine) {
          badgeClass += ' badge-offline';
          badgeText = 'Sin conexión';
        } else if (!syncState.user) {
          badgeClass += ' badge-auth';
          badgeText = 'Sin cuenta';
        } else if (syncState.status === 'syncing') {
          badgeClass += ' badge-syncing';
          badgeText = 'Sincronizando...';
        } else if (syncState.status === 'synced') {
          badgeClass += ' badge-synced';
          badgeText = 'Sincronizado';
        } else if (syncState.status === 'pending') {
          badgeClass += ' badge-pending';
          badgeText = 'Pendiente';
        } else if (syncState.status === 'error') {
          badgeClass += ' badge-error';
          badgeText = 'Error';
        }
        badge.className = badgeClass;
        badge.textContent = badgeText;
      });

      const headerAuthBtn = $('btn-header-auth');
      if (headerAuthBtn) {
        if (syncState.user) {
          headerAuthBtn.style.display = 'inline-flex';
          headerAuthBtn.innerHTML = '🚪 <span class="header-auth-label">Cerrar sesión</span>';
          headerAuthBtn.title = `Cerrar sesión (${syncState.user.email})`;
        } else {
          headerAuthBtn.style.display = 'none';
        }
      }

      const authBtns = document.querySelectorAll('.btn-trigger-auth:not(#btn-header-auth)');
      authBtns.forEach(btn => {
        if (syncState.user) {
          btn.innerHTML = '🚪 Cerrar sesión';
          btn.className = 'btn-danger btn-trigger-auth';
          btn.title = 'Cerrar sesión en este dispositivo (los datos locales se conservan)';
        } else {
          btn.innerHTML = '🔑 Iniciar sesión';
          btn.className = 'btn-secondary btn-trigger-auth';
          btn.title = 'Iniciar sesión para sincronizar datos con tu celular y otros dispositivos';
        }
      });

      const icons = document.querySelectorAll('.sync-btn-icon');
      icons.forEach(ic => {
        if (syncState.isSyncing) {
          ic.classList.add('spinning');
        } else {
          ic.classList.remove('spinning');
        }
      });

    } catch (e) {
      console.warn('Error actualizando interfaz de sincronización:', e);
    }
  }

  function handleSyncError(err) {
    let msg = 'Error al sincronizar con la nube.';
    const errStr = (err && (err.message || err.error_description || (typeof err === 'string' ? err : JSON.stringify(err)))) || '';

    if (!navigator.onLine || errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('ERR_INTERNET_DISCONNECTED')) {
      setSyncStatus('offline', 'Sin conexión a internet. Cambios guardados en tu dispositivo.');
      return;
    }

    if (errStr.includes('Invalid login credentials') || errStr.includes('invalid_grant')) {
      msg = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
      setSyncStatus('error', msg);
      return;
    }

    if (errStr.includes('paused') || errStr.includes('503') || errStr.includes('500') || errStr.includes('Server error')) {
      msg = 'El servidor de sincronización está temporalmente en mantenimiento. La app sigue en modo local.';
      setSyncStatus('error', msg);
      return;
    }

    if (errStr.includes('JWT') || errStr.includes('token') || errStr.includes('not authenticated')) {
      msg = 'La sesión expiró. Inicia sesión nuevamente.';
      setSyncStatus('no-auth', msg);
      return;
    }

    setSyncStatus('error', msg);
  }

  function getAllLocalRecords() {
    const records = [];

    // 1. Catálogo
    if (Array.isArray(state.catalog)) {
      state.catalog.forEach(item => {
        ensureItemUuid(item);
        records.push({
          id: item.id,
          tipo: 'catalogo',
          datos: { c: item.c, n: item.n, p: item.p },
          deleted: false,
          updated_at: item.updatedAt || new Date().toISOString()
        });
      });
    }

    // 2. Cotizaciones
    if (Array.isArray(state.history)) {
      state.history.forEach(quote => {
        ensureItemUuid(quote);
        records.push({
          id: quote.id,
          tipo: 'cotizacion',
          datos: { ...quote },
          deleted: false,
          updated_at: quote.updatedAt || new Date().toISOString()
        });
      });
    }

    // 3. Cuentas de Cobro
    if (Array.isArray(state.cobroHistory)) {
      state.cobroHistory.forEach(cobro => {
        ensureItemUuid(cobro);
        records.push({
          id: cobro.id,
          tipo: 'cuenta_cobro',
          datos: { ...cobro },
          deleted: false,
          updated_at: cobro.updatedAt || new Date().toISOString()
        });
      });
    }

    // 4. Clientes
    if (Array.isArray(state.cobroClients)) {
      state.cobroClients.forEach(client => {
        ensureItemUuid(client);
        records.push({
          id: client.id,
          tipo: 'cliente',
          datos: { name: client.name, nit: client.nit },
          deleted: false,
          updated_at: client.updatedAt || new Date().toISOString()
        });
      });
    }

    // 4.1 Informes Técnicos
    if (Array.isArray(state.informeHistory)) {
      state.informeHistory.forEach(inf => {
        ensureItemUuid(inf);
        records.push({
          id: inf.id,
          tipo: 'informe_tecnico',
          datos: { ...inf },
          deleted: false,
          updated_at: inf.updatedAt || new Date().toISOString()
        });
      });
    }

    // 4.2 Plantillas de Informes
    if (Array.isArray(state.informePlantillas)) {
      state.informePlantillas.forEach(plant => {
        ensureItemUuid(plant);
        records.push({
          id: plant.id,
          tipo: 'plantilla_informe',
          datos: { ...plant },
          deleted: false,
          updated_at: plant.updatedAt || new Date().toISOString()
        });
      });
    }

    // 5. Config (Mis datos, Logo y Firma)
    const configId = getConfigId();
    const configUpdatedAt = getStorage('pr_config_updated_at', new Date().toISOString());
    records.push({
      id: configId,
      tipo: 'config',
      datos: {
        business: state.business,
        cobroEmisor: state.cobroEmisor,
        cobroLegalText: state.cobroLegalText,
        cobroDefaultNotes: state.cobroDefaultNotes,
        cobroFirma: state.cobroFirma || '',
        logo: window.PEDRO_ROA_LOGO || '',
        informeConfig: state.informeConfig || {}
      },
      deleted: false,
      updated_at: configUpdatedAt
    });

    // 6. Consecutivos
    const consecutivoId = getConsecutivoId();
    const consecutivoUpdatedAt = getStorage('pr_consecutivo_updated_at', new Date().toISOString());
    records.push({
      id: consecutivoId,
      tipo: 'consecutivo',
      datos: {
        quoteNumber: state.quoteNumber,
        cobroNum: state.cobroNum,
        informeNum: state.informeNum || 1
      },
      deleted: false,
      updated_at: consecutivoUpdatedAt
    });

    // 7. Tombstones (eliminados localmente)
    const tombs = getTombstones();
    Object.values(tombs).forEach(tomb => {
      records.push({
        id: tomb.id,
        tipo: tomb.tipo,
        datos: {},
        deleted: true,
        updated_at: tomb.updated_at
      });
    });

    return records;
  }

  function applyCloudRecordToLocal(cloudRec) {
    try {
      const { id, tipo, datos, deleted, updated_at } = cloudRec;

      if (deleted) {
        recordTombstone(id, tipo);
        if (tipo === 'cotizacion') {
          const idx = state.history.findIndex(h => h.id === id);
          if (idx >= 0) {
            state.history.splice(idx, 1);
            setStorage('pr_history', state.history);
          }
        } else if (tipo === 'cuenta_cobro') {
          const idx = state.cobroHistory.findIndex(h => h.id === id);
          if (idx >= 0) {
            state.cobroHistory.splice(idx, 1);
            setStorage('pr_cobro_history', state.cobroHistory);
          }
        } else if (tipo === 'catalogo') {
          const idx = state.catalog.findIndex(c => c.id === id);
          if (idx >= 0) {
            state.catalog.splice(idx, 1);
            saveCatalogToStorage(state.catalog);
          }
        } else if (tipo === 'cliente') {
          const idx = state.cobroClients.findIndex(c => c.id === id);
          if (idx >= 0) {
            state.cobroClients.splice(idx, 1);
            setStorage('pr_cobro_clients', state.cobroClients);
          }
        } else if (tipo === 'informe_tecnico') {
          if (Array.isArray(state.informeHistory)) {
            const idx = state.informeHistory.findIndex(inf => inf.id === id);
            if (idx >= 0) {
              state.informeHistory.splice(idx, 1);
              setStorage('pr_informe_history', state.informeHistory);
            }
          }
        } else if (tipo === 'plantilla_informe') {
          if (Array.isArray(state.informePlantillas)) {
            const idx = state.informePlantillas.findIndex(p => p.id === id);
            if (idx >= 0) {
              state.informePlantillas.splice(idx, 1);
              setStorage('pr_informe_plantillas', state.informePlantillas);
            }
          }
        }
        return;
      }

      // Registro activo
      if (tipo === 'cotizacion' && datos) {
        const quote = { ...datos, id, updatedAt: updated_at };
        const idx = state.history.findIndex(h => h.id === id || h.quoteNumber === quote.quoteNumber);
        if (idx >= 0) {
          state.history[idx] = quote;
        } else {
          state.history.push(quote);
        }
        setStorage('pr_history', state.history);
      } else if (tipo === 'cuenta_cobro' && datos) {
        const cobro = { ...datos, id, updatedAt: updated_at };
        const idx = state.cobroHistory.findIndex(h => h.id === id || parseInt(h.cobroNum, 10) === parseInt(cobro.cobroNum, 10));
        if (idx >= 0) {
          state.cobroHistory[idx] = cobro;
        } else {
          state.cobroHistory.push(cobro);
        }
        setStorage('pr_cobro_history', state.cobroHistory);
      } else if (tipo === 'informe_tecnico' && datos) {
        if (!Array.isArray(state.informeHistory)) state.informeHistory = [];
        const inf = { ...datos, id, updatedAt: updated_at };
        const idx = state.informeHistory.findIndex(h => h.id === id || h.informeNumber === inf.informeNumber);
        if (idx >= 0) {
          state.informeHistory[idx] = inf;
        } else {
          state.informeHistory.push(inf);
        }
        setStorage('pr_informe_history', state.informeHistory);
      } else if (tipo === 'plantilla_informe' && datos) {
        if (!Array.isArray(state.informePlantillas)) state.informePlantillas = [];
        const plant = { ...datos, id, updatedAt: updated_at };
        const idx = state.informePlantillas.findIndex(p => p.id === id || p.name === plant.name);
        if (idx >= 0) {
          state.informePlantillas[idx] = plant;
        } else {
          state.informePlantillas.push(plant);
        }
        setStorage('pr_informe_plantillas', state.informePlantillas);
      } else if (tipo === 'catalogo' && datos) {
        const item = { ...datos, id, updatedAt: updated_at };
        const idx = state.catalog.findIndex(c => c.id === id || (c.n === item.n && c.c === item.c));
        if (idx >= 0) {
          state.catalog[idx] = item;
        } else {
          state.catalog.push(item);
        }
        saveCatalogToStorage(state.catalog);
      } else if (tipo === 'cliente' && datos) {
        const client = { ...datos, id, updatedAt: updated_at };
        const idx = state.cobroClients.findIndex(c => c.id === id || (c.name && c.name.toLowerCase() === (client.name || '').toLowerCase()));
        if (idx >= 0) {
          state.cobroClients[idx] = client;
        } else {
          state.cobroClients.push(client);
        }
        setStorage('pr_cobro_clients', state.cobroClients);
      } else if (tipo === 'config' && datos) {
        if (datos.business) {
          state.business = { ...state.business, ...datos.business };
          setStorage('pr_business', state.business);
          if ($('b-name')) $('b-name').value = state.business.name;
          if ($('b-phone')) $('b-phone').value = formatLocalPhone(state.business.phone, state.business.prefix || '57');
          if ($('b-address')) $('b-address').value = state.business.address || '';
          if ($('b-terms')) $('b-terms').value = state.business.terms || '';
        }
        if (datos.cobroEmisor) {
          state.cobroEmisor = { ...state.cobroEmisor, ...datos.cobroEmisor };
          setStorage('pr_cobro_emisor', state.cobroEmisor);
          syncEmisorTabUI();
        }
        if (datos.cobroLegalText) {
          state.cobroLegalText = datos.cobroLegalText;
          setStorage('pr_cobro_legal_text', state.cobroLegalText);
          if ($('cc-legal-text-tab')) $('cc-legal-text-tab').value = state.cobroLegalText;
        }
        if (datos.cobroDefaultNotes) {
          state.cobroDefaultNotes = datos.cobroDefaultNotes;
          setStorage('pr_cobro_default_notes', state.cobroDefaultNotes);
          if ($('cc-default-notes-tab')) $('cc-default-notes-tab').value = state.cobroDefaultNotes;
        }
        if (datos.informeConfig) {
          state.informeConfig = { ...state.informeConfig, ...datos.informeConfig };
          setStorage('pr_informe_config', state.informeConfig);
          if (typeof syncInformeDatosUI === 'function') syncInformeDatosUI();
        }
        if (typeof datos.cobroFirma === 'string') {
          state.cobroFirma = datos.cobroFirma;
          setStorage('pr_cobro_firma', state.cobroFirma);
          renderCobroFirmaUI();
        }
        setStorage('pr_config_updated_at', updated_at);
      } else if (tipo === 'consecutivo' && datos) {
        if (typeof datos.quoteNumber === 'number' && datos.quoteNumber > state.quoteNumber) {
          state.quoteNumber = datos.quoteNumber;
          setStorage('pr_quote_num', state.quoteNumber);
        }
        if (typeof datos.cobroNum === 'number' && datos.cobroNum > state.cobroNum) {
          state.cobroNum = datos.cobroNum;
          setStorage('pr_cobro_num', state.cobroNum);
          if ($('cc-num')) $('cc-num').value = state.cobroNum;
        }
        if (typeof datos.informeNum === 'number' && datos.informeNum > (state.informeNum || 1)) {
          state.informeNum = datos.informeNum;
          setStorage('pr_informe_num', state.informeNum);
          if ($('inf-num')) $('inf-num').value = getInformeNumberString(state.informeNum);
        }
        setStorage('pr_consecutivo_updated_at', updated_at);
      }
    } catch (e) {
      console.warn('Error aplicando registro de nube a local:', e);
    }
  }

  // Sincronización completa con Supabase
  async function performSync(options = {}) {
    if (syncState.isSyncing) return;
    if (!navigator.onLine) {
      setSyncStatus('offline', 'Sin conexión a internet. Modo local activo.');
      return;
    }
    if (!syncState.client || !syncState.user) {
      setSyncStatus('no-auth', 'Modo local · Iniciar sesión para sincronizar');
      return;
    }

    syncState.isSyncing = true;
    setSyncStatus('syncing', 'Sincronizando...');
    updateSyncUI();

    try {
      // 1. Descargar registros del usuario en Supabase
      const { data: cloudRows, error: fetchError } = await syncState.client
        .from('registros')
        .select('id, tipo, datos, deleted, updated_at');

      if (fetchError) throw fetchError;

      const cloudMap = new Map();
      (cloudRows || []).forEach(row => cloudMap.set(row.id, row));

      const cloudConfig = (cloudRows || []).find(r => r.tipo === 'config');
      if (cloudConfig) {
        setStorage('pr_config_uuid', cloudConfig.id);
      }
      const cloudConsecutivo = (cloudRows || []).find(r => r.tipo === 'consecutivo');
      if (cloudConsecutivo) {
        setStorage('pr_consecutivo_uuid', cloudConsecutivo.id);
      }

      // Preparar registros locales actuales
      const localRecords = getAllLocalRecords();
      const localMap = new Map();
      localRecords.forEach(rec => localMap.set(rec.id, rec));

      const toUpload = [];
      let uploadedCount = 0;
      let downloadedCount = 0;

      // 2. Comparar Local con Nube (subir nuevos o locales más recientes)
      for (const [id, localRec] of localMap.entries()) {
        const cloudRec = cloudMap.get(id);
        if (!cloudRec) {
          toUpload.push({
            id: localRec.id,
            tipo: localRec.tipo,
            datos: localRec.datos,
            deleted: localRec.deleted || false,
            updated_at: localRec.updated_at
          });
          uploadedCount++;
        } else {
          const localTime = new Date(localRec.updated_at).getTime();
          const cloudTime = new Date(cloudRec.updated_at).getTime();

          if (localTime > cloudTime) {
            toUpload.push({
              id: localRec.id,
              tipo: localRec.tipo,
              datos: localRec.datos,
              deleted: localRec.deleted || false,
              updated_at: localRec.updated_at
            });
            uploadedCount++;
          }
        }
      }

      // 3. Comparar Nube con Local (descargar registros de la nube)
      for (const [id, cloudRec] of cloudMap.entries()) {
        const localRec = localMap.get(id);
        if (!localRec) {
          applyCloudRecordToLocal(cloudRec);
          downloadedCount++;
        } else {
          const localTime = new Date(localRec.updated_at).getTime();
          const cloudTime = new Date(cloudRec.updated_at).getTime();

          if (cloudTime > localTime) {
            applyCloudRecordToLocal(cloudRec);
            downloadedCount++;
          }
        }
      }

      // 4. Subir a Supabase en lotes de hasta 50 filas
      if (toUpload.length > 0) {
        for (let i = 0; i < toUpload.length; i += 50) {
          const chunk = toUpload.slice(i, i + 50);
          const { error: upsertErr } = await syncState.client
            .from('registros')
            .upsert(chunk, { onConflict: 'id' });
          if (upsertErr) throw upsertErr;
        }
      }

      cleanLocalTombstones(cloudMap);

      const nowIso = new Date().toISOString();
      syncState.lastSyncTime = nowIso;
      setStorage('pr_sync_last_time', nowIso);
      syncState.pendingChanges = false;
      setStorage('pr_sync_pending', false);

      setSyncStatus('synced', `Sincronizado (${formatSyncTime(new Date())})`);

      const firstSyncKey = 'pr_first_sync_done_' + syncState.user.id;
      if (options.isInitial || !getStorage(firstSyncKey, false)) {
        setStorage(firstSyncKey, true);
        showToast(`Sincronización completada: se subieron ${uploadedCount}, se bajaron ${downloadedCount}`, '🔄');
      } else if (uploadedCount > 0 || downloadedCount > 0) {
        showToast(`Sincronizado: ${uploadedCount} subidos, ${downloadedCount} descargados`, '🔄');
      }

      renderHistory();
      renderCobroHistory();
      renderCatalogSelect();
      renderCatalogManager();
      updateBadges();

    } catch (err) {
      console.error('Error durante la sincronización:', err);
      handleSyncError(err);
    } finally {
      syncState.isSyncing = false;
      updateSyncUI();
    }
  }

  function triggerIncrementalSync(delay = 1200) {
    markSyncPending();
    updateSyncUI();
    if (!navigator.onLine || !syncState.user || !syncState.client) return;

    clearTimeout(syncState.debounceTimer);
    syncState.debounceTimer = setTimeout(() => {
      performSync();
    }, delay);
  }

  function getCalculatedNextQuoteNum() {
    let max = 0;
    if (Array.isArray(state.history)) {
      state.history.forEach(h => {
        const m = String(h.quoteNumber || '').match(/\d+/);
        if (m) max = Math.max(max, parseInt(m[0], 10));
      });
    }
    return Math.max(max, state.quoteNumber || 0) + 1;
  }

  function getCalculatedNextCobroNum() {
    let max = 0;
    if (Array.isArray(state.cobroHistory)) {
      state.cobroHistory.forEach(h => {
        const n = parseInt(h.cobroNum, 10);
        if (!isNaN(n)) max = Math.max(max, n);
      });
    }
    return Math.max(max, parseInt(state.cobroNum, 10) || 0) + 1;
  }

  function checkQuoteNumberCollision(quoteNumber, currentId) {
    if (!Array.isArray(state.history)) return;
    const duplicates = state.history.filter(h => h.quoteNumber === quoteNumber && h.id !== currentId);
    if (duplicates.length > 0) {
      showToast(`⚠️ Aviso: Ya existe una cotización guardada con el número ${quoteNumber}. Se recomienda verificar los consecutivos.`, '⚠️');
    }
  }

  function checkCobroNumberCollision(cobroNum, currentId) {
    if (!Array.isArray(state.cobroHistory)) return;
    const duplicates = state.cobroHistory.filter(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10) && h.id !== currentId);
    if (duplicates.length > 0) {
      showToast(`⚠️ Aviso: Ya existe una cuenta de cobro guardada con el número ${cobroNum}. Se recomienda verificar los consecutivos.`, '⚠️');
    }
  }

  function exportGlobalBackup() {
    try {
      const backup = {
        app: 'Pedro Roa Cotizador PRO',
        version: '2.6',
        exportedAt: new Date().toISOString(),
        history: state.history,
        cobroHistory: state.cobroHistory,
        catalog: state.catalog,
        cobroClients: state.cobroClients,
        business: state.business,
        cobroEmisor: state.cobroEmisor,
        cobroLegalText: state.cobroLegalText,
        cobroDefaultNotes: state.cobroDefaultNotes,
        cobroFirma: state.cobroFirma || '',
        quoteNumber: state.quoteNumber,
        cobroNum: state.cobroNum,
        informeHistory: state.informeHistory || [],
        informePlantillas: state.informePlantillas || [],
        informeConfig: state.informeConfig || {},
        informeNum: state.informeNum || 1
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `respaldo-pedro-roa-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Respaldo exportado exitosamente', '📥');
    } catch (e) {
      console.error('Error al exportar respaldo:', e);
      showToast('Error al exportar el respaldo manual', '❌');
    }
  }

  function importGlobalBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          showToast('El archivo seleccionado no es un respaldo válido', '⚠️');
          return;
        }

        if (confirm('¿Restaurar los datos desde este archivo de respaldo?\n\nLos registros se fusionarán con los actuales y se sincronizarán con la nube.')) {
          let added = 0;
          if (Array.isArray(parsed.history)) {
            parsed.history.forEach(qh => {
              ensureItemUuid(qh);
              const idx = state.history.findIndex(h => h.id === qh.id || h.quoteNumber === qh.quoteNumber);
              if (idx >= 0) state.history[idx] = { ...state.history[idx], ...qh };
              else { state.history.push(qh); added++; }
            });
            setStorage('pr_history', state.history);
          }
          if (Array.isArray(parsed.cobroHistory)) {
            parsed.cobroHistory.forEach(ch => {
              ensureItemUuid(ch);
              const idx = state.cobroHistory.findIndex(h => h.id === ch.id || parseInt(h.cobroNum, 10) === parseInt(ch.cobroNum, 10));
              if (idx >= 0) state.cobroHistory[idx] = { ...state.cobroHistory[idx], ...ch };
              else { state.cobroHistory.push(ch); added++; }
            });
            setStorage('pr_cobro_history', state.cobroHistory);
          }
          if (Array.isArray(parsed.informeHistory)) {
            if (!Array.isArray(state.informeHistory)) state.informeHistory = [];
            parsed.informeHistory.forEach(ih => {
              ensureItemUuid(ih);
              const idx = state.informeHistory.findIndex(h => h.id === ih.id || h.informeNumber === ih.informeNumber);
              if (idx >= 0) state.informeHistory[idx] = { ...state.informeHistory[idx], ...ih };
              else { state.informeHistory.push(ih); added++; }
            });
            setStorage('pr_informe_history', state.informeHistory);
          }
          if (Array.isArray(parsed.informePlantillas)) {
            if (!Array.isArray(state.informePlantillas)) state.informePlantillas = [];
            parsed.informePlantillas.forEach(ip => {
              ensureItemUuid(ip);
              const idx = state.informePlantillas.findIndex(p => p.id === ip.id || p.name === ip.name);
              if (idx >= 0) state.informePlantillas[idx] = { ...state.informePlantillas[idx], ...ip };
              else { state.informePlantillas.push(ip); added++; }
            });
            setStorage('pr_informe_plantillas', state.informePlantillas);
          }
          if (Array.isArray(parsed.catalog)) {
            parsed.catalog.forEach(item => {
              ensureItemUuid(item);
              const idx = state.catalog.findIndex(c => c.id === item.id || (c.n === item.n && c.c === item.c));
              if (idx >= 0) state.catalog[idx] = { ...state.catalog[idx], ...item };
              else state.catalog.push(item);
            });
            saveCatalogToStorage(state.catalog);
          }
          if (Array.isArray(parsed.cobroClients)) {
            parsed.cobroClients.forEach(client => {
              ensureItemUuid(client);
              const idx = state.cobroClients.findIndex(c => c.id === client.id || (c.name && c.name.toLowerCase() === (client.name || '').toLowerCase()));
              if (idx >= 0) state.cobroClients[idx] = { ...state.cobroClients[idx], ...client };
              else state.cobroClients.push(client);
            });
            setStorage('pr_cobro_clients', state.cobroClients);
          }
          if (parsed.business) {
            state.business = { ...state.business, ...parsed.business };
            setStorage('pr_business', state.business);
          }
          if (parsed.cobroEmisor) {
            state.cobroEmisor = { ...state.cobroEmisor, ...parsed.cobroEmisor };
            setStorage('pr_cobro_emisor', state.cobroEmisor);
          }
          if (parsed.cobroLegalText) {
            state.cobroLegalText = parsed.cobroLegalText;
            setStorage('pr_cobro_legal_text', state.cobroLegalText);
          }
          if (parsed.cobroDefaultNotes) {
            state.cobroDefaultNotes = parsed.cobroDefaultNotes;
            setStorage('pr_cobro_default_notes', state.cobroDefaultNotes);
          }
          if (parsed.informeConfig) {
            state.informeConfig = { ...state.informeConfig, ...parsed.informeConfig };
            setStorage('pr_informe_config', state.informeConfig);
          }
          if (parsed.cobroFirma) {
            state.cobroFirma = parsed.cobroFirma;
            setStorage('pr_cobro_firma', state.cobroFirma);
          }
          if (typeof parsed.informeNum === 'number' && parsed.informeNum > (state.informeNum || 1)) {
            state.informeNum = parsed.informeNum;
            setStorage('pr_informe_num', state.informeNum);
          }

          setStorage('pr_config_updated_at', new Date().toISOString());
          renderHistory();
          renderCobroHistory();
          if (typeof renderInformeHistory === 'function') renderInformeHistory();
          if (typeof renderInformePlantillasList === 'function') renderInformePlantillasList();
          renderCatalogSelect();
          renderCatalogManager();
          updateBadges();
          showToast(`Respaldo restaurado con éxito (${added} registros incorporados)`, '✅');
          triggerIncrementalSync();
        }
      } catch (err) {
        console.error('Error importando archivo:', err);
        showToast('Error al leer el archivo de respaldo', '❌');
      }
    };
    reader.readAsText(file);
  }

  function initSupabaseClient() {
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        syncState.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      }
    } catch (e) {
      console.warn('Error inicializando Supabase Client:', e);
    }
  }

  function openAuthModal() {
    const authOverlay = $('auth-modal-overlay');
    if (!authOverlay) return;
    const authErrorAlert = $('auth-error-alert');
    if (authErrorAlert) {
      authErrorAlert.style.display = 'none';
      authErrorAlert.textContent = '';
    }
    authOverlay.style.display = 'flex';
    authOverlay.classList.add('active');
    const authEmail = $('auth-email-input');
    setTimeout(() => {
      if (authEmail) authEmail.focus();
    }, 150);
  }

  function closeAuthModal() {
    const authOverlay = $('auth-modal-overlay');
    if (!authOverlay) return;
    authOverlay.style.display = 'none';
    authOverlay.classList.remove('active');
  }

  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;

  function initSyncEngine() {
    try {
      if (Array.isArray(state.history)) state.history.forEach(ensureItemUuid);
      if (Array.isArray(state.cobroHistory)) state.cobroHistory.forEach(ensureItemUuid);
      if (Array.isArray(state.catalog)) state.catalog.forEach(ensureItemUuid);
      if (Array.isArray(state.cobroClients)) state.cobroClients.forEach(ensureItemUuid);

      initSupabaseClient();

      if (syncState.client) {
        syncState.client.auth.getSession().then(({ data: { session }, error }) => {
          if (!error && session && session.user) {
            syncState.user = session.user;
            setSyncStatus('synced', `Conectado como ${session.user.email}`);
            performSync();
          } else {
            syncState.user = null;
            setSyncStatus('no-auth', 'Modo local · Iniciar sesión para sincronizar');
            openAuthModal();
          }
        }).catch(err => {
          console.warn('Error al verificar sesión de Supabase:', err);
          setSyncStatus('offline', 'Modo local listo');
          openAuthModal();
        });

        syncState.client.auth.onAuthStateChange((event, session) => {
          if (session && session.user) {
            syncState.user = session.user;
            closeAuthModal();
            updateSyncUI();
          } else {
            syncState.user = null;
            setSyncStatus('no-auth', 'Modo local · Iniciar sesión para sincronizar');
          }
        });
      } else {
        setSyncStatus('offline', 'Modo local listo (Sin conexión)');
        openAuthModal();
      }

      window.addEventListener('online', () => {
        showToast('Conexión a internet restablecida. Sincronizando...', '🌐');
        if (syncState.user) {
          performSync();
        } else {
          setSyncStatus('no-auth', 'Modo local · Iniciar sesión para sincronizar');
        }
      });

      window.addEventListener('offline', () => {
        setSyncStatus('offline', 'Sin conexión · Modo local activo');
      });

      updateSyncUI();

    } catch (e) {
      console.warn('Fallo iniciando motor de sincronización:', e);
      setSyncStatus('error', 'Modo local activo');
      openAuthModal();
    }
  }

  function setupSyncEvents() {
    const authOverlay = $('auth-modal-overlay');
    const authForm = $('form-auth-login');
    const authEmail = $('auth-email-input');
    const authPassword = $('auth-password-input');
    const authErrorAlert = $('auth-error-alert');
    const btnAuthClose = $('btn-auth-close');
    const btnTogglePwd = $('btn-toggle-auth-pwd');
    const btnAuthSubmit = $('btn-auth-submit');
    const authBtnIcon = $('auth-btn-icon');

    const topbarBtn = $('topbar-sync-btn');
    if (topbarBtn) {
      topbarBtn.addEventListener('click', () => {
        if (!syncState.user) {
          openAuthModal();
        } else {
          showToast('Iniciando sincronización...', '🔄');
          performSync();
        }
      });
      topbarBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          topbarBtn.click();
        }
      });
    }

    if (btnTogglePwd && authPassword) {
      btnTogglePwd.addEventListener('click', () => {
        const isPwd = authPassword.type === 'password';
        authPassword.type = isPwd ? 'text' : 'password';
        btnTogglePwd.textContent = isPwd ? '🙈' : '👁️';
      });
    }

    if (btnAuthClose) {
      btnAuthClose.addEventListener('click', closeAuthModal);
    }

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (authEmail.value || '').trim();
        const password = (authPassword.value || '').trim();

        if (!email || !password) {
          if (authErrorAlert) {
            authErrorAlert.style.display = 'block';
            authErrorAlert.textContent = 'Por favor ingresa tu correo y contraseña.';
          }
          return;
        }

        if (!syncState.client) {
          initSupabaseClient();
        }

        if (!syncState.client) {
          if (authErrorAlert) {
            authErrorAlert.style.display = 'block';
            authErrorAlert.textContent = 'No se pudo conectar con el servicio de autenticación. Verifica tu conexión a internet.';
          }
          return;
        }

        if (btnAuthSubmit) {
          btnAuthSubmit.disabled = true;
          if (authBtnIcon) authBtnIcon.className = 'sync-btn-icon spinning';
          btnAuthSubmit.innerHTML = '<span>⏳</span> Verificando credenciales...';
        }

        try {
          const { data, error } = await syncState.client.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;

          if (data && data.user) {
            syncState.user = data.user;
            closeAuthModal();
            showToast(`¡Bienvenido! Sesión iniciada como ${data.user.email}`, '✅');
            updateSyncUI();
            performSync({ isInitial: true });
          }
        } catch (err) {
          console.error('Error al iniciar sesión:', err);
          let errText = 'Error al iniciar sesión.';
          const str = err.message || '';
          if (str.includes('Invalid login credentials') || str.includes('invalid_grant')) {
            errText = 'Correo o contraseña incorrectos. Verifica tus datos de acceso.';
          } else if (!navigator.onLine || str.includes('Failed to fetch')) {
            errText = 'No hay conexión a internet. La aplicación continuará funcionando en modo local.';
          } else if (str.includes('paused') || str.includes('503')) {
            errText = 'El servidor de sincronización está temporalmente en mantenimiento.';
          } else {
            errText = `Error: ${str}`;
          }

          if (authErrorAlert) {
            authErrorAlert.style.display = 'block';
            authErrorAlert.textContent = errText;
          }
        } finally {
          if (btnAuthSubmit) {
            btnAuthSubmit.disabled = false;
            btnAuthSubmit.innerHTML = '<span id="auth-btn-icon" style="margin-right: 6px;">🔐</span> Iniciar Sesión';
          }
        }
      });
    }

    document.querySelectorAll('.btn-trigger-sync').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!syncState.user) {
          openAuthModal();
        } else {
          showToast('Sincronizando datos...', '🔄');
          performSync();
        }
      });
    });

    document.querySelectorAll('.btn-trigger-auth').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (syncState.user) {
          if (confirm('¿Cerrar sesión en este dispositivo?\n\nTus cotizaciones y cuentas permanecerán guardadas en este equipo, pero no se sincronizarán con la nube hasta que vuelvas a iniciar sesión.')) {
            if (syncState.client) {
              await syncState.client.auth.signOut();
            }
            syncState.user = null;
            setSyncStatus('no-auth', 'Modo local · Iniciar sesión para sincronizar');
            showToast('Sesión cerrada. La app continúa en modo local.', 'ℹ️');
          }
        } else {
          openAuthModal();
        }
      });
    });

    document.querySelectorAll('.btn-export-all-backup').forEach(btn => {
      btn.addEventListener('click', exportGlobalBackup);
    });

    document.querySelectorAll('.btn-import-all-backup').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileInput = btn.parentElement.querySelector('.input-import-all-file');
        if (fileInput) fileInput.click();
      });
    });

    document.querySelectorAll('.input-import-all-file').forEach(input => {
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          importGlobalBackup(file);
          input.value = '';
        }
      });
    });
  }

  // --- Valores por defecto para Cuentas de Cobro ---
  const DEFAULT_COBRO_EMISOR = {
    name: 'Pedro Luis Roa Mora',
    cc: '1.015.409.172',
    city: 'Bogotá',
    phone: '3024555428',
    address: 'Carrera 70g 78a-80'
  };

  const DEFAULT_LEGAL_TEXT = `Que los ingresos brutos totales obtenidos en el presente periodo gravable corresponden a honorarios, comisiones o servicios y no superan las 120 UVT mensuales

Que me acojo al artículo 135 del acuerdo 1753 de 2015

Que me acojo a la ley 1819 de 2016, mediante el cual para efectos tributarios estoy clasificado en cada cedula mencionada para la exención de la aplicación de la retención en la fuente según Art 383 E.T`;

  const DEFAULT_COBRO_NOTES = 'Garantía de 30 días sobre el servicio. Repuestos sujetos a garantía del fabricante.';

  // --- Valores por defecto para Informes Técnicos ---
  const DEFAULT_INFORME_CONFIG = {
    cargo: 'Técnico de mantenimiento de equipos de cómputo',
    correo: 'pedrolroam@hotmail.com',
    celular: '302 455 5428',
    headerTag: 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO',
    serviceType: 'Inspección y diagnóstico técnico',
    defaultObs: `El valor indicado corresponde al conjunto de actividades descritas en la propuesta de reparación.
El diagnóstico se basa en inspección visual y pruebas funcionales; no incluye análisis químico ni desmontaje destructivo.
La reparación debe finalizar con pruebas de funcionamiento y verificación para comprobar el resultado.`
  };

  const DEFAULT_INFORME_PLANTILLAS = [
    {
      id: 'plantilla-epson-l565',
      name: 'Diagnóstico de calidad de impresión – Epson EcoTank L565',
      title: 'INFORME TÉCNICO',
      subtitle: 'Diagnóstico de calidad de impresión – Epson EcoTank L565',
      headerTag: 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO',
      serviceType: 'Inspección y diagnóstico técnico',
      falla: 'Impresión con sombras / dominante azul',
      motivo: 'Se realiza la evaluación técnica de una impresora Epson EcoTank L565 debido a una anomalía en la calidad de impresión, caracterizada por la aparición de sombras y una dominante de color azul en los documentos impresos.',
      verificaciones: [
        {
          title: 'Inspección del bus de datos del cabezal',
          desc: 'Se revisó visualmente el bus de datos (cinta flexible) asociado al cabezal. A la inspección, se observa aparentemente en buenas condiciones, sin daños visibles que permitan atribuirle directamente la falla.'
        },
        {
          title: 'Prueba cruzada del cabezal',
          desc: 'El cabezal de impresión se probó en otra máquina compatible. La prueba reprodujo la misma anomalía de sombras azules, lo que permite asociar la falla al cabezal y no exclusivamente a la impresora originalmente evaluada.'
        },
        {
          title: 'Verificación de la tinta',
          desc: 'Durante la revisión de la tinta presente en el sistema, se observó que esta tiene una consistencia muy diluida y aparentemente está rendida con agua. Esta condición es compatible con el uso de tinta de baja calidad o adulterada; sin embargo, la composición exacta no fue determinada mediante análisis químico de laboratorio.'
        }
      ],
      diagnostico: `Con base en las verificaciones efectuadas, el cabezal de impresión presenta una falla funcional que genera sombras o una dominante azul en la impresión. La prueba cruzada, al presentar el mismo síntoma en otra impresora, respalda que el origen de la anomalía se encuentra en el cabezal.

La tinta encontrada, por su elevada dilución aparente, constituye una causa probable y relevante del deterioro. El uso de tinta de calidad inadecuada, contaminada o mezclada puede afectar el funcionamiento del sistema de impresión y contribuir a obstrucciones, contaminación o daños en el cabezal.`,
      propuestaTexto: 'Se recomienda reemplazar el cabezal de impresión y, de forma complementaria, realizar el lavado de los tanques de tinta y del sistema correspondiente antes de cargar tinta nueva de calidad confiable y compatible con el modelo Epson L565. Esta intervención busca retirar residuos o contaminantes y reducir el riesgo de que el nuevo cabezal resulte afectado por tinta remanente.',
      propuestaItems: [
        { desc: 'Cambio de cabezal, lavado de tanques y suministro de tinta nueva.', valor: 500000 }
      ],
      observaciones: `El valor indicado corresponde al conjunto de actividades descritas en la propuesta de reparación.
Se recomienda utilizar únicamente tinta nueva, de calidad y compatible con la Epson L565.
La reparación debe finalizar con pruebas de impresión y verificación de los colores para comprobar el resultado.
El diagnóstico se basa en inspección visual y pruebas funcionales; no incluye análisis químico de la tinta ni desmontaje destructivo del cabezal.
El cabezal que se suministro el pasado 1 de julio pierde garantía ya que el daño fue producido por la tinta que se le suministro a la máquina.`,
      conclusion: 'La Epson EcoTank L565 presenta una falla atribuible al cabezal de impresión, evidenciada por la reproducción de las sombras azules al probarlo en otra máquina. El bus de datos se aprecia en buen estado durante la inspección visual. La tinta muy diluida observada es un factor que contribuyo al daño, aunque no se puede establecer como causa única sin pruebas adicionales. Se propone el reemplazo del cabezal, lavado de tanques y suministro de tinta nueva por un valor total de $500.000 COP.'
    }
  ];

  // --- App State ---
  const state = {
    // Lee primero lo guardado en localStorage; solo si no hay nada guardado usa el catálogo de ejemplo
    catalog: loadCatalogFromStorage(),
    quoteNumber: getStorage('pr_quote_num', 1),
    business: getStorage('pr_business', {
      name: 'Pedro Roa - Servicios Técnicos',
      phone: '3024555428',
      address: 'Servicio a Domicilio y Taller Especializado',
      terms: 'Garantía de 30 días sobre mano de obra y servicio técnico. Repuestos sujetos a garantía oficial del fabricante. Todo trabajo incluye diagnóstico y pruebas previas.'
    }),
    currentQuote: {
      clientName: '',
      clientPhone: '',
      equipment: '',
      items: [],
      discountPercent: 0,
      deliveryAmount: 0,
      validDays: 15,
      hasTax: false,
      notes: ''
    },
    history: getStorage('pr_history', []),
    deferredInstallPrompt: null,

    // Cuentas de Cobro State
    cobroEmisor: getStorage('pr_cobro_emisor', DEFAULT_COBRO_EMISOR),
    cobroFirma: getStorage('pr_cobro_firma', ''),
    cobroLegalText: getStorage('pr_cobro_legal_text', DEFAULT_LEGAL_TEXT),
    cobroDefaultNotes: getStorage('pr_cobro_default_notes', DEFAULT_COBRO_NOTES),
    cobroNum: getStorage('pr_cobro_num', 12),
    cobroDocCity: getStorage('pr_cobro_doc_city', 'Bogotá'),
    cobroDocDate: getStorage('pr_cobro_doc_date', new Date().toISOString().split('T')[0]),
    cobroIncludeLegal: getStorage('pr_cobro_include_legal', true),
    cobroIncludeLogo: getStorage('pr_cobro_include_logo', true),
    cobroIncludeNotes: getStorage('pr_cobro_include_notes', true),
    cobroNotes: getStorage('pr_cobro_notes', getStorage('pr_cobro_default_notes', DEFAULT_COBRO_NOTES)),
    cobroClientName: getStorage('pr_cobro_client_name', ''),
    cobroClientNit: getStorage('pr_cobro_client_nit', ''),
    cobroClients: getStorage('pr_cobro_clients', [
      { name: 'Canon de Colombia S.A.S.', nit: '860.000.123-4' },
      { name: 'TIENDA DE FRENOS IMPORTADOS S.A.S.', nit: '900.611-329-4' }
    ]),
    cobroConceptos: getStorage('pr_cobro_conceptos', [
      { desc: 'Suministro caja de mantenimiento para impresora Canon MC-G03 serial 54496', amount: 160000 }
    ]),
    cobroAdelantos: getStorage('pr_cobro_adelantos', []),
    cobroPreviewCollapsed: getStorage('pr_cobro_preview_collapsed', false),
    cobroHistory: getStorage('pr_cobro_history', []),

    // Informes Técnicos State
    informeConfig: getStorage('pr_informe_config', DEFAULT_INFORME_CONFIG),
    informeNum: getStorage('pr_informe_num', 1),
    informeHistory: getStorage('pr_informe_history', []),
    informePlantillas: getStorage('pr_informe_plantillas', DEFAULT_INFORME_PLANTILLAS),
    activeSubviewInf: getStorage('pr_active_subview_inf', 'view-informe-tecnico'),
    informePreviewCollapsed: getStorage('pr_informe_preview_collapsed', false),
    currentInformeVerificaciones: [
      {
        title: 'Inspección del bus de datos del cabezal',
        desc: 'Se revisó visualmente el bus de datos (cinta flexible) asociado al cabezal. A la inspección, se observa aparentemente en buenas condiciones, sin daños visibles que permitan atribuirle directamente la falla.'
      },
      {
        title: 'Prueba cruzada del cabezal',
        desc: 'El cabezal de impresión se probó en otra máquina compatible. La prueba reprodujo la misma anomalía de sombras azules, lo que permite asociar la falla al cabezal y no exclusivamente a la impresora originalmente evaluada.'
      },
      {
        title: 'Verificación de la tinta',
        desc: 'Durante la revisión de la tinta presente en el sistema, se observó que esta tiene una consistencia muy diluida y aparentemente está rendida con agua. Esta condición es compatible con el uso de tinta de baja calidad o adulterada; sin embargo, la composición exacta no fue determinada mediante análisis químico de laboratorio.'
      }
    ],
    currentInformePropuestas: [
      { desc: 'Cambio de cabezal, lavado de tanques y suministro de tinta nueva.', valor: 500000 }
    ],
    currentInformeCustomSections: [],

    activeMainSection: getStorage('pr_active_main_section', 'cotizaciones'),
    activeSubviewCot: getStorage('pr_active_subview_cot', 'view-cotizador'),
    activeSubviewCobro: getStorage('pr_active_subview_cobro', 'view-cuentas-cobro')
  };

  // DOM elements cache
  const $ = id => document.getElementById(id);

  function formatMoney(amount) {
    return '$' + Math.round(amount || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[c]);
  }

  // Formatting dates in Spanish
  function formatDate(d) {
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function getDates() {
    const today = new Date();
    const expire = new Date();
    const days = parseInt($('q-validity').value) || 15;
    expire.setDate(today.getDate() + days);
    return {
      issue: formatDate(today),
      expire: formatDate(expire)
    };
  }

  function getQuoteIdString() {
    return 'COT-' + String(state.quoteNumber).padStart(4, '0');
  }

  // --- Calculations ---
  function calculateTotals() {
    const subtotal = state.currentQuote.items.reduce((acc, it) => acc + (it.q * it.p), 0);
    const discPercent = parseFloat($('q-discount').value) || 0;
    const discountAmount = subtotal * (discPercent / 100);
    const deliveryAmount = parseFloat($('q-delivery').value) || 0;
    const base = subtotal - discountAmount + deliveryAmount;
    const taxRate = parseFloat($('q-tax').value) || 0;
    const taxAmount = base * taxRate;
    const total = base + taxAmount;

    return {
      subtotal,
      discountPercent: discPercent,
      discountAmount,
      deliveryAmount,
      taxRate,
      taxAmount,
      total
    };
  }

  // Phone Formatting Helpers
  function formatLocalPhone(value, prefix) {
    let clean = String(value || '').replace(/\D/g, '');
    const cleanPrefix = String(prefix || '57').replace(/\D/g, '');
    // If user pasted with country prefix, strip it
    if (cleanPrefix && clean.startsWith(cleanPrefix) && clean.length > cleanPrefix.length + 6) {
      clean = clean.substring(cleanPrefix.length);
    }
    // Format 10-digit Colombian mobile: 300 123 4567
    if (cleanPrefix === '57') {
      if (clean.length > 10) clean = clean.slice(0, 10);
      if (clean.length > 6) {
        return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
      } else if (clean.length > 3) {
        return clean.slice(0, 3) + ' ' + clean.slice(3);
      }
      return clean;
    }
    if (clean.length > 6) {
      return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
    }
    return clean;
  }

  function getFullInternationalPhone(prefix, localVal) {
    let clean = String(localVal || '').replace(/\D/g, '');
    const cleanPrefix = String(prefix || '57').replace(/\D/g, '');
    if (!clean) return '';
    if (cleanPrefix && clean.startsWith(cleanPrefix) && clean.length > cleanPrefix.length + 6) {
      clean = clean.substring(cleanPrefix.length);
    }
    return cleanPrefix + clean;
  }

  function getDisplayFormattedPhone(prefix, localVal) {
    let clean = String(localVal || '').replace(/\D/g, '');
    const cleanPrefix = String(prefix || '57').replace(/\D/g, '');
    if (!clean) return 'No registrado';
    if (cleanPrefix && clean.startsWith(cleanPrefix) && clean.length > cleanPrefix.length + 6) {
      clean = clean.substring(cleanPrefix.length);
    }
    if (cleanPrefix === '57' && clean.length === 10) {
      return `+57 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    return `+${cleanPrefix} ${clean}`;
  }

  function getFullQuoteData() {
    const totals = calculateTotals();
    const dates = getDates();

    const clientPrefix = $('q-client-prefix') ? $('q-client-prefix').value : '57';
    const clientPhoneRaw = $('q-client-phone') ? $('q-client-phone').value : '';
    const clientPhoneDisplay = getDisplayFormattedPhone(clientPrefix, clientPhoneRaw);
    const clientPhoneFull = getFullInternationalPhone(clientPrefix, clientPhoneRaw);

    const bizPrefix = $('b-prefix') ? $('b-prefix').value : '57';
    const bizPhoneRaw = $('b-phone') ? $('b-phone').value : state.business.phone;
    const bizPhoneDisplay = getDisplayFormattedPhone(bizPrefix, bizPhoneRaw);
    const bizPhoneFull = getFullInternationalPhone(bizPrefix, bizPhoneRaw);

    const quoteData = {
      quoteNumber: getQuoteIdString(),
      businessName: ($('b-name') && $('b-name').value.trim()) || state.business.name,
      businessPhone: bizPhoneDisplay,
      businessPhoneFull: bizPhoneFull,
      businessPrefix: bizPrefix,
      clientName: ($('q-client-name') && $('q-client-name').value.trim()) || 'Cliente General',
      clientPhone: clientPhoneDisplay,
      clientPhoneFull: clientPhoneFull,
      clientPhoneRaw: clientPhoneRaw,
      clientPrefix: clientPrefix,
      equipment: ($('q-equipment') && $('q-equipment').value.trim()) || '',
      items: state.currentQuote.items,
      issueDate: dates.issue,
      expireDate: dates.expire,
      notes: ($('q-notes') && $('q-notes').value.trim()) || '',
      ...totals
    };

    quoteData.fullMessageText = generatePlainText(quoteData);
    return quoteData;
  }

  // --- UI Renderers ---
  function renderCatalogSelect() {
    const select = $('catalog-select');
    const groups = {};
    state.catalog.forEach((item, index) => {
      const category = item.c || 'Otros';
      if (!groups[category]) groups[category] = [];
      groups[category].push({ ...item, index });
    });

    let html = '<option value="">-- Seleccionar producto o servicio --</option>';
    Object.keys(groups).sort().forEach(cat => {
      html += `<optgroup label="${escapeHtml(cat)}">`;
      groups[cat].forEach(it => {
        html += `<option value="${it.index}">${escapeHtml(it.n)} — ${formatMoney(it.p)}</option>`;
      });
      html += '</optgroup>';
    });

    select.innerHTML = html;
  }

  function renderQuoteItems() {
    const container = $('quote-lines');
    if (state.currentQuote.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--text-dim); background: var(--bg-input); border-radius: var(--radius-md); border: 1px dashed var(--border);">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">📦</div>
          <p style="font-size: 0.88rem; margin-bottom: 2px;">No has agregado ningún producto o servicio todavía.</p>
          <span style="font-size: 0.78rem;">Selecciona del catálogo arriba o añade una línea personalizada.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = state.currentQuote.items.map((it, idx) => `
      <div class="line-item" data-index="${idx}">
        <div class="line-desc-col">
          <input type="text" data-field="d" value="${escapeHtml(it.d)}" placeholder="Descripción del producto o servicio" />
        </div>
        <div class="line-controls-col">
          <div class="line-input-wrap qty-wrap">
            <span class="line-field-tag">Cant.</span>
            <input type="number" data-field="q" min="1" value="${it.q}" title="Cantidad" />
          </div>
          <div class="line-input-wrap price-wrap">
            <span class="line-field-tag">Vr. Unit.</span>
            <input type="number" data-field="p" min="0" step="1000" value="${it.p}" title="Precio unitario" />
          </div>
          <div class="line-input-wrap subtotal-wrap">
            <span class="line-field-tag">Subtotal</span>
            <div class="line-subtotal">${formatMoney(it.q * it.p)}</div>
          </div>
          <button class="btn-danger btn-icon line-del-btn" data-action="remove-line" title="Eliminar ítem">✕</button>
        </div>
      </div>
    `).join('');
  }

  function renderLivePreview() {
    const data = getFullQuoteData();

    // Header info
    $('preview-quote-num').textContent = data.quoteNumber;
    $('preview-biz-name').textContent = data.businessName;
    $('preview-biz-phone').textContent = 'WhatsApp / Tel: ' + data.businessPhone;
    $('preview-date-issue').textContent = 'Fecha: ' + data.issueDate;
    $('preview-date-expire').textContent = 'Vence: ' + data.expireDate;

    // Client
    $('preview-client-name').textContent = data.clientName || 'Cliente General';
    $('preview-client-phone').textContent = data.clientPhone || 'No registrado';
    const equipRow = $('preview-equip-row');
    if (data.equipment) {
      equipRow.style.display = 'block';
      $('preview-client-equip').textContent = data.equipment;
    } else {
      equipRow.style.display = 'none';
    }

    // Rows
    const tableBody = $('preview-table-body');
    if (data.items.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #9ca3af; padding: 16px;">Sin ítems</td></tr>`;
    } else {
      tableBody.innerHTML = data.items.map(it => `
        <tr>
          <td>${escapeHtml(it.d || 'Servicio / Producto')}</td>
          <td class="text-right">${it.q}</td>
          <td class="text-right">${formatMoney(it.p)}</td>
          <td class="text-right" style="font-weight: 700;">${formatMoney(it.q * it.p)}</td>
        </tr>
      `).join('');
    }

    // Totals
    $('preview-subtotal').textContent = formatMoney(data.subtotal);
    
    const discRow = $('preview-discount-row');
    if (data.discountAmount > 0) {
      discRow.style.display = 'flex';
      $('preview-discount-val').textContent = '-' + formatMoney(data.discountAmount);
    } else {
      discRow.style.display = 'none';
    }

    const delivRow = $('preview-delivery-row');
    if (data.deliveryAmount > 0) {
      delivRow.style.display = 'flex';
      $('preview-delivery-val').textContent = '+' + formatMoney(data.deliveryAmount);
    } else {
      delivRow.style.display = 'none';
    }

    const taxRow = $('preview-tax-row');
    if (data.taxAmount > 0) {
      taxRow.style.display = 'flex';
      $('preview-tax-val').textContent = '+' + formatMoney(data.taxAmount);
    } else {
      taxRow.style.display = 'none';
    }

    $('preview-total').textContent = formatMoney(data.total);

    // Sticky mobile total bar
    $('sticky-total').textContent = formatMoney(data.total);
    $('sticky-count').textContent = data.items.length + (data.items.length === 1 ? ' ítem' : ' ítems');

    // Notes
    $('preview-notes').textContent = data.notes || '';

    // Update real-time feedback badges
    updatePhoneFeedback();
  }

  function updatePhoneFeedback() {
    // Client Phone feedback
    const clientPrefix = $('q-client-prefix') ? $('q-client-prefix').value : '57';
    const clientRaw = ($('q-client-phone') ? $('q-client-phone').value : '').replace(/\D/g, '');
    const feedbackBox = $('q-phone-feedback');
    const feedbackNum = $('q-phone-feedback-num');
    
    if (feedbackBox && feedbackNum) {
      if (!clientRaw) {
        feedbackBox.classList.remove('ready');
        feedbackNum.textContent = `+${clientPrefix} (escribe el número de WhatsApp)`;
      } else {
        const fullDisplay = getDisplayFormattedPhone(clientPrefix, clientRaw);
        if (clientPrefix === '57') {
          if (clientRaw.length === 10) {
            feedbackBox.classList.add('ready');
            feedbackNum.textContent = `${fullDisplay} (10 dígitos ✓ Completo)`;
          } else if (clientRaw.length < 10) {
            feedbackBox.classList.remove('ready');
            feedbackNum.textContent = `${fullDisplay} (${clientRaw.length}/10 dígitos - faltan ${10 - clientRaw.length})`;
          } else {
            feedbackBox.classList.add('ready');
            feedbackNum.textContent = `${fullDisplay} (Completo ✓)`;
          }
        } else {
          feedbackBox.classList.add('ready');
          feedbackNum.textContent = `${fullDisplay} (Completo ✓)`;
        }
      }
    }

    // Business Phone feedback
    const bPrefix = $('b-prefix') ? $('b-prefix').value : '57';
    const bRaw = ($('b-phone') ? $('b-phone').value : '').replace(/\D/g, '');
    const bFeedbackNum = $('b-phone-feedback-num');
    if (bFeedbackNum) {
      const bDisplay = getDisplayFormattedPhone(bPrefix, bRaw);
      bFeedbackNum.textContent = bDisplay;
    }
  }

  function renderCatalogManager() {
    const list = $('catalog-manage-list');
    const filter = ($('catalog-search').value || '').toLowerCase();

    const categories = [...new Set(state.catalog.map(c => c.c || 'Otros'))];
    $('catalog-category-datalist').innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join('');

    const filtered = state.catalog
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter(item => {
        return (item.n || '').toLowerCase().includes(filter) ||
               (item.c || '').toLowerCase().includes(filter);
      });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-dim);">
          No se encontraron productos o servicios que coincidan con la búsqueda.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(item => `
      <div class="catalog-item-row" data-index="${item.originalIndex}">
        <input type="text" list="catalog-category-datalist" data-field="c" value="${escapeHtml(item.c || '')}" placeholder="Categoría" class="cat-tag" />
        <input type="text" data-field="n" value="${escapeHtml(item.n)}" placeholder="Nombre del producto o servicio" />
        <input type="number" min="0" step="1000" data-field="p" value="${item.p}" placeholder="Precio" />
        <button class="btn-danger btn-icon" data-action="delete-cat-item" title="Eliminar del catálogo">✕</button>
      </div>
    `).join('');
  }

  function loadQuoteFromHistory(idx) {
    const saved = state.history[idx];
    if (!saved) return;

    $('q-client-name').value = saved.clientName || '';
    if (saved.clientPrefix && $('q-client-prefix')) {
      $('q-client-prefix').value = saved.clientPrefix;
    }
    $('q-client-phone').value = formatLocalPhone(saved.clientPhoneRaw || saved.clientPhone || '', $('q-client-prefix') ? $('q-client-prefix').value : '57');
    $('q-equipment').value = saved.equipment || '';
    $('q-discount').value = saved.discountPercent || 0;
    $('q-delivery').value = saved.deliveryAmount || 0;
    $('q-tax').value = saved.taxRate || 0;
    $('q-notes').value = saved.notes || state.business.terms;

    state.currentQuote.items = JSON.parse(JSON.stringify(saved.items || []));
    
    switchSubview('view-cotizador', 'cotizaciones');
    renderQuoteItems();
    renderLivePreview();
    showToast(`Cotización ${saved.quoteNumber} cargada`, '📋');
  }

  function duplicateQuoteFromHistory(idx) {
    const saved = state.history[idx];
    if (!saved) return;
    state.quoteNumber = getCalculatedNextQuoteNum();
    setStorage('pr_quote_num', state.quoteNumber);
    triggerIncrementalSync();

    $('q-client-name').value = saved.clientName || '';
    if (saved.clientPrefix && $('q-client-prefix')) {
      $('q-client-prefix').value = saved.clientPrefix;
    }
    $('q-client-phone').value = formatLocalPhone(saved.clientPhoneRaw || saved.clientPhone || '', $('q-client-prefix') ? $('q-client-prefix').value : '57');
    $('q-equipment').value = saved.equipment || '';
    $('q-discount').value = saved.discountPercent || 0;
    $('q-delivery').value = saved.deliveryAmount || 0;
    $('q-tax').value = saved.taxRate || 0;
    $('q-notes').value = saved.notes || state.business.terms;

    state.currentQuote.items = JSON.parse(JSON.stringify(saved.items || []));
    
    switchSubview('view-cotizador', 'cotizaciones');
    renderQuoteItems();
    renderLivePreview();
    showToast(`Cotización duplicada como ${getQuoteIdString()}`, '📑');
  }

  function renderHistory() {
    const list = $('history-list');
    if (!list) return;
    if (state.history.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📜</div>
          <h3 style="font-size: 1rem; color: var(--text-main); margin-bottom: 4px;">No hay cotizaciones guardadas</h3>
          <p style="font-size: 0.84rem;">Cuando envíes o guardes cotizaciones, aparecerán en este historial para consultarlas o duplicarlas.</p>
        </div>
      `;
      updateBadges();
      return;
    }

    list.innerHTML = state.history.slice().reverse().map((item, revIdx) => {
      const originalIdx = state.history.length - 1 - revIdx;
      return `
        <div class="history-card">
          <div class="history-meta">
            <h4>${escapeHtml(item.quoteNumber)} <span class="card-badge">${escapeHtml(item.clientName || 'General')}</span></h4>
            <p>📅 ${escapeHtml(item.issueDate)} · ${item.items.length} ítems ${(item.equipment ? '· 💻 ' + escapeHtml(item.equipment) : '')}</p>
          </div>
          <div class="history-side">
            <div class="history-price">${formatMoney(item.total)}</div>
            <div class="history-actions">
              <button type="button" class="btn-primary" data-action="load-history" data-index="${originalIdx}" title="Cargar cotización">✏️ Abrir</button>
              <button type="button" class="btn-secondary" data-action="duplicate-history" data-index="${originalIdx}" title="Duplicar cotización">📑 Duplicar</button>
              <button type="button" class="btn-secondary" data-action="pdf-history" data-index="${originalIdx}" title="Ver PDF">👁️ Ver PDF</button>
              <button type="button" class="btn-secondary" data-action="whatsapp-history" data-index="${originalIdx}" title="WhatsApp">📲 WhatsApp</button>
              <button type="button" class="btn-danger btn-icon" data-action="delete-history" data-index="${originalIdx}" title="Eliminar">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    updateBadges();
  }

  // Actualizar contadores en badges de navegación y widgets del Hub
  function updateBadges() {
    const qCount = (state.history && state.history.length) || 0;
    const cCount = (state.cobroHistory && state.cobroHistory.length) || 0;

    const qBadge = $('badge-quotes-count');
    if (qBadge) qBadge.textContent = qCount;
    const cBadge = $('badge-cobros-count');
    if (cBadge) cBadge.textContent = cCount;

    // Actualizar contadores en widgets del Menú Principal si existen en el DOM
    if ($('hub-stat-quotes-count')) $('hub-stat-quotes-count').textContent = qCount;

    let pendingCobrosCount = 0;
    let pendingCobrosTotal = 0;
    if (Array.isArray(state.cobroHistory)) {
      state.cobroHistory.forEach(item => {
        const saldo = (item.totals && typeof item.totals.saldo === 'number')
          ? item.totals.saldo
          : (parseFloat(item.saldo) || 0);
        if (item.status !== 'pagada' && saldo > 0) {
          pendingCobrosCount++;
          pendingCobrosTotal += saldo;
        }
      });
    }

    if ($('hub-stat-cobros-pending')) $('hub-stat-cobros-pending').textContent = formatMoney(pendingCobrosTotal);
    if ($('hub-badge-pending-val')) $('hub-badge-pending-val').textContent = formatMoney(pendingCobrosTotal);
    if ($('hub-stat-cobros-active-count')) {
      $('hub-stat-cobros-active-count').textContent = `${pendingCobrosCount} ${pendingCobrosCount === 1 ? 'cuenta activa' : 'cuentas activas'}`;
    }

    // Informes Técnicos badges & widgets
    const infCount = (state.informeHistory && state.informeHistory.length) || 0;
    const infBadge = $('badge-informes-count');
    if (infBadge) infBadge.textContent = infCount;

    let infPendingCount = 0;
    let infPendingTotal = 0;
    if (Array.isArray(state.informeHistory)) {
      state.informeHistory.forEach(item => {
        if (item.status === 'Enviado') {
          infPendingCount++;
          const propTotal = (item.propuestaItems || []).reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
          infPendingTotal += propTotal;
        }
      });
    }

    if ($('hub-stat-informes-count')) $('hub-stat-informes-count').textContent = infCount;
    if ($('hub-badge-informes-val')) $('hub-badge-informes-val').textContent = infPendingCount;
    if ($('hub-badge-informes-label')) $('hub-badge-informes-label').textContent = infPendingCount === 1 ? '1 EN ESPERA' : `${infPendingCount} EN ESPERA`;

    // Actualizar tarjetas resumen en las pantallas de entrada
    updateSectionEntrySummaries();
  }

  // Tarjetas resumen en las pantallas de entrada de Cuentas de Cobro, Cotizaciones e Informes
  function updateSectionEntrySummaries() {
    // 1. Resumen Cuentas de Cobro
    const cobroHist = Array.isArray(state.cobroHistory) ? state.cobroHistory : [];
    let pendingCount = 0;
    let pendingTotal = 0;
    let paidCount = 0;
    let paidTotal = 0;
    const pendingItems = [];

    cobroHist.forEach(item => {
      const saldo = (item.totals && typeof item.totals.saldo === 'number')
        ? item.totals.saldo
        : (parseFloat(item.saldo) || 0);
      const isPaid = item.status === 'pagada';

      if (isPaid) {
        paidCount++;
        paidTotal += saldo;
      } else {
        if (saldo > 0) {
          pendingCount++;
          pendingTotal += saldo;
          pendingItems.push({
            num: item.cobroNumber || String(item.cobroNum || 1).padStart(3, '0'),
            rawNum: item.cobroNum,
            client: item.clientName || 'Cliente General',
            saldo: saldo
          });
        }
      }
    });

    if ($('cobro-entry-stat-pending')) $('cobro-entry-stat-pending').textContent = formatMoney(pendingTotal);
    if ($('cobro-entry-stat-pending-count')) {
      $('cobro-entry-stat-pending-count').textContent = `${pendingCount} ${pendingCount === 1 ? 'cuenta por cobrar' : 'cuentas por cobrar'}`;
    }
    if ($('cobro-entry-stat-paid')) $('cobro-entry-stat-paid').textContent = formatMoney(paidTotal);
    if ($('cobro-entry-stat-paid-count')) {
      $('cobro-entry-stat-paid-count').textContent = `${paidCount} ${paidCount === 1 ? 'cuenta pagada' : 'cuentas pagadas'}`;
    }
    if ($('cobro-entry-badge-status')) {
      const badge = $('cobro-entry-badge-status');
      badge.textContent = pendingCount > 0 ? `${pendingCount} pendientes` : '✅ Al día';
      badge.className = `card-badge ${pendingCount > 0 ? 'badge-pending' : 'badge-paid'}`;
    }

    const cobroListEl = $('cobro-entry-pending-list');
    if (cobroListEl) {
      if (pendingItems.length === 0) {
        cobroListEl.innerHTML = `
          <div class="entry-empty-pending-state">
            <span class="empty-icon">🎉</span>
            <div class="entry-empty-text">
              <strong style="color: #34d399; font-size: 0.86rem; display: block;">¡Al día! No tienes cuentas pendientes</strong>
              <span style="color: var(--text-muted); font-size: 0.78rem;">Todas tus cuentas registradas están marcadas como pagadas.</span>
            </div>
          </div>
        `;
      } else {
        const recentPending = pendingItems.slice(-5).reverse();
        cobroListEl.innerHTML = recentPending.map(item => `
          <div class="entry-pending-row" data-cobro-num="${item.rawNum}" title="Toca para ver o editar esta cuenta">
            <div class="entry-pending-row-left">
              <span class="entry-pending-num">Cuenta N° ${escapeHtml(item.num)}</span>
              <span class="entry-pending-client">${escapeHtml(item.client)}</span>
            </div>
            <div class="entry-pending-row-right">
              <span class="entry-pending-amount">${formatMoney(item.saldo)}</span>
              <span class="entry-pending-arrow">→</span>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Resumen Cotizaciones
    const quoteHist = Array.isArray(state.history) ? state.history : [];
    const qCount = quoteHist.length;
    if ($('cot-entry-badge-count')) {
      $('cot-entry-badge-count').textContent = `${qCount} ${qCount === 1 ? 'cotización' : 'cotizaciones'}`;
    }

    const cotListEl = $('cot-entry-recent-list');
    if (cotListEl) {
      if (qCount === 0) {
        cotListEl.innerHTML = `
          <div class="entry-empty-pending-state">
            <span class="empty-icon">📝</span>
            <div class="entry-empty-text">
              <strong style="color: #cbd5e1; font-size: 0.86rem; display: block;">No hay cotizaciones guardadas aún</strong>
              <span style="color: var(--text-muted); font-size: 0.78rem;">Tus cotizaciones guardadas se listarán aquí para acceso rápido.</span>
            </div>
          </div>
        `;
      } else {
        const recentQuotes = quoteHist.slice(-5).reverse();
        cotListEl.innerHTML = recentQuotes.map((q, idx) => {
          const originalIdx = quoteHist.length - 1 - idx;
          return `
            <div class="entry-pending-row" data-quote-index="${originalIdx}" title="Toca para abrir esta cotización">
              <div class="entry-pending-row-left">
                <span class="entry-pending-num">${escapeHtml(q.quoteNumber || 'COT')}</span>
                <span class="entry-pending-client">${escapeHtml(q.clientName || 'General')}</span>
              </div>
              <div class="entry-pending-row-right">
                <span class="entry-pending-amount" style="color: var(--primary-neon);">${formatMoney(q.total || 0)}</span>
                <span class="entry-pending-arrow">→</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Resumen Informes Técnicos
    const infHist = Array.isArray(state.informeHistory) ? state.informeHistory : [];
    const infCountAll = infHist.length;
    let infPendingCountSummary = 0;
    let infPendingTotalSummary = 0;
    let infApprovedCountSummary = 0;

    infHist.forEach(item => {
      const propTotal = (item.propuestaItems || []).reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
      if (item.status === 'Enviado') {
        infPendingCountSummary++;
        infPendingTotalSummary += propTotal;
      } else if (item.status === 'Aprobado') {
        infApprovedCountSummary++;
      }
    });

    if ($('inf-entry-badge-status')) {
      $('inf-entry-badge-status').textContent = `${infCountAll} ${infCountAll === 1 ? 'informe' : 'informes'}`;
    }
    if ($('inf-entry-stat-pending-val')) {
      $('inf-entry-stat-pending-val').textContent = formatMoneyCop(infPendingTotalSummary);
    }
    if ($('inf-entry-stat-pending-count')) {
      $('inf-entry-stat-pending-count').textContent = `${infPendingCountSummary} ${infPendingCountSummary === 1 ? 'informe en espera' : 'informes en espera'}`;
    }
    if ($('inf-entry-stat-total-count')) {
      $('inf-entry-stat-total-count').textContent = infCountAll;
    }
    if ($('inf-entry-stat-approved-count')) {
      $('inf-entry-stat-approved-count').textContent = `${infApprovedCountSummary} ${infApprovedCountSummary === 1 ? 'aprobado' : 'aprobados'} en el historial`;
    }

    const infRecentList = $('inf-entry-recent-list');
    if (infRecentList) {
      if (infCountAll === 0) {
        infRecentList.innerHTML = `
          <div class="entry-empty-pending-state">
            <span class="empty-icon">🛠️</span>
            <div class="entry-empty-text">
              <strong style="color: #38bdf8; font-size: 0.86rem; display: block;">No hay informes técnicos registrados aún</strong>
              <span style="color: var(--text-muted); font-size: 0.78rem;">Tus diagnósticos técnicos guardados aparecerán aquí con su propuesta y estado.</span>
            </div>
          </div>
        `;
      } else {
        const recentInf = infHist.slice(-5).reverse();
        infRecentList.innerHTML = recentInf.map(item => {
          const propTotal = (item.propuestaItems || []).reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
          const st = item.status || 'Borrador';
          const badgeClass = st === 'Enviado' ? 'badge-enviado' : (st === 'Aprobado' ? 'badge-aprobado' : (st === 'Rechazado' ? 'badge-rechazado' : 'badge-borrador'));
          return `
            <div class="entry-pending-row entry-inf-row" data-inf-id="${escapeHtml(item.id || '')}" data-inf-num="${escapeHtml(item.number || '')}" title="Toca para abrir y editar este informe">
              <div class="entry-pending-row-left">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  <span class="entry-pending-num" style="color: #38bdf8;">${escapeHtml(item.number || 'INF')}</span>
                  <span class="card-badge ${badgeClass}" style="font-size: 0.68rem; padding: 1px 6px;">${escapeHtml(st)}</span>
                </div>
                <span class="entry-pending-client" style="font-size: 0.82rem;">${escapeHtml(item.clientName || 'Cliente General')} · ${escapeHtml(item.equipment || '')}</span>
              </div>
              <div class="entry-pending-row-right">
                <span class="entry-pending-amount" style="color: #38bdf8; font-size: 0.84rem;">${formatMoneyCop(propTotal)}</span>
                <span class="entry-pending-arrow">→</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // --- Toast Notification ---
  function showToast(msg, icon = '✅') {
    const toast = $('toast');
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(msg)}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // --- Modal Notification ---
  function showModal(title, bodyHtml, confirmText = 'Aceptar', onConfirm = null) {
    $('modal-title').innerHTML = title;
    $('modal-body').innerHTML = bodyHtml;
    const okBtn = $('modal-confirm-btn');
    okBtn.textContent = confirmText;
    
    const overlay = $('modal-overlay');
    overlay.classList.add('active');

    okBtn.onclick = () => {
      overlay.classList.remove('active');
      if (typeof onConfirm === 'function') onConfirm();
    };

    $('modal-close-btn').onclick = () => {
      overlay.classList.remove('active');
    };
  }

  // --- Save / History Helpers ---
  function saveCurrentToHistory(auto = false) {
    if (state.currentQuote.items.length === 0) return;
    const data = getFullQuoteData();
    data.updatedAt = new Date().toISOString();
    
    // Check if exists
    const existingIdx = state.history.findIndex(h => h.quoteNumber === data.quoteNumber);
    if (existingIdx >= 0) {
      data.id = state.history[existingIdx].id || generateUUID();
      state.history[existingIdx] = data;
    } else {
      data.id = data.id || generateUUID();
      state.history.push(data);
      checkQuoteNumberCollision(data.quoteNumber, data.id);
    }
    setStorage('pr_history', state.history);
    renderHistory();
    if (!auto) showToast('Cotización guardada en el historial', '💾');
    triggerIncrementalSync();
  }

  function validateHasItems() {
    if (state.currentQuote.items.length === 0) {
      showToast('Agrega al menos un producto o servicio para cotizar.', '⚠️');
      $('catalog-select').focus();
      return false;
    }
    return true;
  }

  // Plain WhatsApp text generator
  function generatePlainText(data) {
    let t = `*${data.businessName || 'Pedro Roa'}*\n`;
    t += `📄 *Cotización:* ${data.quoteNumber}\n`;
    t += `📅 *Fecha:* ${data.issueDate}\n`;
    t += `👤 *Cliente:* ${data.clientName || 'General'}\n`;
    if (data.equipment) t += `💻 *Equipo:* ${data.equipment}\n`;
    t += `\n*DETALLE DE SERVICIOS / PRODUCTOS:*\n`;
    data.items.forEach(i => {
      t += `• ${i.q}x ${i.d} — ${formatMoney(i.q * i.p)}\n`;
    });

    if (data.discountAmount > 0) t += `\nDescuento (${data.discountPercent}%): -${formatMoney(data.discountAmount)}`;
    if (data.deliveryAmount > 0) t += `\nDomicilio / Visita: +${formatMoney(data.deliveryAmount)}`;
    if (data.taxAmount > 0) t += `\nIVA 19%: +${formatMoney(data.taxAmount)}`;

    t += `\n\n💰 *TOTAL: ${formatMoney(data.total)}*\n`;
    t += `⏰ *Válida hasta:* ${data.expireDate}\n\n`;
    if (data.notes) t += `📝 *Condiciones:*\n${data.notes}\n\n`;
    t += `Contacto WhatsApp: ${data.businessPhone || '3024555428'}`;
    return t;
  }

  // ==========================================================================
  // CUENTAS DE COBRO - LÓGICA Y FUNCIONES
  // ==========================================================================

  // Conversión de números a letras en español según estándar legal colombiano
  function numeroALetras(num) {
    num = Math.round(Number(num) || 0);
    const formattedNumber = num.toLocaleString('es-CO');
    if (num === 0) return 'Cero pesos m/cte. ($0.oo)';
    if (num < 0) return 'Menos ' + numeroALetras(-num);

    const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const DECENAS_10 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const VEINTES = ['veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    function seccionMenorMil(n) {
      if (n === 0) return '';
      if (n === 100) return 'cien';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;
      let res = '';
      if (c > 0) res += CENTENAS[c] + ' ';
      if (d === 1) {
        res += DECENAS_10[u];
      } else if (d === 2) {
        res += VEINTES[u];
      } else if (d > 2) {
        res += DECENAS[d];
        if (u > 0) res += ' y ' + UNIDADES[u];
      } else if (u > 0) {
        res += UNIDADES[u];
      }
      return res.trim();
    }

    function resolver(n) {
      const millones = Math.floor(n / 1000000);
      const restoMillones = n % 1000000;
      const miles = Math.floor(restoMillones / 1000);
      const unidades = restoMillones % 1000;

      const partes = [];
      if (millones > 0) {
        if (millones === 1) partes.push('un millón');
        else partes.push(seccionMenorMil(millones) + ' millones');
      }
      if (miles > 0) {
        if (miles === 1) partes.push('mil');
        else partes.push(seccionMenorMil(miles) + ' mil');
      }
      if (unidades > 0) {
        partes.push(seccionMenorMil(unidades));
      }
      return partes.join(' ');
    }

    const letras = resolver(num);
    const esDePesos = (num >= 1000000 && (num % 1000000 === 0));
    const sufijo = num === 1 ? 'peso m/cte.' : (esDePesos ? 'de pesos m/cte.' : 'pesos m/cte.');

    const resultado = `${letras} ${sufijo} ($${formattedNumber}.oo)`;
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  }

  // Formateo de fecha de Cuenta de Cobro (ej: "28 de julio de 2026")
  function formatCobroDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = months[m - 1] || '';
    return `${d} de ${monthName} de ${y}`;
  }

  // Cálculos de saldo de Cuenta de Cobro
  function calculateCobroTotals() {
    const totalConceptos = state.cobroConceptos.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalAdelantos = state.cobroAdelantos.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const saldo = Math.max(0, totalConceptos - totalAdelantos);
    const hasOverAdelanto = totalAdelantos > totalConceptos && totalConceptos > 0;
    return {
      totalConceptos,
      totalAdelantos,
      saldo,
      hasOverAdelanto
    };
  }

  // Recopilar todos los datos de la Cuenta de Cobro para exportación y renderizado
  function getFullCobroData() {
    // Sincronizar primero directamente con los valores actuales en pantalla
    if ($('cc-num')) {
      const n = parseInt($('cc-num').value, 10);
      if (!isNaN(n) && n > 0) {
        state.cobroNum = n;
        setStorage('pr_cobro_num', n);
      }
    }
    if ($('cc-doc-city')) {
      state.cobroDocCity = $('cc-doc-city').value;
      setStorage('pr_cobro_doc_city', state.cobroDocCity);
    }
    if ($('cc-doc-date')) {
      state.cobroDocDate = $('cc-doc-date').value;
      setStorage('pr_cobro_doc_date', state.cobroDocDate);
    }
    if ($('cc-client-name')) {
      state.cobroClientName = $('cc-client-name').value;
      setStorage('pr_cobro_client_name', state.cobroClientName);
    }
    if ($('cc-client-nit')) {
      state.cobroClientNit = $('cc-client-nit').value;
      setStorage('pr_cobro_client_nit', state.cobroClientNit);
    }
    if ($('cc-include-logo')) {
      state.cobroIncludeLogo = $('cc-include-logo').checked;
      setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
    }
    if ($('cc-include-legal')) {
      state.cobroIncludeLegal = $('cc-include-legal').checked;
      setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
    }
    if ($('cc-legal-text')) {
      state.cobroLegalText = $('cc-legal-text').value;
      setStorage('pr_cobro_legal_text', state.cobroLegalText);
    }

    // Campo de notas y casilla: lectura DIRECTA e INMEDIATA del DOM
    const notesInput = $('cc-notes');
    const chkIncludeNotes = $('cc-include-notes');

    const liveIncludeNotes = chkIncludeNotes ? chkIncludeNotes.checked : (state.cobroIncludeNotes !== false);
    const liveNotes = notesInput
      ? notesInput.value
      : ((typeof state.cobroNotes === 'string') ? state.cobroNotes : (state.cobroDefaultNotes || DEFAULT_COBRO_NOTES));

    state.cobroIncludeNotes = liveIncludeNotes;
    state.cobroNotes = liveNotes;
    setStorage('pr_cobro_include_notes', state.cobroIncludeNotes);
    setStorage('pr_cobro_notes', state.cobroNotes);

    const totals = calculateCobroTotals();
    const emisor = state.cobroEmisor || DEFAULT_COBRO_EMISOR;
    const numFormatted = String(state.cobroNum || 1).padStart(3, '0');
    const city = state.cobroDocCity || 'Bogotá';
    const dateFormatted = formatCobroDate(state.cobroDocDate);
    const clientName = state.cobroClientName.trim() || 'Nombre del Cliente o Empresa';
    const clientNit = state.cobroClientNit.trim();
    const validConceptos = (state.cobroConceptos || []).filter(c => (c.desc && c.desc.trim()) || (parseFloat(c.amount) > 0));
    const validAdelantos = (state.cobroAdelantos || []).filter(a => (a.desc && a.desc.trim()) || (parseFloat(a.amount) > 0));

    const cobroData = {
      cobroNumber: numFormatted,
      city,
      dateIso: state.cobroDocDate,
      dateFormatted,
      clientName,
      clientNit,
      emisor: {
        name: emisor.name || 'Pedro Luis Roa Mora',
        cc: emisor.cc || '1.015.409.172',
        city: emisor.city || 'Bogotá',
        phone: emisor.phone || '3024555428',
        address: emisor.address || 'Carrera 70g 78a-80'
      },
      conceptos: validConceptos.length > 0 ? validConceptos : [{ desc: 'Concepto pendiente por especificar', amount: 0 }],
      adelantos: validAdelantos,
      totals,
      saldoLetras: numeroALetras(totals.saldo),
      includeLegal: state.cobroIncludeLegal !== false,
      legalText: state.cobroLegalText || DEFAULT_LEGAL_TEXT,
      includeLogo: state.cobroIncludeLogo !== false,
      includeNotes: liveIncludeNotes,
      notes: liveNotes,
      firma: state.cobroFirma || ''
    };
    cobroData.fullMessageText = generateCobroPlainText(cobroData);
    return cobroData;
  }

  // Clientes frecuentes sugeridos
  function saveCobroClient(name, nit) {
    name = (name || '').trim();
    nit = (nit || '').trim();
    if (!name) return;
    const nowIso = new Date().toISOString();
    const idx = state.cobroClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      if (nit) state.cobroClients[idx].nit = nit;
      state.cobroClients[idx].updatedAt = nowIso;
      if (!state.cobroClients[idx].id || !isValidUUID(state.cobroClients[idx].id)) {
        state.cobroClients[idx].id = generateUUID();
      }
    } else {
      state.cobroClients.unshift({ id: generateUUID(), name, nit, updatedAt: nowIso });
    }
    if (state.cobroClients.length > 40) state.cobroClients.pop();
    setStorage('pr_cobro_clients', state.cobroClients);
    renderCobroClientsDatalist();
    triggerIncrementalSync();
  }

  function renderCobroClientsDatalist() {
    const dl = $('cc-clients-datalist');
    if (!dl) return;
    dl.innerHTML = state.cobroClients
      .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.nit ? 'NIT/CC: ' + c.nit : '')}</option>`)
      .join('');
  }

  // Renderizar líneas de conceptos
  function renderCobroConceptos() {
    const container = $('cc-conceptos-list');
    if (!container) return;
    if (!state.cobroConceptos || state.cobroConceptos.length === 0) {
      state.cobroConceptos = [{ desc: '', amount: 0 }];
    }
    container.innerHTML = state.cobroConceptos.map((item, index) => `
      <div class="cc-line-row" data-index="${index}">
        <input type="text" class="cc-line-desc" data-field="desc" placeholder="Descripción del concepto o servicio" value="${escapeHtml(item.desc)}">
        <input type="number" class="cc-line-val" data-field="amount" placeholder="0" min="0" step="1000" value="${item.amount ? item.amount : ''}">
        <button type="button" class="btn-icon btn-danger btn-cc-del-concepto" data-index="${index}" title="Eliminar concepto" aria-label="Eliminar concepto">🗑️</button>
      </div>
    `).join('');
  }

  // Renderizar líneas de adelantos
  function renderCobroAdelantos() {
    const container = $('cc-adelantos-list');
    if (!container) return;
    if (!state.cobroAdelantos || state.cobroAdelantos.length === 0) {
      container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-dim); font-style: italic; padding: 4px 0;">No hay adelantos registrados (opcional).</div>';
      return;
    }
    container.innerHTML = state.cobroAdelantos.map((item, index) => `
      <div class="cc-line-row" data-index="${index}">
        <input type="text" class="cc-line-desc" data-field="desc" placeholder="Ej: Anticipo recibido el 10 de julio" value="${escapeHtml(item.desc)}">
        <input type="number" class="cc-line-val" data-field="amount" placeholder="0" min="0" step="1000" value="${item.amount ? item.amount : ''}">
        <button type="button" class="btn-icon btn-danger btn-cc-del-adelanto" data-index="${index}" title="Eliminar adelanto" aria-label="Eliminar adelanto">🗑️</button>
      </div>
    `).join('');
  }

  // Visualización de firma
  function renderCobroFirmaUI() {
    const previewBox = $('cc-firma-preview-box');
    const previewImg = $('cc-firma-preview-img');
    const btnRemove = $('btn-cc-remove-firma');
    const statusText = $('cc-firma-status');

    if (!previewBox || !previewImg || !btnRemove || !statusText) return;

    if (state.cobroFirma) {
      previewImg.src = state.cobroFirma;
      previewBox.style.display = 'block';
      btnRemove.style.display = 'inline-block';
      statusText.textContent = 'Firma activa y cargada';
      statusText.style.color = 'var(--whatsapp)';
    } else {
      previewImg.src = '';
      previewBox.style.display = 'none';
      btnRemove.style.display = 'none';
      statusText.textContent = 'Sin firma (espacio en blanco)';
      statusText.style.color = 'var(--text-muted)';
    }
  }

  // Panel plegable "Mis Datos"
  function toggleEmisorPanel() {
    const panel = $('cc-emisor-panel');
    const icon = $('cc-emisor-accordion-icon');
    if (!panel) return;
    const isCollapsed = panel.classList.contains('is-collapsed');
    if (isCollapsed) {
      panel.classList.remove('is-collapsed');
      if (icon) icon.textContent = '▲';
    } else {
      panel.classList.add('is-collapsed');
      if (icon) icon.textContent = '▼';
    }
  }

  // Vista previa plegable / desplegable de Cuenta de Cobro
  function updateCobroPreviewCollapseUI(isCollapsed) {
    const container = $('cobro-preview-collapsible');
    const btn = $('btn-toggle-cobro-preview');
    const txt = $('cobro-preview-toggle-text');
    const icon = $('cobro-preview-toggle-icon');

    if (!container) return;

    if (isCollapsed) {
      container.classList.add('is-collapsed');
      if (btn) {
        btn.classList.add('is-collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }
      if (txt) txt.textContent = 'Mostrar vista previa';
      if (icon) icon.textContent = '▼';
    } else {
      container.classList.remove('is-collapsed');
      if (btn) {
        btn.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded', 'true');
      }
      if (txt) txt.textContent = 'Ocultar vista previa';
      if (icon) icon.textContent = '▲';
    }
  }

  function toggleCobroPreviewCollapse() {
    const container = $('cobro-preview-collapsible');
    if (!container) return;
    const willCollapse = !container.classList.contains('is-collapsed');
    state.cobroPreviewCollapsed = willCollapse;
    updateCobroPreviewCollapseUI(willCollapse);
    setStorage('pr_cobro_preview_collapsed', willCollapse);
  }

  // Renderizar la vista previa del documento oficial de Cuenta de Cobro (Una sola fuente de datos para pantalla, PDF e impresión)
  function renderCobroPreview(data) {
    if (!data) data = getFullCobroData();
    const totals = data.totals || calculateCobroTotals();
    const numFormatted = String(data.cobroNumber || state.cobroNum || 1).padStart(3, '0');
    const city = data.city || state.cobroDocCity || 'Bogotá';
    const dateFormatted = data.dateFormatted || formatCobroDate(data.dateIso || state.cobroDocDate);
    const clientName = (data.clientName || 'Nombre del Cliente o Empresa').trim();
    const clientNit = (data.clientNit || '').trim();
    const emisor = data.emisor || state.cobroEmisor || DEFAULT_COBRO_EMISOR;

    // Actualizar badges y tarjeta de totales
    if ($('cc-badge-number')) $('cc-badge-number').textContent = `Cuenta ${numFormatted}`;
    if ($('cc-calc-total-conceptos')) $('cc-calc-total-conceptos').textContent = formatMoney(totals.totalConceptos);
    if ($('cc-calc-total-adelantos')) $('cc-calc-total-adelantos').textContent = '-' + formatMoney(totals.totalAdelantos);
    if ($('cc-calc-saldo-final')) $('cc-calc-saldo-final').textContent = formatMoney(totals.saldo);
    if ($('cc-calc-letras-box')) $('cc-calc-letras-box').textContent = numeroALetras(totals.saldo);

    // Aviso si los adelantos superan los conceptos
    if ($('cc-warning-box')) {
      $('cc-warning-box').style.display = totals.hasOverAdelanto ? 'block' : 'none';
    }

    // 0. Logo oficial arriba
    if ($('cc-doc-preview-logo-wrap')) {
      $('cc-doc-preview-logo-wrap').style.display = (data.includeLogo !== false) ? 'block' : 'none';
    }

    // 1. Ciudad y fecha, en negrita, alineado a la izquierda
    if ($('cc-doc-preview-date-city')) {
      $('cc-doc-preview-date-city').innerHTML = `<strong>${escapeHtml(city)}, ${escapeHtml(dateFormatted)}</strong>`;
    }

    // 2. "Cuenta de cobro 012", centrado y en negrita
    if ($('cc-doc-preview-title')) {
      $('cc-doc-preview-title').innerHTML = `<strong>Cuenta de cobro ${escapeHtml(numFormatted)}</strong>`;
    }

    // 3. Nombre de la empresa o cliente en letra grande y negrita, con "Nit." debajo. Centrado.
    if ($('cc-doc-preview-client-name')) {
      $('cc-doc-preview-client-name').innerHTML = `<strong>${escapeHtml(clientName)}</strong>`;
    }
    if ($('cc-doc-preview-client-nit')) {
      $('cc-doc-preview-client-nit').textContent = clientNit ? `Nit. ${clientNit}` : 'Nit. (Por registrar)';
    }

    // 5. Nombre de quien cobra en mayúsculas y "C.C. ... de Bogotá" debajo. Centrado.
    if ($('cc-doc-preview-emisor-name')) {
      $('cc-doc-preview-emisor-name').innerHTML = `<strong>${escapeHtml((emisor.name || 'PEDRO LUIS ROA MORA').toUpperCase())}</strong>`;
    }
    if ($('cc-doc-preview-emisor-cc')) {
      $('cc-doc-preview-emisor-cc').textContent = `C.C. ${emisor.cc || '1.015.409.172'} de ${emisor.city || 'Bogotá'}`;
    }

    // 7. El saldo en letras y número, en negrita y centrado
    if ($('cc-doc-preview-amount-box')) {
      $('cc-doc-preview-amount-box').innerHTML = `<strong>${numeroALetras(totals.saldo)}</strong>`;
    }

    // 8. "Por concepto de:" y cada concepto como viñeta
    if ($('cc-doc-preview-conceptos-list')) {
      const validConceptos = (data.conceptos || state.cobroConceptos || []).filter(c => (c.desc && c.desc.trim()) || c.amount > 0);
      if (validConceptos.length > 0) {
        $('cc-doc-preview-conceptos-list').innerHTML = validConceptos.map(c => `
          <li>${escapeHtml(c.desc || 'Servicio')} por ${formatMoney(c.amount)}</li>
        `).join('');
      } else {
        $('cc-doc-preview-conceptos-list').innerHTML = `<li>Concepto pendiente por especificar por $0</li>`;
      }
    }

    // Resumen de adelantos si los hay
    const validAdelantos = (data.adelantos || state.cobroAdelantos || []).filter(a => (a.desc && a.desc.trim()) || a.amount > 0);
    if ($('cc-doc-preview-resumen-box')) {
      if (validAdelantos.length > 0) {
        $('cc-doc-preview-resumen-box').style.display = 'block';
        if ($('cc-doc-resumen-total')) $('cc-doc-resumen-total').textContent = formatMoney(totals.totalConceptos);
        if ($('cc-doc-resumen-adelantos')) $('cc-doc-resumen-adelantos').textContent = '-' + formatMoney(totals.totalAdelantos);
        if ($('cc-doc-resumen-saldo')) $('cc-doc-resumen-saldo').innerHTML = `<strong>${formatMoney(totals.saldo)}</strong>`;
      } else {
        $('cc-doc-preview-resumen-box').style.display = 'none';
      }
    }

    // 8.5 Garantías y observaciones (debajo de conceptos/adelantos y antes del texto legal)
    const notesBox = $('cc-doc-preview-notes-box');
    const notesText = $('cc-doc-preview-notes-text');
    const notesClean = (typeof data.notes === 'string') ? data.notes.trim() : '';
    const hasCobroNotes = (data.includeNotes !== false) && (notesClean.length > 0);
    if (notesBox && notesText) {
      if (hasCobroNotes) {
        notesBox.style.display = 'block';
        notesText.textContent = notesClean;
      } else {
        notesBox.style.display = 'none';
        notesText.textContent = '';
      }
    }

    // 9. Texto legal en letra pequeña (si está activado)
    if ($('cc-doc-preview-legal-box')) {
      if (data.includeLegal !== false) {
        $('cc-doc-preview-legal-box').style.display = 'block';
        const paragraphs = (data.legalText || state.cobroLegalText || DEFAULT_LEGAL_TEXT).split('\n').filter(p => p.trim());
        $('cc-doc-preview-legal-box').innerHTML = paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
      } else {
        $('cc-doc-preview-legal-box').style.display = 'none';
      }
    }

    // 10. "Cordialmente,", la firma, el nombre, C.C., teléfono y dirección
    const firmaSrc = data.firma || state.cobroFirma;
    if ($('cc-doc-preview-firma-wrap') && $('cc-doc-preview-firma-blank') && $('cc-doc-preview-firma-img')) {
      if (firmaSrc) {
        $('cc-doc-preview-firma-img').src = firmaSrc;
        $('cc-doc-preview-firma-wrap').style.display = 'flex';
        $('cc-doc-preview-firma-blank').style.display = 'none';
      } else {
        $('cc-doc-preview-firma-img').src = '';
        $('cc-doc-preview-firma-wrap').style.display = 'none';
        $('cc-doc-preview-firma-blank').style.display = 'block';
      }
    }
    if ($('cc-doc-preview-sign-name')) $('cc-doc-preview-sign-name').textContent = emisor.name || 'Pedro Luis Roa Mora';
    if ($('cc-doc-preview-sign-cc')) $('cc-doc-preview-sign-cc').textContent = `C.C. ${emisor.cc || '1.015.409.172'} de ${emisor.city || 'Bogotá'}`;
    if ($('cc-doc-preview-sign-phone')) $('cc-doc-preview-sign-phone').textContent = `Teléfono: ${emisor.phone || '3024555428'}`;
    if ($('cc-doc-preview-sign-address')) $('cc-doc-preview-sign-address').textContent = `Dirección: ${emisor.address || 'Carrera 70g 78a-80'}`;

    // Sincronizar barra fija inferior si corresponde
    updateMobileStickyBar();
  }

  // Texto plano para WhatsApp y portapapeles
  function generateCobroPlainText(data) {
    if (!data) data = getFullCobroData();
    const totals = data.totals || calculateCobroTotals();
    const numStr = String(data.cobroNumber || state.cobroNum || 1).padStart(3, '0');
    const dateFormatted = data.dateFormatted || formatCobroDate(data.dateIso || state.cobroDocDate);
    const clientName = (data.clientName || state.cobroClientName || 'Cliente').trim();
    const clientNit = (data.clientNit || state.cobroClientNit || '').trim() ? ` (NIT/C.C.: ${(data.clientNit || state.cobroClientNit).trim()})` : '';

    let text = `*CUENTA DE COBRO N° ${numStr}*\n`;
    text += `*${(data.emisor?.name || state.cobroEmisor.name || 'Pedro Luis Roa Mora').toUpperCase()}*\n`;
    text += `C.C. ${data.emisor?.cc || state.cobroEmisor.cc || '1.015.409.172'} de ${data.emisor?.city || state.cobroEmisor.city || 'Bogotá'}\n\n`;
    text += `📅 *Fecha:* ${data.city || state.cobroDocCity || 'Bogotá'}, ${dateFormatted}\n`;
    text += `🏢 *Cliente:* ${clientName}${clientNit}\n\n`;

    text += `*Por concepto de:*\n`;
    (data.conceptos || state.cobroConceptos || []).forEach(c => {
      if (c.desc || c.amount) {
        text += `• ${c.desc || 'Servicio'}: ${formatMoney(c.amount)}\n`;
      }
    });

    const adelantos = data.adelantos || state.cobroAdelantos || [];
    if (adelantos.length > 0) {
      text += `\n*Total conceptos:* ${formatMoney(totals.totalConceptos)}\n`;
      adelantos.forEach(a => {
        if (a.desc || a.amount) {
          text += `• Anticipo (${a.desc || 'Abono'}): -${formatMoney(a.amount)}\n`;
        }
      });
      text += `*Total adelantos:* -${formatMoney(totals.totalAdelantos)}\n`;
    }

    text += `\n💰 *SALDO A COBRAR: ${formatMoney(totals.saldo)}*\n`;
    text += `_${numeroALetras(totals.saldo)}_\n\n`;

    const notesMsg = (typeof data.notes === 'string') ? data.notes.trim() : '';
    if (data.includeNotes !== false && notesMsg) {
      text += `*Garantías y observaciones:*\n${notesMsg}\n\n`;
    }

    text += `Cordialmente,\n`;
    text += `${data.emisor?.name || state.cobroEmisor.name || 'Pedro Luis Roa Mora'}\n`;
    text += `Tel: ${data.emisor?.phone || state.cobroEmisor.phone || '3024555428'}\n`;
    text += `Dirección: ${data.emisor?.address || state.cobroEmisor.address || 'Carrera 70g 78a-80'}`;
    return text;
  }

  // Barra fija inferior para celulares
  function updateMobileStickyBar() {
    const activeSection = document.querySelector('.view-section.active');
    const stickyBar = document.querySelector('.mobile-sticky-bar');
    if (!stickyBar) return;

    if (activeSection && activeSection.id === 'view-cuentas-cobro') {
      stickyBar.style.display = 'flex';
      const totals = calculateCobroTotals();
      const countLabel = $('sticky-count');
      const amountLabel = $('sticky-total');
      const btnSticky = $('sticky-btn-pdf');
      if (countLabel) countLabel.textContent = `Cuenta ${String(state.cobroNum || 1).padStart(3, '0')}`;
      if (amountLabel) amountLabel.textContent = formatMoney(totals.saldo);
      if (btnSticky) {
        btnSticky.innerHTML = '<span>👁️</span> Ver PDF';
      }
    } else if (activeSection && activeSection.id === 'view-cotizador') {
      stickyBar.style.display = 'flex';
      const totals = calculateTotals();
      const count = state.currentQuote.items.length;
      const countLabel = $('sticky-count');
      const amountLabel = $('sticky-total');
      const btnSticky = $('sticky-btn-pdf');
      if (countLabel) countLabel.textContent = `${count} ${count === 1 ? 'ítem' : 'ítems'}`;
      if (amountLabel) amountLabel.textContent = formatMoney(totals.total);
      if (btnSticky) {
        btnSticky.innerHTML = '<span>📲</span> Enviar PDF';
      }
    } else if (activeSection && activeSection.id === 'view-informe-tecnico') {
      stickyBar.style.display = 'flex';
      const items = (state.currentInformePropuestas || []).filter(p => p.desc || parseFloat(p.valor) > 0);
      const total = items.reduce((sum, i) => sum + (parseFloat(i.valor) || 0), 0);
      const numVal = $('inf-num') ? $('inf-num').value : 'INF-0001';
      const countLabel = $('sticky-count');
      const amountLabel = $('sticky-total');
      const btnSticky = $('sticky-btn-pdf');
      if (countLabel) countLabel.textContent = numVal;
      if (amountLabel) amountLabel.textContent = formatMoneyCop(total);
      if (btnSticky) {
        btnSticky.innerHTML = '<span>👁️</span> Ver PDF';
      }
    } else {
      stickyBar.style.display = 'none';
    }
  }

  // Inicialización de Cuentas de Cobro
  function initCobro() {
    if (!$('view-cuentas-cobro')) return;

    $('cc-emisor-name').value = state.cobroEmisor.name || 'Pedro Luis Roa Mora';
    $('cc-emisor-cc').value = state.cobroEmisor.cc || '1.015.409.172';
    $('cc-emisor-city').value = state.cobroEmisor.city || 'Bogotá';
    $('cc-emisor-phone').value = state.cobroEmisor.phone || '3024555428';
    $('cc-emisor-address').value = state.cobroEmisor.address || 'Carrera 70g 78a-80';
    $('cc-legal-text').value = state.cobroLegalText || DEFAULT_LEGAL_TEXT;
    $('cc-include-legal').checked = state.cobroIncludeLegal !== false;
    if ($('cc-include-logo')) $('cc-include-logo').checked = state.cobroIncludeLogo !== false;
    if ($('cc-default-notes')) $('cc-default-notes').value = state.cobroDefaultNotes || DEFAULT_COBRO_NOTES;
    if ($('cc-include-notes')) $('cc-include-notes').checked = state.cobroIncludeNotes !== false;
    if ($('cc-notes')) $('cc-notes').value = (typeof state.cobroNotes === 'string') ? state.cobroNotes : (state.cobroDefaultNotes || DEFAULT_COBRO_NOTES);
    $('cc-num').value = state.cobroNum || 12;
    $('cc-doc-city').value = state.cobroDocCity || 'Bogotá';
    $('cc-doc-date').value = state.cobroDocDate || new Date().toISOString().split('T')[0];
    $('cc-client-name').value = state.cobroClientName || '';
    $('cc-client-nit').value = state.cobroClientNit || '';

    renderCobroClientsDatalist();
    renderCobroConceptos();
    renderCobroAdelantos();
    renderCobroFirmaUI();
    updateCobroPreviewCollapseUI(state.cobroPreviewCollapsed);
    renderCobroPreview();
  }

  // Event Listeners de Cuentas de Cobro
  function setupCobroEvents() {
    if (!$('view-cuentas-cobro')) return;

    // Toggle panel Mis Datos
    const emisorHeader = $('cc-emisor-accordion-btn');
    if (emisorHeader) {
      emisorHeader.addEventListener('click', toggleEmisorPanel);
    }

    // Auto-save emisor data
    const emisorFields = [
      { id: 'cc-emisor-name', key: 'name' },
      { id: 'cc-emisor-cc', key: 'cc' },
      { id: 'cc-emisor-city', key: 'city' },
      { id: 'cc-emisor-phone', key: 'phone' },
      { id: 'cc-emisor-address', key: 'address' }
    ];
    emisorFields.forEach(f => {
      const el = $(f.id);
      if (el) {
        el.addEventListener('input', () => {
          state.cobroEmisor[f.key] = el.value;
          setStorage('pr_cobro_emisor', state.cobroEmisor);
          renderCobroPreview();
        });
      }
    });

    // Subir y quitar firma
    const btnUploadFirma = $('btn-cc-upload-firma');
    const inputFirma = $('cc-firma-input');
    const btnRemoveFirma = $('btn-cc-remove-firma');

    if (btnUploadFirma && inputFirma) {
      btnUploadFirma.addEventListener('click', () => inputFirma.click());
      inputFirma.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          showToast('Selecciona un archivo PNG o JPG válido', '⚠️');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          state.cobroFirma = evt.target.result;
          setStorage('pr_cobro_firma', state.cobroFirma);
          renderCobroFirmaUI();
          renderCobroPreview();
          showToast('Firma digitalizada guardada', '✍️');
        };
        reader.readAsDataURL(file);
      });
    }

    if (btnRemoveFirma && inputFirma) {
      btnRemoveFirma.addEventListener('click', () => {
        state.cobroFirma = '';
        inputFirma.value = '';
        setStorage('pr_cobro_firma', '');
        renderCobroFirmaUI();
        renderCobroPreview();
        showToast('Firma eliminada', 'ℹ️');
      });
    }

    // Texto legal
    const legalText = $('cc-legal-text');
    if (legalText) {
      legalText.addEventListener('input', () => {
        state.cobroLegalText = legalText.value;
        setStorage('pr_cobro_legal_text', state.cobroLegalText);
        renderCobroPreview();
      });
    }

    const btnResetLegal = $('btn-cc-reset-legal');
    if (btnResetLegal) {
      btnResetLegal.addEventListener('click', () => {
        state.cobroLegalText = DEFAULT_LEGAL_TEXT;
        $('cc-legal-text').value = DEFAULT_LEGAL_TEXT;
        setStorage('pr_cobro_legal_text', DEFAULT_LEGAL_TEXT);
        renderCobroPreview();
        showToast('Texto legal restablecido por defecto', '🔄');
      });
    }

    const checkIncludeLegal = $('cc-include-legal');
    if (checkIncludeLegal) {
      checkIncludeLegal.addEventListener('change', () => {
        state.cobroIncludeLegal = checkIncludeLegal.checked;
        setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
        renderCobroPreview();
      });
    }

    // Garantías por defecto en panel acordeón
    const defaultNotesAcc = $('cc-default-notes');
    if (defaultNotesAcc) {
      defaultNotesAcc.addEventListener('input', () => {
        state.cobroDefaultNotes = defaultNotesAcc.value;
        setStorage('pr_cobro_default_notes', state.cobroDefaultNotes);
        if ($('cc-default-notes-tab')) $('cc-default-notes-tab').value = defaultNotesAcc.value;
      });
    }

    const btnResetNotesAcc = $('btn-cc-reset-notes');
    if (btnResetNotesAcc) {
      btnResetNotesAcc.addEventListener('click', () => {
        state.cobroDefaultNotes = DEFAULT_COBRO_NOTES;
        if ($('cc-default-notes')) $('cc-default-notes').value = DEFAULT_COBRO_NOTES;
        if ($('cc-default-notes-tab')) $('cc-default-notes-tab').value = DEFAULT_COBRO_NOTES;
        setStorage('pr_cobro_default_notes', DEFAULT_COBRO_NOTES);
        showToast('Garantías predeterminadas restablecidas', '🔄');
      });
    }

    // Casilla y campo de Garantías en la Cuenta de Cobro actual
    const checkIncludeNotes = $('cc-include-notes');
    if (checkIncludeNotes) {
      checkIncludeNotes.addEventListener('change', () => {
        state.cobroIncludeNotes = checkIncludeNotes.checked;
        setStorage('pr_cobro_include_notes', state.cobroIncludeNotes);
        renderCobroPreview();
      });
    }

    const ccNotesInput = $('cc-notes');
    if (ccNotesInput) {
      ccNotesInput.addEventListener('input', () => {
        state.cobroNotes = ccNotesInput.value;
        setStorage('pr_cobro_notes', state.cobroNotes);
        renderCobroPreview();
      });
    }

    // Número de cuenta, ciudad y fecha
    const ccNumInput = $('cc-num');
    if (ccNumInput) {
      ccNumInput.addEventListener('input', () => {
        const val = parseInt(ccNumInput.value, 10);
        if (!isNaN(val) && val > 0) {
          state.cobroNum = val;
          setStorage('pr_cobro_num', val);
          renderCobroPreview();
        }
      });
    }

    const ccCityInput = $('cc-doc-city');
    if (ccCityInput) {
      ccCityInput.addEventListener('input', () => {
        state.cobroDocCity = ccCityInput.value;
        setStorage('pr_cobro_doc_city', state.cobroDocCity);
        renderCobroPreview();
      });
    }

    const ccDateInput = $('cc-doc-date');
    if (ccDateInput) {
      ccDateInput.addEventListener('change', () => {
        state.cobroDocDate = ccDateInput.value;
        setStorage('pr_cobro_doc_date', state.cobroDocDate);
        renderCobroPreview();
      });
    }

    // Cliente y autocompletado de NIT
    const clientNameInput = $('cc-client-name');
    const clientNitInput = $('cc-client-nit');

    if (clientNameInput && clientNitInput) {
      clientNameInput.addEventListener('input', () => {
        state.cobroClientName = clientNameInput.value;
        setStorage('pr_cobro_client_name', state.cobroClientName);

        // Si coincide con cliente guardado, autocompletar NIT
        const val = clientNameInput.value.trim().toLowerCase();
        const found = state.cobroClients.find(c => c.name.toLowerCase() === val);
        if (found && found.nit) {
          clientNitInput.value = found.nit;
          state.cobroClientNit = found.nit;
          setStorage('pr_cobro_client_nit', found.nit);
        }
        renderCobroPreview();
      });

      clientNameInput.addEventListener('blur', () => {
        saveCobroClient(clientNameInput.value, clientNitInput.value);
      });

      clientNitInput.addEventListener('input', () => {
        state.cobroClientNit = clientNitInput.value;
        setStorage('pr_cobro_client_nit', state.cobroClientNit);
        renderCobroPreview();
      });

      clientNitInput.addEventListener('blur', () => {
        saveCobroClient(clientNameInput.value, clientNitInput.value);
      });
    }

    // Eventos de Conceptos (agregar, editar y eliminar)
    const btnAddConcepto = $('btn-cc-add-concepto');
    if (btnAddConcepto) {
      btnAddConcepto.addEventListener('click', () => {
        state.cobroConceptos.push({ desc: '', amount: 0 });
        setStorage('pr_cobro_conceptos', state.cobroConceptos);
        renderCobroConceptos();
        renderCobroPreview();
        const inputs = document.querySelectorAll('#cc-conceptos-list .cc-line-desc');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    }

    const conceptosList = $('cc-conceptos-list');
    if (conceptosList) {
      conceptosList.addEventListener('input', (e) => {
        const row = e.target.closest('.cc-line-row');
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        const field = e.target.dataset.field;
        if (field === 'desc') {
          state.cobroConceptos[index].desc = e.target.value;
        } else if (field === 'amount') {
          state.cobroConceptos[index].amount = parseFloat(e.target.value) || 0;
        }
        setStorage('pr_cobro_conceptos', state.cobroConceptos);
        renderCobroPreview();
      });

      conceptosList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-cc-del-concepto');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        state.cobroConceptos.splice(index, 1);
        if (state.cobroConceptos.length === 0) {
          state.cobroConceptos.push({ desc: '', amount: 0 });
        }
        setStorage('pr_cobro_conceptos', state.cobroConceptos);
        renderCobroConceptos();
        renderCobroPreview();
      });
    }

    // Eventos de Adelantos (agregar, editar y eliminar)
    const btnAddAdelanto = $('btn-cc-add-adelanto');
    if (btnAddAdelanto) {
      btnAddAdelanto.addEventListener('click', () => {
        state.cobroAdelantos.push({ desc: '', amount: 0 });
        setStorage('pr_cobro_adelantos', state.cobroAdelantos);
        renderCobroAdelantos();
        renderCobroPreview();
        const inputs = document.querySelectorAll('#cc-adelantos-list .cc-line-desc');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    }

    const adelantosList = $('cc-adelantos-list');
    if (adelantosList) {
      adelantosList.addEventListener('input', (e) => {
        const row = e.target.closest('.cc-line-row');
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        const field = e.target.dataset.field;
        if (field === 'desc') {
          state.cobroAdelantos[index].desc = e.target.value;
        } else if (field === 'amount') {
          state.cobroAdelantos[index].amount = parseFloat(e.target.value) || 0;
        }
        setStorage('pr_cobro_adelantos', state.cobroAdelantos);
        renderCobroPreview();
      });

      adelantosList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-cc-del-adelanto');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        state.cobroAdelantos.splice(index, 1);
        setStorage('pr_cobro_adelantos', state.cobroAdelantos);
        renderCobroAdelantos();
        renderCobroPreview();
      });
    }

    // Toggle vista previa de Cuenta de Cobro
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-toggle-cobro-preview');
      if (btn) {
        e.preventDefault();
        toggleCobroPreviewCollapse();
      }
    });

    // Casilla Incluir Logo
    const chkIncludeLogo = $('cc-include-logo');
    if (chkIncludeLogo) {
      chkIncludeLogo.addEventListener('change', (e) => {
        state.cobroIncludeLogo = e.target.checked;
        setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
        renderCobroPreview();
      });
    }

    // Botón Ver PDF de Cuenta de Cobro (Visor en nueva pestaña con opciones completas)
    const btnCobroPreview = $('btn-cc-preview-pdf');
    if (btnCobroPreview) {
      btnCobroPreview.addEventListener('click', () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentCobroToHistory(false);
        renderCobroPreview(data);
        window.PedroRoaPdf.previewCobroPdf(data);
      });
    }

    // Botón Descargar PDF de Cuenta de Cobro
    const btnCobroDownload = $('btn-cc-download-pdf');
    if (btnCobroDownload) {
      btnCobroDownload.addEventListener('click', () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentCobroToHistory(false);
        renderCobroPreview(data);
        showToast('Descargando archivo PDF...', '📥');
        window.PedroRoaPdf.downloadCobroPdf(data);
      });
    }

    // Botón Enviar PDF por WhatsApp de Cuenta de Cobro
    const btnCobroWhatsAppPdf = $('btn-cc-whatsapp-pdf');
    if (btnCobroWhatsAppPdf) {
      btnCobroWhatsAppPdf.addEventListener('click', async () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentCobroToHistory(false);
        renderCobroPreview(data);
        const result = await window.PedroRoaPdf.shareCobroPdfViaWhatsApp(data, (fileName) => {
          showModal(
            '📄 Archivo PDF Descargado',
            `<p>Se descargó el archivo <strong>${fileName}</strong> en tu dispositivo.</p>
             <p>Se ha abierto WhatsApp para que puedas adjuntar el PDF descargado y enviarlo a tu cliente.</p>`,
            'Entendido'
          );
        });
        if (result && result.success && result.method === 'native-share') {
          showToast('Compartiendo PDF directamente en WhatsApp...', '🚀');
        }
      });
    }

    // Botón Guardar Cuenta de Cobro en el Historial
    const btnCobroSave = $('btn-cc-save');
    if (btnCobroSave) {
      btnCobroSave.addEventListener('click', () => {
        saveCurrentCobroToHistory(true);
      });
    }

    // Botón Imprimir / Guardar en PDF
    const btnPrint = $('btn-cc-print');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentCobroToHistory(false);
        renderCobroPreview(data);
        window.print();
      });
    }

    // Botón WhatsApp Solo Texto
    const btnWhatsApp = $('btn-cc-whatsapp');
    if (btnWhatsApp) {
      btnWhatsApp.addEventListener('click', () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        const text = data.fullMessageText;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
    }

    // Botón Copiar Texto
    const btnCopy = $('btn-cc-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        const text = data.fullMessageText;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Texto de cuenta de cobro copiado al portapapeles', '📋');
          }).catch(() => {
            prompt('Copia el texto:', text);
          });
        } else {
          prompt('Copia el texto:', text);
        }
      });
    }

    // Botón Nueva Cuenta de Cobro
    const btnNew = $('btn-cc-new');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        saveCobroClient(state.cobroClientName, state.cobroClientNit);

        // Aumentar consecutivo
        state.cobroNum = (parseInt(state.cobroNum, 10) || 12) + 1;
        setStorage('pr_cobro_num', state.cobroNum);
        if ($('cc-num')) $('cc-num').value = state.cobroNum;

        // Limpiar cliente
        state.cobroClientName = '';
        state.cobroClientNit = '';
        setStorage('pr_cobro_client_name', '');
        setStorage('pr_cobro_client_nit', '');
        if ($('cc-client-name')) $('cc-client-name').value = '';
        if ($('cc-client-nit')) $('cc-client-nit').value = '';

        // Fecha actual
        const todayIso = new Date().toISOString().split('T')[0];
        state.cobroDocDate = todayIso;
        setStorage('pr_cobro_doc_date', todayIso);
        if ($('cc-doc-date')) $('cc-doc-date').value = todayIso;

        // Limpiar conceptos y adelantos
        state.cobroConceptos = [{ desc: '', amount: 0 }];
        setStorage('pr_cobro_conceptos', state.cobroConceptos);
        renderCobroConceptos();

        state.cobroAdelantos = [];
        setStorage('pr_cobro_adelantos', state.cobroAdelantos);
        renderCobroAdelantos();

        // Al crear nueva cuenta, el campo vuelve a cargar el texto predeterminado actual y se activa la casilla
        state.cobroNotes = state.cobroDefaultNotes || DEFAULT_COBRO_NOTES;
        state.cobroIncludeNotes = true;
        setStorage('pr_cobro_notes', state.cobroNotes);
        setStorage('pr_cobro_include_notes', true);
        if ($('cc-notes')) $('cc-notes').value = state.cobroNotes;
        if ($('cc-include-notes')) $('cc-include-notes').checked = true;

        renderCobroPreview();
        showToast(`Nueva cuenta de cobro N° ${String(state.cobroNum).padStart(3, '0')} iniciada`, '✨');
      });
    }
  }

  // --- Initializing Values into Form ---
  function initForm() {
    $('b-name').value = state.business.name;
    if ($('b-prefix')) $('b-prefix').value = state.business.prefix || '57';
    $('b-phone').value = formatLocalPhone(state.business.phone, $('b-prefix') ? $('b-prefix').value : '57');
    if ($('q-client-prefix')) $('q-client-prefix').value = '57';
    $('b-address').value = state.business.address || '';
    $('b-terms').value = state.business.terms || '';
    $('q-notes').value = state.business.terms || '';

    renderCatalogSelect();
    renderCatalogManager();
    renderQuoteItems();
    renderHistory();
    renderLivePreview();

    // Inicializar módulo Cuentas de Cobro
    initCobro();

    // Inicializar módulo Informes Técnicos
    initInforme();
    renderInformeHistory();
    renderInformePlantillasList();
    syncInformeDatosUI();

    // Actualizar contadores y vistas de historial
    updateBadges();
    renderCobroHistory();
    syncEmisorTabUI();
    initSyncEngine();
  }

  // ==========================================================================
  // FUNCIONES DE HISTORIAL DE CUENTAS DE COBRO
  // ==========================================================================

  // Guardar cuenta actual en el historial (o actualizar si ya existe ese número)
  function saveCurrentCobroToHistory(showToastMsg = true) {
    saveCobroClient(state.cobroClientName, state.cobroClientNit);
    const validConceptos = (state.cobroConceptos || []).filter(c => (c.desc && c.desc.trim()) || (parseFloat(c.amount) > 0));
    if (validConceptos.length === 0) {
      if (showToastMsg) {
        showToast('Agrega al menos un concepto a la cuenta de cobro antes de guardar.', '⚠️');
      }
      return false;
    }

    const data = getFullCobroData();
    const rawNum = parseInt(state.cobroNum, 10) || 1;
    data.cobroNum = rawNum;
    data.updatedAt = new Date().toISOString();

    const existingIdx = state.cobroHistory.findIndex(h => parseInt(h.cobroNum, 10) === rawNum);
    if (existingIdx >= 0) {
      data.id = (state.cobroHistory[existingIdx] && isValidUUID(state.cobroHistory[existingIdx].id))
        ? state.cobroHistory[existingIdx].id
        : (isValidUUID(data.id) ? data.id : generateUUID());
      data.status = state.cobroHistory[existingIdx].status || 'pendiente';
      state.cobroHistory[existingIdx] = data;
    } else {
      data.id = isValidUUID(data.id) ? data.id : generateUUID();
      data.status = 'pendiente';
      state.cobroHistory.push(data);
      checkCobroNumberCollision(data.cobroNum, data.id);
    }

    setStorage('pr_cobro_history', state.cobroHistory);
    updateBadges();
    renderCobroHistory();
    if (showToastMsg) {
      showToast(`Cuenta de cobro N° ${data.cobroNumber} guardada en el historial`, '💾');
    }
    triggerIncrementalSync();
    return true;
  }

  // Renderizar la lista del Historial de Cuentas de Cobro
  function renderCobroHistory() {
    const list = $('cc-history-list');
    if (!list) return;

    // Calcular estadísticas globales
    const totalCount = state.cobroHistory.length;
    let pendingAmount = 0;
    let paidAmount = 0;

    state.cobroHistory.forEach(item => {
      const saldo = (item.totals && typeof item.totals.saldo === 'number') ? item.totals.saldo : 0;
      if (item.status === 'pagada') {
        paidAmount += saldo;
      } else {
        pendingAmount += saldo;
      }
    });

    if ($('cc-stat-total-count')) $('cc-stat-total-count').textContent = totalCount;
    if ($('cc-stat-pending-amount')) $('cc-stat-pending-amount').textContent = formatMoney(pendingAmount);
    if ($('cc-stat-paid-amount')) $('cc-stat-paid-amount').textContent = formatMoney(paidAmount);
    updateBadges();

    if (totalCount === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">💼</div>
          <h3 style="font-size: 1.05rem; color: var(--text-main); margin-bottom: 6px;">No hay cuentas de cobro guardadas</h3>
          <p style="font-size: 0.86rem; max-width: 440px; margin: 0 auto 16px; line-height: 1.5;">
            Guarda tus cuentas de cobro para llevar el control de tus ingresos, registrar pagos y tenerlas siempre a mano en cualquier momento.
          </p>
          <button type="button" class="btn-primary" id="btn-empty-create-cobro" style="padding: 9px 18px; font-size: 0.88rem; min-height: 44px;">
            <span>✨</span> Crear mi primera cuenta de cobro
          </button>
        </div>
      `;
      const btnEmpty = $('btn-empty-create-cobro');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => switchSubview('view-cuentas-cobro'));
      }
      return;
    }

    // Filtros
    const searchVal = ($('cc-hist-search') ? $('cc-hist-search').value : '').trim().toLowerCase();
    const statusVal = $('cc-hist-filter-status') ? $('cc-hist-filter-status').value : 'all';
    const monthVal = $('cc-hist-filter-month') ? $('cc-hist-filter-month').value : '';

    let filtered = state.cobroHistory.filter(item => {
      // Filtro de estado
      if (statusVal === 'pendiente' && item.status === 'pagada') return false;
      if (statusVal === 'pagada' && item.status !== 'pagada') return false;

      // Filtro de mes
      if (monthVal && item.dateIso && !item.dateIso.startsWith(monthVal)) return false;

      // Filtro de búsqueda
      if (searchVal) {
        const numStr = String(item.cobroNumber || item.cobroNum || '').toLowerCase();
        const client = String(item.clientName || '').toLowerCase();
        const nit = String(item.clientNit || '').toLowerCase();
        const city = String(item.city || '').toLowerCase();
        const conceptosText = (item.conceptos || []).map(c => c.desc).join(' ').toLowerCase();
        const matches = numStr.includes(searchVal) || client.includes(searchVal) || nit.includes(searchVal) || city.includes(searchVal) || conceptosText.includes(searchVal);
        if (!matches) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <h4 style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px;">No se encontraron cuentas con esos filtros</h4>
          <p style="font-size: 0.84rem; margin-bottom: 12px;">Intenta cambiar el término de búsqueda o limpia los filtros activos.</p>
          <button type="button" id="btn-empty-clear-filters" class="btn-secondary" style="padding: 6px 14px; font-size: 0.82rem; min-height: 40px;">
            Limpiar filtros
          </button>
        </div>
      `;
      const btnClear = $('btn-empty-clear-filters');
      if (btnClear) {
        btnClear.addEventListener('click', () => {
          if ($('cc-hist-search')) $('cc-hist-search').value = '';
          if ($('cc-hist-filter-status')) $('cc-hist-filter-status').value = 'all';
          if ($('cc-hist-filter-month')) $('cc-hist-filter-month').value = '';
          renderCobroHistory();
        });
      }
      return;
    }

    // Ordenar de la más reciente a la más antigua
    filtered.sort((a, b) => {
      const dateA = a.dateIso || '';
      const dateB = b.dateIso || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (parseInt(b.cobroNum, 10) || 0) - (parseInt(a.cobroNum, 10) || 0);
    });

    list.innerHTML = filtered.map(item => {
      const isPaid = item.status === 'pagada';
      const numStr = String(item.cobroNumber || item.cobroNum || 1).padStart(3, '0');
      const saldo = (item.totals && typeof item.totals.saldo === 'number') ? item.totals.saldo : 0;
      const conceptosCount = (item.conceptos && item.conceptos.length) ? item.conceptos.length : 1;
      const firstConcepto = (item.conceptos && item.conceptos[0] && item.conceptos[0].desc) ? item.conceptos[0].desc : '';

      return `
        <div class="cobro-history-card ${isPaid ? 'is-paid' : 'is-pending'}" data-cobro-num="${item.cobroNum}">
          <div class="cobro-history-header">
            <div class="cobro-history-identity">
              <span class="cobro-num-badge">Cuenta N° ${escapeHtml(numStr)}</span>
              <span class="badge-status ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? '✅ Pagada' : '⏳ Pendiente'}</span>
            </div>
            <div class="cobro-history-amount">${formatMoney(saldo)}</div>
          </div>

          <div class="cobro-history-body">
            <h4 class="cobro-history-client">${escapeHtml(item.clientName || 'Cliente General')}</h4>
            ${item.clientNit ? `<div class="cobro-history-nit">NIT/C.C.: ${escapeHtml(item.clientNit)}</div>` : ''}
            <div class="cobro-history-meta">
              <span>📅 ${escapeHtml(item.dateFormatted || item.dateIso || '')}</span>
              <span>·</span>
              <span>${conceptosCount} ${conceptosCount === 1 ? 'concepto' : 'conceptos'}</span>
              ${item.city ? `<span>· 📍 ${escapeHtml(item.city)}</span>` : ''}
              ${firstConcepto ? `<span style="width: 100%; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">• ${escapeHtml(firstConcepto)}</span>` : ''}
            </div>
          </div>

          <div class="cobro-history-actions">
            <button type="button" class="btn-cobro-action" data-action="toggle-status" data-num="${item.cobroNum}" title="Cambiar estado de pago">
              ${isPaid ? '🔄 Marcar Pendiente' : '✅ Marcar Pagada'}
            </button>
            <button type="button" class="btn-cobro-action btn-primary" data-action="edit-cobro" data-num="${item.cobroNum}" title="Abrir y editar en el formulario">
              ✏️ Abrir
            </button>
            <button type="button" class="btn-cobro-action" data-action="duplicate-cobro" data-num="${item.cobroNum}" title="Crear copia con nuevo número consecutivo">
              📑 Duplicar
            </button>
            <button type="button" class="btn-cobro-action" data-action="pdf-cobro" data-num="${item.cobroNum}" title="Ver documento PDF">
              👁️ Ver PDF
            </button>
            <button type="button" class="btn-cobro-action" data-action="whatsapp-cobro" data-num="${item.cobroNum}" title="Enviar PDF por WhatsApp">
              📲 WhatsApp
            </button>
            <button type="button" class="btn-cobro-action btn-danger" data-action="delete-cobro" data-num="${item.cobroNum}" title="Eliminar del historial">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Abrir cuenta de cobro para editar
  function openCobroForEditing(cobroNum) {
    const item = state.cobroHistory.find(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (!item) return;

    state.cobroNum = parseInt(item.cobroNum, 10) || 1;
    state.cobroDocCity = item.city || 'Bogotá';
    state.cobroDocDate = item.dateIso || new Date().toISOString().split('T')[0];
    state.cobroClientName = item.clientName || '';
    state.cobroClientNit = item.clientNit || '';
    state.cobroIncludeLegal = item.includeLegal !== false;
    state.cobroIncludeLogo = item.includeLogo !== false;
    // Cuentas previas sin notas se abren sin garantías ni errores
    state.cobroIncludeNotes = (item.includeNotes === true);
    state.cobroNotes = (typeof item.notes === 'string') ? item.notes : '';
    state.cobroConceptos = JSON.parse(JSON.stringify(item.conceptos && item.conceptos.length ? item.conceptos : [{ desc: '', amount: 0 }]));
    state.cobroAdelantos = JSON.parse(JSON.stringify(item.adelantos || []));

    setStorage('pr_cobro_num', state.cobroNum);
    setStorage('pr_cobro_doc_city', state.cobroDocCity);
    setStorage('pr_cobro_doc_date', state.cobroDocDate);
    setStorage('pr_cobro_client_name', state.cobroClientName);
    setStorage('pr_cobro_client_nit', state.cobroClientNit);
    setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
    setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
    setStorage('pr_cobro_include_notes', state.cobroIncludeNotes);
    setStorage('pr_cobro_notes', state.cobroNotes);
    setStorage('pr_cobro_conceptos', state.cobroConceptos);
    setStorage('pr_cobro_adelantos', state.cobroAdelantos);

    // Actualizar campos en el formulario
    if ($('cc-num')) $('cc-num').value = state.cobroNum;
    if ($('cc-doc-city')) $('cc-doc-city').value = state.cobroDocCity;
    if ($('cc-doc-date')) $('cc-doc-date').value = state.cobroDocDate;
    if ($('cc-client-name')) $('cc-client-name').value = state.cobroClientName;
    if ($('cc-client-nit')) $('cc-client-nit').value = state.cobroClientNit;
    if ($('cc-include-legal')) $('cc-include-legal').checked = state.cobroIncludeLegal;
    if ($('cc-include-logo')) $('cc-include-logo').checked = state.cobroIncludeLogo;
    if ($('cc-include-notes')) $('cc-include-notes').checked = state.cobroIncludeNotes;
    if ($('cc-notes')) $('cc-notes').value = state.cobroNotes;

    renderCobroConceptos();
    renderCobroAdelantos();
    renderCobroPreview();

    switchSubview('view-cuentas-cobro');
    showToast(`Cuenta de cobro N° ${String(state.cobroNum).padStart(3, '0')} cargada para edición`, '✏️');
  }

  // Duplicar cuenta de cobro con nuevo número
  function duplicateCobroFromHistory(cobroNum) {
    const item = state.cobroHistory.find(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (!item) return;

    // Calcular el siguiente número consecutivo mayor disponible
    const nextNum = getCalculatedNextCobroNum();

    state.cobroNum = nextNum;
    state.cobroDocCity = item.city || 'Bogotá';
    state.cobroDocDate = new Date().toISOString().split('T')[0];
    state.cobroClientName = item.clientName || '';
    state.cobroClientNit = item.clientNit || '';
    state.cobroIncludeLegal = item.includeLegal !== false;
    state.cobroIncludeLogo = item.includeLogo !== false;
    state.cobroIncludeNotes = (item.includeNotes === true);
    state.cobroNotes = (typeof item.notes === 'string') ? item.notes : '';
    state.cobroConceptos = JSON.parse(JSON.stringify(item.conceptos && item.conceptos.length ? item.conceptos : [{ desc: '', amount: 0 }]));
    state.cobroAdelantos = JSON.parse(JSON.stringify(item.adelantos || []));

    setStorage('pr_cobro_num', state.cobroNum);
    setStorage('pr_cobro_doc_city', state.cobroDocCity);
    setStorage('pr_cobro_doc_date', state.cobroDocDate);
    setStorage('pr_cobro_client_name', state.cobroClientName);
    setStorage('pr_cobro_client_nit', state.cobroClientNit);
    setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
    setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
    setStorage('pr_cobro_include_notes', state.cobroIncludeNotes);
    setStorage('pr_cobro_notes', state.cobroNotes);
    setStorage('pr_cobro_conceptos', state.cobroConceptos);
    setStorage('pr_cobro_adelantos', state.cobroAdelantos);

    if ($('cc-num')) $('cc-num').value = state.cobroNum;
    if ($('cc-doc-city')) $('cc-doc-city').value = state.cobroDocCity;
    if ($('cc-doc-date')) $('cc-doc-date').value = state.cobroDocDate;
    if ($('cc-client-name')) $('cc-client-name').value = state.cobroClientName;
    if ($('cc-client-nit')) $('cc-client-nit').value = state.cobroClientNit;
    if ($('cc-include-legal')) $('cc-include-legal').checked = state.cobroIncludeLegal;
    if ($('cc-include-logo')) $('cc-include-logo').checked = state.cobroIncludeLogo;
    if ($('cc-include-notes')) $('cc-include-notes').checked = state.cobroIncludeNotes;
    if ($('cc-notes')) $('cc-notes').value = state.cobroNotes;

    renderCobroConceptos();
    renderCobroAdelantos();
    renderCobroPreview();

    switchSubview('view-cuentas-cobro');
    showToast(`Cuenta duplicada como N° ${String(nextNum).padStart(3, '0')}. Modifica lo que necesites y guárdala.`, '📑');
  }

  // Alternar estado Pendiente / Pagada
  function toggleCobroStatus(cobroNum) {
    const item = state.cobroHistory.find(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (!item) return;

    item.status = (item.status === 'pagada') ? 'pendiente' : 'pagada';
    item.updatedAt = new Date().toISOString();
    setStorage('pr_cobro_history', state.cobroHistory);
    renderCobroHistory();
    showToast(`Cuenta N° ${item.cobroNumber || item.cobroNum} marcada como ${item.status === 'pagada' ? 'PAGADA ✅' : 'PENDIENTE ⏳'}`, 'ℹ️');
    triggerIncrementalSync();
  }

  // Eliminar cuenta del historial
  function deleteCobroFromHistory(cobroNum) {
    const idx = state.cobroHistory.findIndex(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (idx < 0) return;
    const item = state.cobroHistory[idx];
    const numDisplay = item.cobroNumber || item.cobroNum;

    if (confirm(`¿Eliminar definitivamente la cuenta de cobro N° ${numDisplay} del historial?\n\nEsta acción no se puede deshacer.`)) {
      if (item && item.id) {
        recordTombstone(item.id, 'cuenta_cobro');
      }
      state.cobroHistory.splice(idx, 1);
      setStorage('pr_cobro_history', state.cobroHistory);
      updateBadges();
      renderCobroHistory();
      showToast(`Cuenta de cobro N° ${numDisplay} eliminada`, '🗑️');
      triggerIncrementalSync();
    }
  }

  // Ver PDF desde el historial
  function previewCobroFromHistory(cobroNum) {
    const item = state.cobroHistory.find(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (!item) return;
    window.PedroRoaPdf.previewCobroPdf(item);
  }

  // Enviar PDF por WhatsApp desde el historial
  async function shareCobroFromHistory(cobroNum) {
    const item = state.cobroHistory.find(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (!item) return;
    const result = await window.PedroRoaPdf.shareCobroPdfViaWhatsApp(item, (fileName) => {
      showModal(
        '📄 Archivo PDF Descargado',
        `<p>Se descargó el archivo <strong>${fileName}</strong> en tu dispositivo.</p>
         <p>Se ha abierto WhatsApp para que puedas adjuntar el PDF descargado y enviarlo a tu cliente.</p>`,
        'Entendido'
      );
    });
    if (result && result.success && result.method === 'native-share') {
      showToast('Compartiendo PDF directamente en WhatsApp...', '🚀');
    }
  }

  // Exportar historial de cuentas de cobro a archivo .json
  function exportCobroHistory() {
    if (state.cobroHistory.length === 0) {
      showToast('No hay cuentas de cobro registradas para exportar', 'ℹ️');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const exportData = {
      app: 'Cotizador Pedro Roa',
      version: '2.0',
      exportType: 'cuentas_de_cobro_historial',
      exportDate: new Date().toISOString(),
      count: state.cobroHistory.length,
      history: state.cobroHistory
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_cuentas_cobro_${today}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    showToast('Historial de cuentas de cobro exportado exitosamente', '📥');
  }

  // Importar historial de cuentas de cobro desde archivo .json
  function importCobroHistory(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        let incoming = [];
        if (Array.isArray(parsed)) {
          incoming = parsed;
        } else if (parsed && Array.isArray(parsed.history)) {
          incoming = parsed.history;
        } else {
          showToast('El archivo no contiene un historial de cuentas de cobro válido', '⚠️');
          return;
        }

        if (incoming.length === 0) {
          showToast('El archivo no tiene cuentas de cobro', 'ℹ️');
          return;
        }

        if (!confirm(`Se encontraron ${incoming.length} cuentas de cobro en el archivo.\n\n¿Deseas agregarlas al historial? Las cuentas con el mismo número se actualizarán.`)) {
          return;
        }

        let addedCount = 0;
        let updatedCount = 0;

        incoming.forEach(inItem => {
          ensureItemUuid(inItem);
          const rawNum = parseInt(inItem.cobroNum, 10) || 1;
          const idx = state.cobroHistory.findIndex(h => parseInt(h.cobroNum, 10) === rawNum);
          if (idx >= 0) {
            state.cobroHistory[idx] = { ...state.cobroHistory[idx], ...inItem };
            updatedCount++;
          } else {
            state.cobroHistory.push(inItem);
            addedCount++;
          }
        });

        setStorage('pr_cobro_history', state.cobroHistory);
        updateBadges();
        renderCobroHistory();
        showToast(`Historial importado: ${addedCount} nuevas, ${updatedCount} actualizadas`, '✅');
        triggerIncrementalSync();
      } catch (err) {
        console.error('Error importando historial:', err);
        showToast('Error al leer el archivo JSON. Verifica el formato.', '❌');
      }
    };
    reader.readAsText(file);
  }

  // Sincronizar datos de emisor con la pestaña "Mis Datos"
  function syncEmisorTabUI() {
    if ($('cc-emisor-name-tab')) $('cc-emisor-name-tab').value = state.cobroEmisor.name || 'Pedro Luis Roa Mora';
    if ($('cc-emisor-cc-tab')) $('cc-emisor-cc-tab').value = state.cobroEmisor.cc || '1.015.409.172';
    if ($('cc-emisor-city-tab')) $('cc-emisor-city-tab').value = state.cobroEmisor.city || 'Bogotá';
    if ($('cc-emisor-phone-tab')) $('cc-emisor-phone-tab').value = state.cobroEmisor.phone || '3024555428';
    if ($('cc-emisor-address-tab')) $('cc-emisor-address-tab').value = state.cobroEmisor.address || 'Carrera 70g 78a-80';
    if ($('cc-legal-text-tab')) $('cc-legal-text-tab').value = state.cobroLegalText || DEFAULT_LEGAL_TEXT;
    if ($('cc-default-notes-tab')) $('cc-default-notes-tab').value = state.cobroDefaultNotes || DEFAULT_COBRO_NOTES;

    const previewBox = $('cc-firma-preview-box-tab');
    const previewImg = $('cc-firma-preview-img-tab');
    const btnRemove = $('btn-cc-remove-firma-tab');
    const statusText = $('cc-firma-status-tab');

    if (previewBox && previewImg && btnRemove && statusText) {
      if (state.cobroFirma) {
        previewImg.src = state.cobroFirma;
        previewBox.style.display = 'block';
        btnRemove.style.display = 'inline-block';
        statusText.textContent = 'Firma activa y cargada';
        statusText.style.color = 'var(--whatsapp)';
      } else {
        previewImg.src = '';
        previewBox.style.display = 'none';
        btnRemove.style.display = 'none';
        statusText.textContent = 'Sin firma (espacio en blanco)';
        statusText.style.color = 'var(--text-muted)';
      }
    }
  }

  // ==========================================================================
  // MÓDULO INFORMES TÉCNICOS DE DIAGNÓSTICO
  // ==========================================================================

  const INFORME_PREVIEW_COLLAPSE_KEY = 'pr_informe_preview_collapsed';

  function getInformePreviewCollapsed() {
    try {
      const val = localStorage.getItem(INFORME_PREVIEW_COLLAPSE_KEY);
      return val === 'true';
    } catch (e) {
      return false;
    }
  }

  function setInformePreviewCollapsed(collapsed) {
    try {
      localStorage.setItem(INFORME_PREVIEW_COLLAPSE_KEY, collapsed ? 'true' : 'false');
    } catch (e) {}
  }

  function updateInformePreviewCollapseUI(isCollapsed) {
    const container = $('inf-preview-collapsible');
    const btn = $('btn-toggle-inf-preview');
    const txt = $('inf-preview-toggle-text');
    const icon = $('inf-preview-toggle-icon');
    if (!container) return;

    if (isCollapsed) {
      container.classList.add('is-collapsed');
      if (btn) {
        btn.classList.add('is-collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }
      if (txt) txt.textContent = 'Mostrar vista previa';
      if (icon) icon.textContent = '▼';
    } else {
      container.classList.remove('is-collapsed');
      if (btn) {
        btn.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded', 'true');
      }
      if (txt) txt.textContent = 'Ocultar vista previa';
      if (icon) icon.textContent = '▲';
    }
  }

  function toggleInformePreviewCollapse() {
    const container = $('inf-preview-collapsible');
    if (!container) return;
    const willCollapse = !container.classList.contains('is-collapsed');
    updateInformePreviewCollapseUI(willCollapse);
    setInformePreviewCollapsed(willCollapse);
  }

  function formatSpanishDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${day} de ${months[monthIdx] || ''} de ${year}`;
    }
    return String(dateStr);
  }

  function getTodayIsoDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatMoneyCop(amount) {
    const num = Math.round(parseFloat(amount) || 0);
    return '$' + num.toLocaleString('es-CO') + ' COP';
  }

  function formatInformeNumber(num) {
    if (typeof num === 'string' && num.startsWith('INF-')) return num;
    const n = parseInt(num, 10) || 1;
    return `INF-${String(n).padStart(4, '0')}`;
  }

  function checkInformeNumberCollision(rawNum, id) {
    const parsedNum = parseInt(rawNum, 10);
    if (isNaN(parsedNum) || parsedNum <= 0) return;
    const hasCollision = (state.informeHistory || []).some(
      h => parseInt(h.rawNumber || h.number?.replace('INF-', ''), 10) === parsedNum && h.id !== id
    );
    if (hasCollision || parsedNum >= state.informeNum) {
      const maxExisting = (state.informeHistory || []).reduce((max, h) => {
        const n = parseInt(h.rawNumber || h.number?.replace('INF-', ''), 10);
        return (!isNaN(n) && n > max) ? n : max;
      }, 0);
      state.informeNum = Math.max(parsedNum + 1, maxExisting + 1);
      setStorage('pr_informe_num', state.informeNum);
      triggerIncrementalSync();
    }
  }

  // Clientes para datalist de informes
  function renderInformeClientsDatalist() {
    const dl = $('inf-clients-datalist');
    if (!dl) return;
    const clients = Array.isArray(state.cobroClients) ? state.cobroClients : [];
    dl.innerHTML = clients
      .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.nit ? 'NIT/CC: ' + c.nit : '')}</option>`)
      .join('');
  }

  // UI Renderers para Verificaciones y Trabajos Propuestos
  function renderInformeVerificacionesUI() {
    const container = $('inf-verif-items-container');
    if (!container) return;
    if (!Array.isArray(state.currentInformeVerificaciones) || state.currentInformeVerificaciones.length === 0) {
      state.currentInformeVerificaciones = [
        { title: '', desc: '' }
      ];
    }

    container.innerHTML = state.currentInformeVerificaciones.map((item, idx) => `
      <div class="verif-item-card" data-index="${idx}">
        <div class="verif-item-top">
          <div class="verif-item-order">
            <button type="button" class="btn-icon btn-verif-up" data-index="${idx}" title="Mover arriba" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
            <button type="button" class="btn-icon btn-verif-down" data-index="${idx}" title="Mover abajo" ${idx === state.currentInformeVerificaciones.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
            <span style="font-size:0.75rem; color:var(--text-dim); margin-left:4px;">#${idx + 1}</span>
          </div>
          <input type="text" class="verif-item-title-input" data-index="${idx}" placeholder="Título en negrita (ej: Prueba cruzada del cabezal)" value="${escapeHtml(item.title)}">
          <button type="button" class="btn-icon btn-danger btn-verif-del" data-index="${idx}" title="Borrar ítem">🗑️</button>
        </div>
        <textarea class="verif-item-desc-input" data-index="${idx}" rows="2" placeholder="Descripción detallada de la prueba...">${escapeHtml(item.desc)}</textarea>
      </div>
    `).join('');
  }

  function renderInformePropuestasUI() {
    const container = $('inf-propuesta-items-container');
    if (!container) return;
    if (!Array.isArray(state.currentInformePropuestas) || state.currentInformePropuestas.length === 0) {
      state.currentInformePropuestas = [
        { desc: '', valor: 0 }
      ];
    }

    let total = 0;
    container.innerHTML = state.currentInformePropuestas.map((item, idx) => {
      const val = parseFloat(item.valor) || 0;
      total += val;
      return `
        <div class="propuesta-row" data-index="${idx}">
          <input type="text" class="propuesta-row-desc" data-index="${idx}" placeholder="Descripción del trabajo propuesto" value="${escapeHtml(item.desc)}">
          <input type="number" class="propuesta-row-val" data-index="${idx}" placeholder="0" min="0" step="5000" value="${item.valor ? item.valor : ''}">
          <button type="button" class="btn-icon btn-danger btn-prop-del" data-index="${idx}" title="Eliminar fila">🗑️</button>
        </div>
      `;
    }).join('');

    const totalEl = $('inf-propuesta-total-val');
    if (totalEl) totalEl.textContent = formatMoneyCop(total);

    const totalRow = $('inf-propuesta-total-row');
    if (totalRow) {
      totalRow.style.display = 'flex';
    }

    updateMobileStickyBar();
  }

  function renderInformeCustomSectionsUI() {
    const container = $('inf-custom-sections-container');
    if (!container) return;
    const sections = Array.isArray(state.currentInformeCustomSections) ? state.currentInformeCustomSections : [];
    container.innerHTML = sections.map((sec, idx) => `
      <div class="informe-sec-editor custom-sec-editor" data-index="${idx}">
        <div class="informe-sec-head">
          <label class="informe-sec-include-toggle">
            <input type="checkbox" class="custom-sec-inc" data-index="${idx}" ${sec.included !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
            <span>Incluir</span>
          </label>
          <input type="text" class="informe-sec-title-input custom-sec-title" data-index="${idx}" value="${escapeHtml(sec.title || 'Sección adicional')}">
          <button type="button" class="btn-icon btn-danger btn-custom-sec-del" data-index="${idx}" title="Eliminar sección">🗑️</button>
        </div>
        <div class="input-group full-width">
          <textarea class="custom-sec-text" data-index="${idx}" rows="3" placeholder="Contenido de esta sección...">${escapeHtml(sec.content || '')}</textarea>
        </div>
      </div>
    `).join('');
  }

  // Extracción completa de datos del formulario actual
  function getInformeDataFromForm() {
    const number = $('inf-num') ? $('inf-num').value.trim() : formatInformeNumber(state.informeNum);
    const headerTag = $('inf-header-tag') ? $('inf-header-tag').value.trim() : (state.informeConfig.headerTag || 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO');
    const title = $('inf-title') ? $('inf-title').value.trim() : 'INFORME TÉCNICO';
    const subtitle = $('inf-subtitle') ? $('inf-subtitle').value.trim() : '';

    const clientName = $('inf-client-name') ? $('inf-client-name').value.trim() : '';
    const clientNit = $('inf-client-nit') ? $('inf-client-nit').value.trim() : '';
    const equipment = $('inf-equipment') ? $('inf-equipment').value.trim() : '';
    const serial = $('inf-serial') ? $('inf-serial').value.trim() : '';
    const rawDate = $('inf-date') ? $('inf-date').value : getTodayIsoDate();
    const dateFormatted = formatSpanishDate(rawDate);
    const serviceType = $('inf-service-type') ? $('inf-service-type').value.trim() : (state.informeConfig.serviceType || 'Inspección y diagnóstico técnico');
    const falla = $('inf-falla') ? $('inf-falla').value.trim() : '';

    const elabName = state.cobroEmisor.name || state.business.name || 'Pedro Luis Roa Mora';
    const elabCargo = $('inf-elab-cargo') ? $('inf-elab-cargo').value.trim() : (state.informeConfig.cargo || 'Técnico de mantenimiento de equipos de cómputo');
    const elabCorreo = $('inf-elab-correo') ? $('inf-elab-correo').value.trim() : (state.informeConfig.correo || 'pedrolroam@hotmail.com');
    const elabCelular = $('inf-elab-celular') ? $('inf-elab-celular').value.trim() : (state.informeConfig.celular || '302 455 5428');
    const elabDate = $('inf-elab-date') && $('inf-elab-date').value.trim() ? $('inf-elab-date').value.trim() : dateFormatted;

    const includeLogo = $('inf-include-logo') ? $('inf-include-logo').checked : true;
    const includeFirma = $('inf-include-firma') ? $('inf-include-firma').checked : true;
    const showNumber = $('inf-show-number') ? $('inf-show-number').checked : false;

    // Secciones numeradas dinámicamente (1..N)
    const sections = [];
    let secCounter = 1;

    // 1. Motivo
    if ($('inf-sec-motivo-inc') && $('inf-sec-motivo-inc').checked) {
      sections.push({
        num: secCounter++,
        type: 'text',
        title: $('inf-sec-motivo-title') ? $('inf-sec-motivo-title').value.trim() : 'Motivo de la revisión',
        content: $('inf-sec-motivo-text') ? $('inf-sec-motivo-text').value.trim() : ''
      });
    }

    // 2. Verificaciones
    if ($('inf-sec-verif-inc') && $('inf-sec-verif-inc').checked) {
      sections.push({
        num: secCounter++,
        type: 'verificaciones',
        title: $('inf-sec-verif-title') ? $('inf-sec-verif-title').value.trim() : 'Verificaciones y pruebas realizadas',
        items: (state.currentInformeVerificaciones || []).filter(v => v.title || v.desc)
      });
    }

    // 3. Diagnóstico
    if ($('inf-sec-diag-inc') && $('inf-sec-diag-inc').checked) {
      sections.push({
        num: secCounter++,
        type: 'text',
        title: $('inf-sec-diag-title') ? $('inf-sec-diag-title').value.trim() : 'Diagnóstico técnico',
        content: $('inf-sec-diag-text') ? $('inf-sec-diag-text').value.trim() : ''
      });
    }

    // 4. Recomendación y propuesta
    if ($('inf-sec-prop-inc') && $('inf-sec-prop-inc').checked) {
      sections.push({
        num: secCounter++,
        type: 'propuesta',
        title: $('inf-sec-prop-title') ? $('inf-sec-prop-title').value.trim() : 'Recomendación y propuesta de reparación',
        content: $('inf-sec-prop-text') ? $('inf-sec-prop-text').value.trim() : '',
        items: (state.currentInformePropuestas || []).filter(p => p.desc || parseFloat(p.valor) > 0)
      });
    }

    // 5. Observaciones
    if ($('inf-sec-obs-inc') && $('inf-sec-obs-inc').checked) {
      const obsRaw = $('inf-sec-obs-text') ? $('inf-sec-obs-text').value : '';
      const obsList = obsRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      sections.push({
        num: secCounter++,
        type: 'observaciones',
        title: $('inf-sec-obs-title') ? $('inf-sec-obs-title').value.trim() : 'Observaciones',
        bullets: obsList,
        rawText: obsRaw
      });
    }

    // 6. Conclusión
    if ($('inf-sec-conc-inc') && $('inf-sec-conc-inc').checked) {
      sections.push({
        num: secCounter++,
        type: 'text',
        title: $('inf-sec-conc-title') ? $('inf-sec-conc-title').value.trim() : 'Conclusión',
        content: $('inf-sec-conc-text') ? $('inf-sec-conc-text').value.trim() : ''
      });
    }

    // Secciones custom añadidas por el usuario
    if (Array.isArray(state.currentInformeCustomSections)) {
      state.currentInformeCustomSections.forEach(cs => {
        if (cs.included !== false) {
          sections.push({
            num: secCounter++,
            type: 'text',
            title: cs.title || 'Información adicional',
            content: cs.content || ''
          });
        }
      });
    }

    const propuestaItems = (state.currentInformePropuestas || []).filter(p => p.desc || parseFloat(p.valor) > 0);
    const propuestaTotal = propuestaItems.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);

    const rawNum = parseInt(String(number).replace(/\D/g, ''), 10) || 1;

    return {
      id: state.currentInformeId || generateUUID(),
      number,
      rawNumber: rawNum,
      status: state.currentInformeStatus || 'Borrador',
      headerTag,
      title,
      subtitle,
      clientName,
      clientNit,
      equipment,
      serial,
      date: rawDate,
      dateFormatted,
      serviceType,
      falla,
      sections,
      motivo: $('inf-sec-motivo-text') ? $('inf-sec-motivo-text').value.trim() : '',
      verificaciones: state.currentInformeVerificaciones || [],
      diagnostico: $('inf-sec-diag-text') ? $('inf-sec-diag-text').value.trim() : '',
      propuestaTexto: $('inf-sec-prop-text') ? $('inf-sec-prop-text').value.trim() : '',
      propuestaItems,
      propuestaTotal,
      observaciones: $('inf-sec-obs-text') ? $('inf-sec-obs-text').value : '',
      conclusion: $('inf-sec-conc-text') ? $('inf-sec-conc-text').value.trim() : '',
      customSections: state.currentInformeCustomSections || [],
      secMotivoInc: $('inf-sec-motivo-inc') ? $('inf-sec-motivo-inc').checked : true,
      secVerifInc: $('inf-sec-verif-inc') ? $('inf-sec-verif-inc').checked : true,
      secDiagInc: $('inf-sec-diag-inc') ? $('inf-sec-diag-inc').checked : true,
      secPropInc: $('inf-sec-prop-inc') ? $('inf-sec-prop-inc').checked : true,
      secObsInc: $('inf-sec-obs-inc') ? $('inf-sec-obs-inc').checked : true,
      secConcInc: $('inf-sec-conc-inc') ? $('inf-sec-conc-inc').checked : true,
      elaboradoPor: {
        name: elabName,
        cargo: elabCargo,
        correo: elabCorreo,
        celular: elabCelular,
        fecha: elabDate,
        firma: state.cobroFirma || ''
      },
      includeLogo,
      includeFirma,
      showNumber,
      updatedAt: new Date().toISOString()
    };
  }

  // Generador unificado de HTML para la vista previa oficial y para impresión
  function renderInformeDocumentHtml(data) {
    if (!data) data = getInformeDataFromForm();

    const sectionsHtml = (data.sections || []).map(sec => {
      if (sec.type === 'verificaciones') {
        const items = sec.items || [];
        return `
          <div class="doc-informe-section">
            <h3 class="doc-informe-sec-title">${sec.num}. ${escapeHtml(sec.title)}</h3>
            <ul class="doc-informe-bullet-list">
              ${items.map(item => `
                <li>
                  ${item.title ? `<strong>${escapeHtml(item.title)}:</strong> ` : ''}${escapeHtml(item.desc || '')}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }

      if (sec.type === 'propuesta') {
        const items = sec.items || [];
        const hasMultiple = items.length > 1;
        return `
          <div class="doc-informe-section">
            <h3 class="doc-informe-sec-title">${sec.num}. ${escapeHtml(sec.title)}</h3>
            ${sec.content ? `<div class="doc-informe-sec-body" style="margin-bottom: 12px;">${escapeHtml(sec.content).replace(/\n/g, '<br>')}</div>` : ''}
            <table class="doc-informe-table">
              <thead>
                <tr>
                  <th>TRABAJO PROPUESTO</th>
                  <th style="text-align: right; width: 170px;">VALOR</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(it => `
                  <tr>
                    <td>${escapeHtml(it.desc || '')}</td>
                    <td style="text-align: right; font-weight: 700;">${formatMoneyCop(it.valor)}</td>
                  </tr>
                `).join('')}
                ${hasMultiple ? `
                  <tr class="doc-informe-total-row" style="background: #f1f5f9; font-weight: 700;">
                    <td>TOTAL</td>
                    <td style="text-align: right; color: #0284c7;">${formatMoneyCop(data.propuestaTotal)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        `;
      }

      if (sec.type === 'observaciones') {
        const bullets = sec.bullets || [];
        return `
          <div class="doc-informe-section">
            <h3 class="doc-informe-sec-title">${sec.num}. ${escapeHtml(sec.title)}</h3>
            <ul class="doc-informe-bullet-list">
              ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      // Default text section (Motivo, Diagnóstico, Conclusión, Custom)
      const paragraphs = (sec.content || '').split('\n').filter(p => p.trim().length > 0);
      return `
        <div class="doc-informe-section">
          <h3 class="doc-informe-sec-title">${sec.num}. ${escapeHtml(sec.title)}</h3>
          <div class="doc-informe-sec-body">
            ${paragraphs.map(p => `<p style="margin-bottom: 8px;">${escapeHtml(p)}</p>`).join('')}
          </div>
        </div>
      `;
    }).join('');

    const elab = data.elaboradoPor || {};
    const signatureImg = (data.includeFirma !== false && elab.firma)
      ? `<img src="${elab.firma}" alt="Firma digital" class="doc-informe-firma-img">`
      : '';

    return `
      <div class="doc-informe-page-wrapper">
        <div class="doc-informe-top-tag">${escapeHtml(data.headerTag || 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO')}</div>
        
        <div class="doc-informe-header">
          ${data.includeLogo ? '<div style="margin-bottom: 12px;"><img src="assets/logo.png" alt="Logo" class="doc-informe-logo" style="width: 54px; height: 54px; object-fit: contain;"></div>' : ''}
          <h1 class="doc-informe-title">${escapeHtml(data.title || 'INFORME TÉCNICO')}</h1>
          ${data.subtitle ? `<div class="doc-informe-subtitle">${escapeHtml(data.subtitle)}</div>` : ''}
          ${data.showNumber ? `<div style="font-size: 0.82rem; color: #0284c7; font-weight: 600; margin-top: 4px;">${escapeHtml(data.number)}</div>` : ''}
        </div>

        <div class="doc-informe-ficha">
          <div class="doc-informe-ficha-row-top">
            <div class="doc-informe-ficha-field">
              <span class="doc-informe-ficha-label">CLIENTE</span>
              <span class="doc-informe-ficha-val">${escapeHtml(data.clientName || 'Cliente General')}${data.clientNit ? ' · NIT: ' + escapeHtml(data.clientNit) : ''}</span>
            </div>
          </div>
          <div class="doc-informe-ficha-grid">
            <div class="doc-informe-ficha-field">
              <span class="doc-informe-ficha-label">EQUIPO EVALUADO</span>
              <span class="doc-informe-ficha-val">${escapeHtml(data.equipment || 'No especificado')}${data.serial ? ' (S/N: ' + escapeHtml(data.serial) + ')' : ''}</span>
            </div>
            <div class="doc-informe-ficha-field">
              <span class="doc-informe-ficha-label">FECHA DEL INFORME</span>
              <span class="doc-informe-ficha-val">${escapeHtml(data.dateFormatted || '')}</span>
            </div>
            <div class="doc-informe-ficha-field">
              <span class="doc-informe-ficha-label">FALLA REPORTADA</span>
              <span class="doc-informe-ficha-val">${escapeHtml(data.falla || 'Diagnóstico preventivo')}</span>
            </div>
            <div class="doc-informe-ficha-field">
              <span class="doc-informe-ficha-label">TIPO DE SERVICIO</span>
              <span class="doc-informe-ficha-val">${escapeHtml(data.serviceType || 'Inspección y diagnóstico técnico')}</span>
            </div>
          </div>
        </div>

        <div class="doc-informe-sections-container">
          ${sectionsHtml}
        </div>

        <div class="doc-informe-firmas">
          <div class="doc-informe-firmas-left">
            <div class="doc-informe-firmas-label">ELABORADO POR</div>
            <div class="doc-informe-firmas-name">${escapeHtml(elab.name || 'Pedro Luis Roa Mora')}</div>
            <div class="doc-informe-firmas-sub">${escapeHtml(elab.cargo || 'Técnico de mantenimiento')}</div>
            <div class="doc-informe-firmas-sub">Correo: ${escapeHtml(elab.correo || 'pedrolroam@hotmail.com')}</div>
            <div class="doc-informe-firmas-sub">Celular: ${escapeHtml(elab.celular || '302 455 5428')}</div>
          </div>
          <div class="doc-informe-firmas-right">
            <div class="doc-informe-firma-line-block">
              <div class="doc-informe-firma-canvas-box">
                ${signatureImg}
              </div>
              <div class="doc-informe-firma-label-line">
                Firma: ______________________________
              </div>
              <div class="doc-informe-firma-date">
                Fecha: ${escapeHtml(elab.fecha || data.dateFormatted || '')}
              </div>
            </div>
          </div>
        </div>

        <div class="doc-informe-page-footer">
          Informe técnico · ${escapeHtml(data.equipment || 'Diagnóstico de hardware')}
        </div>
      </div>
    `;
  }

  function renderInformePreview(data) {
    const paper = $('informe-document');
    if (!paper) return;
    const docData = data || getInformeDataFromForm();
    paper.innerHTML = renderInformeDocumentHtml(docData);
    if ($('inf-badge-number')) {
      $('inf-badge-number').textContent = docData.number;
    }
  }

  // Generador de texto corto para WhatsApp y portapapeles
  function generateInformePlainText(data) {
    if (!data) data = getInformeDataFromForm();
    const propTotalStr = formatMoneyCop(data.propuestaTotal);
    let text = `*${data.title}* - ${data.number}\n`;
    text += `👤 *Cliente:* ${data.clientName || 'Cliente General'}${data.clientNit ? ' (NIT: ' + data.clientNit + ')' : ''}\n`;
    text += `💻 *Equipo:* ${data.equipment || 'Equipo evaluado'}${data.serial ? ' - S/N: ' + data.serial : ''}\n`;
    text += `⚠️ *Falla:* ${data.falla || 'Diagnóstico técnico'}\n`;

    const diagSec = (data.sections || []).find(s => s.type === 'text' && s.title.toLowerCase().includes('diagnóstico'));
    if (diagSec && diagSec.content) {
      const summary = diagSec.content.split('\n')[0].substring(0, 220);
      text += `🔍 *Diagnóstico:* ${summary}...\n`;
    }

    if (data.propuestaTotal > 0) {
      text += `💰 *Propuesta de reparación:* ${propTotalStr}\n`;
    }

    text += `📅 *Fecha:* ${data.dateFormatted}\n`;
    text += `👨‍🔧 *Elaborado por:* ${data.elaboradoPor?.name || 'Pedro Roa'} - Cel: ${data.elaboradoPor?.celular || '302 455 5428'}\n`;
    return text;
  }

  // Inicialización de valores del formulario de Informes
  function initInforme() {
    if (!$('view-informe-tecnico')) return;

    if ($('inf-date') && !$('inf-date').value) {
      $('inf-date').value = getTodayIsoDate();
    }
    if ($('inf-elab-date') && !$('inf-elab-date').value) {
      $('inf-elab-date').value = formatSpanishDate($('inf-date').value);
    }
    if ($('inf-num')) {
      $('inf-num').value = formatInformeNumber(state.informeNum);
    }
    if ($('inf-elab-name')) {
      $('inf-elab-name').value = state.cobroEmisor.name || state.business.name || 'Pedro Luis Roa Mora';
    }
    if ($('inf-elab-cargo')) {
      $('inf-elab-cargo').value = state.informeConfig.cargo || DEFAULT_INFORME_CONFIG.cargo;
    }
    if ($('inf-elab-correo')) {
      $('inf-elab-correo').value = state.informeConfig.correo || DEFAULT_INFORME_CONFIG.correo;
    }
    if ($('inf-elab-celular')) {
      $('inf-elab-celular').value = state.informeConfig.celular || DEFAULT_INFORME_CONFIG.celular;
    }
    if ($('inf-header-tag')) {
      $('inf-header-tag').value = state.informeConfig.headerTag || DEFAULT_INFORME_CONFIG.headerTag;
    }
    if ($('inf-service-type')) {
      $('inf-service-type').value = state.informeConfig.serviceType || DEFAULT_INFORME_CONFIG.serviceType;
    }
    if ($('inf-sec-obs-text') && !$('inf-sec-obs-text').value) {
      $('inf-sec-obs-text').value = state.informeConfig.defaultObs || DEFAULT_INFORME_CONFIG.defaultObs;
    }

    // Cargar textos del modelo Epson EcoTank L565 por defecto si los campos están vacíos
    if ($('inf-sec-motivo-text') && !$('inf-sec-motivo-text').value) {
      $('inf-sec-motivo-text').value = 'Se realiza la evaluación técnica de una impresora Epson EcoTank L565 debido a una anomalía en la calidad de impresión, caracterizada por la aparición de sombras y una dominante de color azul en los documentos impresos.';
    }
    if ($('inf-sec-diag-text') && !$('inf-sec-diag-text').value) {
      $('inf-sec-diag-text').value = `Con base en las verificaciones efectuadas, el cabezal de impresión presenta una falla funcional que genera sombras o una dominante azul en la impresión. La prueba cruzada, al presentar el mismo síntoma en otra impresora, respalda que el origen de la anomalía se encuentra en el cabezal.\n\nLa tinta encontrada, por su elevada dilución aparente, constituye una causa probable y relevante del deterioro. El uso de tinta de calidad inadecuada, contaminada o mezclada puede afectar el funcionamiento del sistema de impresión y contribuir a obstrucciones, contaminación o daños en el cabezal.`;
    }
    if ($('inf-sec-prop-text') && !$('inf-sec-prop-text').value) {
      $('inf-sec-prop-text').value = 'Se recomienda reemplazar el cabezal de impresión y, de forma complementaria, realizar el lavado de los tanques de tinta y del sistema correspondiente antes de cargar tinta nueva de calidad confiable y compatible con el modelo Epson L565. Esta intervención busca retirar residuos o contaminantes y reducir el riesgo de que el nuevo cabezal resulte afectado por tinta remanente.';
    }
    if ($('inf-sec-conc-text') && !$('inf-sec-conc-text').value) {
      $('inf-sec-conc-text').value = 'La Epson EcoTank L565 presenta una falla atribuible al cabezal de impresión, evidenciada por la reproducción de las sombras azules al probarlo en otra máquina. El bus de datos se aprecia en buen estado durante la inspección visual. La tinta muy diluida observada es un factor que contribuyo al daño, aunque no se puede establecer como causa única sin pruebas adicionales. Se propone el reemplazo del cabezal, lavado de tanques y suministro de tinta nueva por un valor total de $500.000 COP.';
    }

    renderInformeClientsDatalist();
    renderInformeVerificacionesUI();
    renderInformePropuestasUI();
    renderInformeCustomSectionsUI();
    renderInformePreview();
  }

  // Guardar informe actual en el historial
  function saveCurrentInforme(showToastMsg = true) {
    const data = getInformeDataFromForm();
    saveCobroClient(data.clientName, data.clientNit);

    const existingIdx = (state.informeHistory || []).findIndex(
      h => h.id === data.id || (h.number && h.number === data.number)
    );

    if (existingIdx >= 0) {
      data.id = state.informeHistory[existingIdx].id || data.id;
      data.status = state.informeHistory[existingIdx].status || data.status || 'Borrador';
      state.informeHistory[existingIdx] = data;
    } else {
      data.id = isValidUUID(data.id) ? data.id : generateUUID();
      data.status = data.status || 'Borrador';
      state.informeHistory.push(data);
      checkInformeNumberCollision(data.rawNumber, data.id);
    }

    state.currentInformeId = data.id;
    state.currentInformeStatus = data.status;

    setStorage('pr_informe_history', state.informeHistory);
    updateBadges();
    renderInformeHistory();

    if (showToastMsg) {
      showToast(`Informe técnico ${data.number} guardado con éxito`, '💾');
    }
    triggerIncrementalSync();
    return true;
  }

  // Restablecer formulario para un nuevo informe
  function resetInformeForm() {
    state.currentInformeId = generateUUID();
    state.currentInformeStatus = 'Borrador';
    
    // Consecutivo nuevo
    const nextNumber = formatInformeNumber(state.informeNum);
    if ($('inf-num')) $('inf-num').value = nextNumber;
    if ($('inf-badge-number')) $('inf-badge-number').textContent = nextNumber;

    if ($('inf-client-name')) $('inf-client-name').value = '';
    if ($('inf-client-nit')) $('inf-client-nit').value = '';
    if ($('inf-equipment')) $('inf-equipment').value = '';
    if ($('inf-serial')) $('inf-serial').value = '';
    if ($('inf-falla')) $('inf-falla').value = '';

    const todayIso = getTodayIsoDate();
    if ($('inf-date')) $('inf-date').value = todayIso;
    if ($('inf-elab-date')) $('inf-elab-date').value = formatSpanishDate(todayIso);

    if ($('inf-header-tag')) $('inf-header-tag').value = state.informeConfig.headerTag || DEFAULT_INFORME_CONFIG.headerTag;
    if ($('inf-title')) $('inf-title').value = 'INFORME TÉCNICO';
    if ($('inf-subtitle')) $('inf-subtitle').value = '';
    if ($('inf-service-type')) $('inf-service-type').value = state.informeConfig.serviceType || DEFAULT_INFORME_CONFIG.serviceType;

    // Resetear textos a predeterminados
    if ($('inf-sec-motivo-text')) $('inf-sec-motivo-text').value = '';
    if ($('inf-sec-diag-text')) $('inf-sec-diag-text').value = '';
    if ($('inf-sec-prop-text')) $('inf-sec-prop-text').value = '';
    if ($('inf-sec-obs-text')) $('inf-sec-obs-text').value = state.informeConfig.defaultObs || DEFAULT_INFORME_CONFIG.defaultObs;
    if ($('inf-sec-conc-text')) $('inf-sec-conc-text').value = '';

    // Checkboxes activadas
    ['motivo', 'verif', 'diag', 'prop', 'obs', 'conc'].forEach(key => {
      const chk = $(`inf-sec-${key}-inc`);
      if (chk) chk.checked = true;
    });

    if ($('inf-include-logo')) $('inf-include-logo').checked = true;
    if ($('inf-include-firma')) $('inf-include-firma').checked = true;
    if ($('inf-show-number')) $('inf-show-number').checked = false;

    // Listas vacías / mínimas
    state.currentInformeVerificaciones = [{ title: '', desc: '' }];
    state.currentInformePropuestas = [{ desc: '', valor: 0 }];
    state.currentInformeCustomSections = [];

    renderInformeVerificacionesUI();
    renderInformePropuestasUI();
    renderInformeCustomSectionsUI();
    renderInformePreview();

    showToast(`Nuevo informe ${nextNumber} preparado`, '✨');
  }

  // Cargar un informe guardado para editarlo
  function loadInformeFromHistory(idOrNum) {
    const item = (state.informeHistory || []).find(h => h.id === idOrNum || h.number === idOrNum);
    if (!item) return;

    state.currentInformeId = item.id;
    state.currentInformeStatus = item.status || 'Borrador';

    if ($('inf-num')) $('inf-num').value = item.number || formatInformeNumber(item.rawNumber);
    if ($('inf-header-tag')) $('inf-header-tag').value = item.headerTag || '';
    if ($('inf-title')) $('inf-title').value = item.title || 'INFORME TÉCNICO';
    if ($('inf-subtitle')) $('inf-subtitle').value = item.subtitle || '';

    if ($('inf-client-name')) $('inf-client-name').value = item.clientName || '';
    if ($('inf-client-nit')) $('inf-client-nit').value = item.clientNit || '';
    if ($('inf-equipment')) $('inf-equipment').value = item.equipment || '';
    if ($('inf-serial')) $('inf-serial').value = item.serial || '';
    if ($('inf-date')) $('inf-date').value = item.date || getTodayIsoDate();
    if ($('inf-service-type')) $('inf-service-type').value = item.serviceType || '';
    if ($('inf-falla')) $('inf-falla').value = item.falla || '';

    if ($('inf-sec-motivo-text')) $('inf-sec-motivo-text').value = item.motivo || '';
    if ($('inf-sec-diag-text')) $('inf-sec-diag-text').value = item.diagnostico || '';
    if ($('inf-sec-prop-text')) $('inf-sec-prop-text').value = item.propuestaTexto || '';
    if ($('inf-sec-obs-text')) $('inf-sec-obs-text').value = item.observaciones || '';
    if ($('inf-sec-conc-text')) $('inf-sec-conc-text').value = item.conclusion || '';

    if ($('inf-sec-motivo-inc')) $('inf-sec-motivo-inc').checked = item.secMotivoInc !== false;
    if ($('inf-sec-verif-inc')) $('inf-sec-verif-inc').checked = item.secVerifInc !== false;
    if ($('inf-sec-diag-inc')) $('inf-sec-diag-inc').checked = item.secDiagInc !== false;
    if ($('inf-sec-prop-inc')) $('inf-sec-prop-inc').checked = item.secPropInc !== false;
    if ($('inf-sec-obs-inc')) $('inf-sec-obs-inc').checked = item.secObsInc !== false;
    if ($('inf-sec-conc-inc')) $('inf-sec-conc-inc').checked = item.secConcInc !== false;

    if ($('inf-include-logo')) $('inf-include-logo').checked = item.includeLogo !== false;
    if ($('inf-include-firma')) $('inf-include-firma').checked = item.includeFirma !== false;
    if ($('inf-show-number')) $('inf-show-number').checked = item.showNumber === true;

    if (item.elaboradoPor) {
      if ($('inf-elab-cargo')) $('inf-elab-cargo').value = item.elaboradoPor.cargo || '';
      if ($('inf-elab-correo')) $('inf-elab-correo').value = item.elaboradoPor.correo || '';
      if ($('inf-elab-celular')) $('inf-elab-celular').value = item.elaboradoPor.celular || '';
      if ($('inf-elab-date')) $('inf-elab-date').value = item.elaboradoPor.fecha || item.dateFormatted || '';
    }

    state.currentInformeVerificaciones = Array.isArray(item.verificaciones) ? JSON.parse(JSON.stringify(item.verificaciones)) : [];
    state.currentInformePropuestas = Array.isArray(item.propuestaItems) ? JSON.parse(JSON.stringify(item.propuestaItems)) : [];
    state.currentInformeCustomSections = Array.isArray(item.customSections) ? JSON.parse(JSON.stringify(item.customSections)) : [];

    renderInformeVerificacionesUI();
    renderInformePropuestasUI();
    renderInformeCustomSectionsUI();
    renderInformePreview();

    switchSubview('view-informe-tecnico');
    showToast(`Informe ${item.number} cargado para edición`, '📖');
  }

  // Duplicar un informe
  function duplicateInforme(idOrNum) {
    const item = (state.informeHistory || []).find(h => h.id === idOrNum || h.number === idOrNum);
    if (!item) return;

    loadInformeFromHistory(idOrNum);
    state.currentInformeId = generateUUID();
    state.currentInformeStatus = 'Borrador';

    const newNum = formatInformeNumber(state.informeNum);
    if ($('inf-num')) $('inf-num').value = newNum;
    if ($('inf-badge-number')) $('inf-badge-number').textContent = newNum;

    const todayIso = getTodayIsoDate();
    if ($('inf-date')) $('inf-date').value = todayIso;
    if ($('inf-elab-date')) $('inf-elab-date').value = formatSpanishDate(todayIso);

    renderInformePreview();
    showToast(`Copia creada con consecutivo ${newNum}. Puedes modificarla y guardarla.`, '📋');
  }

  // Cambiar estado de un informe en el historial
  function changeInformeStatus(id, newStatus) {
    const item = (state.informeHistory || []).find(h => h.id === id);
    if (!item) return;
    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    setStorage('pr_informe_history', state.informeHistory);
    updateBadges();
    renderInformeHistory();
    triggerIncrementalSync();
    showToast(`Estado de ${item.number} actualizado a "${newStatus}"`, '🏷️');
  }

  // Eliminar informe
  function deleteInforme(id) {
    const idx = (state.informeHistory || []).findIndex(h => h.id === id);
    if (idx < 0) return;
    const item = state.informeHistory[idx];
    if (confirm(`¿Estás seguro de eliminar el informe ${item.number || ''} de ${item.clientName || 'Cliente General'}?`)) {
      if (item.id) {
        recordTombstone(item.id, 'informe_tecnico');
      }
      state.informeHistory.splice(idx, 1);
      setStorage('pr_informe_history', state.informeHistory);
      updateBadges();
      renderInformeHistory();
      triggerIncrementalSync();
      showToast('Informe eliminado del historial', '🗑️');
    }
  }

  // Cross-Module Bridges: Convertir a Cuenta de Cobro o Cotización sin guardar
  function createCobroFromInforme(id) {
    const inf = (state.informeHistory || []).find(h => h.id === id);
    if (!inf) return;

    const items = (inf.propuestaItems || []).filter(p => p.desc || parseFloat(p.valor) > 0);
    const conceptos = items.length > 0
      ? items.map(p => ({ desc: p.desc, amount: parseFloat(p.valor) || 0 }))
      : [{ desc: `Diagnóstico y reparación de ${inf.equipment || 'equipo'}`, amount: inf.propuestaTotal || 0 }];

    state.cobroClientName = inf.clientName || '';
    state.cobroClientNit = inf.clientNit || '';
    state.cobroConceptos = conceptos;
    state.cobroAdelantos = [];

    if ($('cc-client-name')) $('cc-client-name').value = inf.clientName || '';
    if ($('cc-client-nit')) $('cc-client-nit').value = inf.clientNit || '';

    setStorage('pr_cobro_conceptos', state.cobroConceptos);
    setStorage('pr_cobro_adelantos', state.cobroAdelantos);

    renderCobroConceptos();
    renderCobroAdelantos();
    renderCobroPreview();

    enterSection('cuentas-cobro', 'view-cuentas-cobro');
    showToast('Datos del informe cargados en Nueva Cuenta de Cobro. Revisa y guarda cuando estés listo.', '💼');
  }

  function createCotizacionFromInforme(id) {
    const inf = (state.informeHistory || []).find(h => h.id === id);
    if (!inf) return;

    const items = (inf.propuestaItems || []).filter(p => p.desc || parseFloat(p.valor) > 0);
    const quoteItems = items.length > 0
      ? items.map(p => {
          const val = parseFloat(p.valor) || 0;
          return {
            category: 'Servicio Técnico',
            name: p.desc,
            qty: 1,
            price: val,
            subtotal: val
          };
        })
      : [{
          category: 'Servicio Técnico',
          name: `Reparación y mantenimiento de ${inf.equipment || 'equipo'}`,
          qty: 1,
          price: inf.propuestaTotal || 0,
          subtotal: inf.propuestaTotal || 0
        }];

    state.currentQuote.clientName = inf.clientName || '';
    state.currentQuote.equipment = inf.equipment || '';
    state.currentQuote.items = quoteItems;

    if ($('q-client-name')) $('q-client-name').value = inf.clientName || '';
    if ($('q-equipment')) $('q-equipment').value = inf.equipment || '';

    renderQuoteItems();
    renderLivePreview();

    enterSection('cotizaciones', 'view-cotizador');
    showToast('Datos del informe cargados en Nueva Cotización. Revisa y guarda cuando estés listo.', '📋');
  }

  // Renderizar lista del Historial de Informes Técnicos
  function renderInformeHistory() {
    const list = $('inf-history-list');
    if (!list) return;

    const hist = Array.isArray(state.informeHistory) ? state.informeHistory : [];
    const searchVal = ($('inf-hist-search') ? $('inf-hist-search').value : '').trim().toLowerCase();
    const statusFilter = $('inf-hist-filter-status') ? $('inf-hist-filter-status').value : 'all';
    const monthFilter = $('inf-hist-filter-month') ? $('inf-hist-filter-month').value : '';

    // Filtrar
    const filtered = hist.filter(item => {
      if (searchVal) {
        const text = `${item.number || ''} ${item.clientName || ''} ${item.clientNit || ''} ${item.equipment || ''} ${item.serial || ''} ${item.falla || ''}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }
      if (statusFilter !== 'all' && (item.status || 'Borrador') !== statusFilter) {
        return false;
      }
      if (monthFilter && item.date) {
        if (!item.date.startsWith(monthFilter)) return false;
      }
      return true;
    });

    // Estadísticas
    const totalCount = hist.length;
    let pendingCount = 0;
    let totalPropuestas = 0;
    hist.forEach(h => {
      const val = (h.propuestaItems || []).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
      totalPropuestas += val;
      if (h.status === 'Enviado') pendingCount++;
    });

    if ($('inf-stat-total-count')) $('inf-stat-total-count').textContent = totalCount;
    if ($('inf-stat-pending-count')) $('inf-stat-pending-count').textContent = pendingCount;
    if ($('inf-stat-total-propuestas')) $('inf-stat-total-propuestas').textContent = formatMoneyCop(totalPropuestas);

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 16px; text-align: center;">
          <span style="font-size: 2.4rem; display: block; margin-bottom: 8px;">🛠️</span>
          <h4 style="font-size: 1.05rem; margin-bottom: 6px;">No se encontraron informes</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 380px; margin: 0 auto 16px;">
            ${hist.length === 0 ? 'Crea tu primer informe de diagnóstico técnico para computadores, impresoras y hardware.' : 'No hay informes que coincidan con los filtros seleccionados.'}
          </p>
          <button type="button" class="btn-primary" id="btn-empty-create-inf" style="margin: 0 auto; font-size: 0.82rem; padding: 8px 16px;">
            <span>✨</span> Crear Nuevo Informe
          </button>
        </div>
      `;
      const emptyBtn = $('btn-empty-create-inf');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          resetInformeForm();
          switchSubview('view-informe-tecnico');
        });
      }
      return;
    }

    // Ordenar de más reciente a más antiguo
    const sorted = [...filtered].reverse();

    list.innerHTML = sorted.map(item => {
      const st = item.status || 'Borrador';
      const badgeClass = st === 'Enviado' ? 'badge-enviado' : (st === 'Aprobado' ? 'badge-aprobado' : (st === 'Rechazado' ? 'badge-rechazado' : 'badge-borrador'));
      const propTotal = (item.propuestaItems || []).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);

      return `
        <div class="cobro-history-card" data-inf-id="${escapeHtml(item.id)}">
          <div class="cobro-card-top">
            <div class="cobro-card-num-group">
              <span class="cobro-card-number" style="color: #38bdf8;">${escapeHtml(item.number || 'INF')}</span>
              <span class="cobro-card-date">${escapeHtml(item.dateFormatted || item.date || '')}</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <select class="inf-status-select card-badge ${badgeClass}" data-inf-id="${escapeHtml(item.id)}" style="cursor: pointer; border: none; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px;" title="Cambiar estado del informe">
                <option value="Borrador" ${st === 'Borrador' ? 'selected' : ''}>Borrador</option>
                <option value="Enviado" ${st === 'Enviado' ? 'selected' : ''}>Enviado</option>
                <option value="Aprobado" ${st === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
                <option value="Rechazado" ${st === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
              </select>
            </div>
          </div>

          <div class="cobro-card-client-row">
            <div>
              <div class="cobro-card-client-name" style="font-size: 0.95rem;">${escapeHtml(item.clientName || 'Cliente General')}</div>
              ${item.clientNit ? `<div class="cobro-card-client-nit">NIT: ${escapeHtml(item.clientNit)}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.72rem; color: var(--text-dim); display: block;">PROPUESTA:</span>
              <span class="cobro-card-saldo-val" style="color: #38bdf8;">${formatMoneyCop(propTotal)}</span>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.18); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 0.8rem; border-left: 3px solid #38bdf8;">
            <div><strong>Equipo:</strong> ${escapeHtml(item.equipment || 'No especificado')}${item.serial ? ' (S/N: ' + escapeHtml(item.serial) + ')' : ''}</div>
            ${item.falla ? `<div style="color: var(--text-muted); margin-top: 2px;"><strong>Falla:</strong> ${escapeHtml(item.falla)}</div>` : ''}
          </div>

          <div class="cobro-card-actions" style="position: relative;">
            <button type="button" class="btn-primary btn-inf-act-open" data-inf-id="${escapeHtml(item.id)}" style="padding: 6px 12px; font-size: 0.8rem;">
              <span>📖</span> Abrir
            </button>
            <button type="button" class="btn-secondary btn-inf-act-dup" data-inf-id="${escapeHtml(item.id)}" style="padding: 6px 12px; font-size: 0.8rem;">
              <span>📋</span> Duplicar
            </button>
            <button type="button" class="btn-secondary btn-inf-act-pdf" data-inf-id="${escapeHtml(item.id)}" style="padding: 6px 12px; font-size: 0.8rem;">
              <span>👁️</span> Ver PDF
            </button>
            <button type="button" class="btn-whatsapp btn-inf-act-wa" data-inf-id="${escapeHtml(item.id)}" style="padding: 6px 12px; font-size: 0.8rem;">
              <span>📲</span> WhatsApp
            </button>
            
            <div style="position: relative; margin-left: auto;">
              <button type="button" class="btn-secondary btn-inf-more-trigger" data-inf-id="${escapeHtml(item.id)}" style="padding: 6px 10px; font-size: 0.85rem;" title="Más opciones">
                ⋮ Más
              </button>
              <div class="dropdown-menu inf-more-dropdown" id="dropdown-${escapeHtml(item.id)}" style="display: none; position: absolute; right: 0; bottom: calc(100% + 4px); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 50; min-width: 220px; padding: 6px 0;">
                <button type="button" class="dropdown-item btn-inf-create-cobro" data-inf-id="${escapeHtml(item.id)}" style="width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-main); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                  <span>💼</span> Crear cuenta de cobro
                </button>
                <button type="button" class="dropdown-item btn-inf-create-cot" data-inf-id="${escapeHtml(item.id)}" style="width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-main); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> Crear cotización
                </button>
                <button type="button" class="dropdown-item btn-inf-save-tpl" data-inf-id="${escapeHtml(item.id)}" style="width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-main); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                  <span>📑</span> Guardar como plantilla
                </button>
                <button type="button" class="dropdown-item btn-inf-copy-txt" data-inf-id="${escapeHtml(item.id)}" style="width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-main); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> Copiar texto resumen
                </button>
                <div style="height: 1px; background: var(--border); margin: 4px 0;"></div>
                <button type="button" class="dropdown-item btn-inf-del" data-inf-id="${escapeHtml(item.id)}" style="width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: #f87171; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                  <span>🗑️</span> Eliminar informe
                </button>
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');
  }

  // Exportar e Importar Historial de Informes
  function exportInformeHistory() {
    try {
      const dataStr = JSON.stringify(state.informeHistory, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informes_tecnicos_backup_${getTodayIsoDate()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Historial de informes exportado con éxito', '📥');
    } catch (e) {
      showToast('Error al exportar historial', '⚠️');
    }
  }

  function importInformeHistory(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) throw new Error('Formato no válido');
        let added = 0;
        parsed.forEach(item => {
          if (!item.id) item.id = generateUUID();
          const idx = state.informeHistory.findIndex(h => h.id === item.id);
          if (idx >= 0) {
            state.informeHistory[idx] = item;
          } else {
            state.informeHistory.push(item);
            added++;
          }
        });
        setStorage('pr_informe_history', state.informeHistory);
        updateBadges();
        renderInformeHistory();
        triggerIncrementalSync();
        showToast(`Importados ${parsed.length} informes (${added} nuevos)`, '📤');
      } catch (err) {
        showToast('Error al leer el archivo JSON de informes', '❌');
      }
    };
    reader.readAsText(file);
  }

  // ==========================================================================
  // PLANTILLAS DE INFORMES TÉCNICOS
  // ==========================================================================

  function renderInformePlantillasList() {
    const list = $('inf-plantillas-list');
    if (!list) return;
    const tpls = Array.isArray(state.informePlantillas) ? state.informePlantillas : [];

    if (tpls.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 30px 16px; text-align: center;">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📑</span>
          <p style="font-size: 0.85rem; color: var(--text-muted);">No tienes plantillas guardadas aún. Puedes guardar tus informes frecuentes como plantilla.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = tpls.map(t => `
      <div class="card" style="padding: 14px; background: rgba(22, 26, 36, 0.7); border: 1px solid var(--border); border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
          <div>
            <strong style="font-size: 0.95rem; color: #38bdf8; display: block;">${escapeHtml(t.name || 'Plantilla de diagnóstico')}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(t.subtitle || t.title || '')}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-primary btn-tpl-use" data-tpl-id="${escapeHtml(t.id)}" style="padding: 5px 12px; font-size: 0.78rem;">
              <span>✨</span> Usar plantilla
            </button>
            <button type="button" class="btn-secondary btn-tpl-rename" data-tpl-id="${escapeHtml(t.id)}" style="padding: 5px 10px; font-size: 0.78rem;" title="Renombrar plantilla">
              ✏️
            </button>
            <button type="button" class="btn-icon btn-danger btn-tpl-del" data-tpl-id="${escapeHtml(t.id)}" style="padding: 5px 8px; font-size: 0.78rem;" title="Eliminar plantilla">
              🗑️
            </button>
          </div>
        </div>
        ${t.motivo ? `<div style="font-size: 0.8rem; color: var(--text-dim); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(t.motivo)}</div>` : ''}
      </div>
    `).join('');
  }

  function saveCurrentAsPlantilla(nameOverride = null) {
    const data = getInformeDataFromForm();
    let name = nameOverride;
    if (!name) {
      name = prompt('Nombre para la nueva plantilla:', data.subtitle || 'Diagnóstico de equipo');
    }
    if (!name || !name.trim()) return;
    name = name.trim();

    const tpl = {
      id: generateUUID(),
      name,
      title: data.title,
      subtitle: data.subtitle,
      headerTag: data.headerTag,
      serviceType: data.serviceType,
      falla: data.falla,
      motivo: data.motivo,
      verificaciones: Array.isArray(data.verificaciones) ? JSON.parse(JSON.stringify(data.verificaciones)) : [],
      diagnostico: data.diagnostico,
      propuestaTexto: data.propuestaTexto,
      propuestaItems: Array.isArray(data.propuestaItems) ? data.propuestaItems.map(p => ({ desc: p.desc, valor: 0 })) : [],
      observaciones: data.observaciones,
      conclusion: data.conclusion,
      customSections: Array.isArray(data.customSections) ? JSON.parse(JSON.stringify(data.customSections)) : [],
      updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(state.informePlantillas)) state.informePlantillas = [];
    state.informePlantillas.push(tpl);
    setStorage('pr_informe_plantillas', state.informePlantillas);
    renderInformePlantillasList();
    triggerIncrementalSync();
    showToast(`Plantilla "${name}" guardada con éxito`, '💾');
  }

  function applyPlantilla(tplId) {
    const tpl = (state.informePlantillas || []).find(t => t.id === tplId);
    if (!tpl) return;

    if ($('inf-header-tag')) $('inf-header-tag').value = tpl.headerTag || '';
    if ($('inf-title')) $('inf-title').value = tpl.title || 'INFORME TÉCNICO';
    if ($('inf-subtitle')) $('inf-subtitle').value = tpl.subtitle || '';
    if ($('inf-service-type')) $('inf-service-type').value = tpl.serviceType || '';
    if ($('inf-falla')) $('inf-falla').value = tpl.falla || '';

    if ($('inf-sec-motivo-text')) $('inf-sec-motivo-text').value = tpl.motivo || '';
    if ($('inf-sec-diag-text')) $('inf-sec-diag-text').value = tpl.diagnostico || '';
    if ($('inf-sec-prop-text')) $('inf-sec-prop-text').value = tpl.propuestaTexto || '';
    if ($('inf-sec-obs-text')) $('inf-sec-obs-text').value = tpl.observaciones || '';
    if ($('inf-sec-conc-text')) $('inf-sec-conc-text').value = tpl.conclusion || '';

    state.currentInformeVerificaciones = Array.isArray(tpl.verificaciones) ? JSON.parse(JSON.stringify(tpl.verificaciones)) : [];
    state.currentInformePropuestas = Array.isArray(tpl.propuestaItems) ? JSON.parse(JSON.stringify(tpl.propuestaItems)) : [{ desc: '', valor: 0 }];
    state.currentInformeCustomSections = Array.isArray(tpl.customSections) ? JSON.parse(JSON.stringify(tpl.customSections)) : [];

    renderInformeVerificacionesUI();
    renderInformePropuestasUI();
    renderInformeCustomSectionsUI();
    renderInformePreview();

    switchSubview('view-informe-tecnico');
    showToast(`Plantilla "${tpl.name}" aplicada correctamente`, '📑');
  }

  function renamePlantilla(tplId) {
    const tpl = (state.informePlantillas || []).find(t => t.id === tplId);
    if (!tpl) return;
    const newName = prompt('Nuevo nombre para la plantilla:', tpl.name || '');
    if (!newName || !newName.trim()) return;
    tpl.name = newName.trim();
    tpl.updatedAt = new Date().toISOString();
    setStorage('pr_informe_plantillas', state.informePlantillas);
    renderInformePlantillasList();
    triggerIncrementalSync();
    showToast('Plantilla renombrada con éxito', '✏️');
  }

  function deletePlantilla(tplId) {
    const idx = (state.informePlantillas || []).findIndex(t => t.id === tplId);
    if (idx < 0) return;
    const tpl = state.informePlantillas[idx];
    if (confirm(`¿Eliminar la plantilla "${tpl.name}"?`)) {
      recordTombstone(tpl.id, 'plantilla_informe');
      state.informePlantillas.splice(idx, 1);
      setStorage('pr_informe_plantillas', state.informePlantillas);
      renderInformePlantillasList();
      triggerIncrementalSync();
      showToast('Plantilla eliminada', '🗑️');
    }
  }

  // ==========================================================================
  // MIS DATOS (INFORMES TÉCNICOS)
  // ==========================================================================

  function syncInformeDatosUI() {
    if (!$('view-informe-datos')) return;
    const cfg = state.informeConfig || DEFAULT_INFORME_CONFIG;
    if ($('inf-datos-cargo')) $('inf-datos-cargo').value = cfg.cargo || DEFAULT_INFORME_CONFIG.cargo;
    if ($('inf-datos-correo')) $('inf-datos-correo').value = cfg.correo || DEFAULT_INFORME_CONFIG.correo;
    if ($('inf-datos-celular')) $('inf-datos-celular').value = cfg.celular || DEFAULT_INFORME_CONFIG.celular;
    if ($('inf-datos-tag')) $('inf-datos-tag').value = cfg.headerTag || DEFAULT_INFORME_CONFIG.headerTag;
    if ($('inf-datos-service')) $('inf-datos-service').value = cfg.serviceType || DEFAULT_INFORME_CONFIG.serviceType;
    if ($('inf-datos-obs')) $('inf-datos-obs').value = cfg.defaultObs || DEFAULT_INFORME_CONFIG.defaultObs;
  }

  function saveInformeDatosFromUI() {
    state.informeConfig = {
      cargo: $('inf-datos-cargo') ? $('inf-datos-cargo').value.trim() : DEFAULT_INFORME_CONFIG.cargo,
      correo: $('inf-datos-correo') ? $('inf-datos-correo').value.trim() : DEFAULT_INFORME_CONFIG.correo,
      celular: $('inf-datos-celular') ? $('inf-datos-celular').value.trim() : DEFAULT_INFORME_CONFIG.celular,
      headerTag: $('inf-datos-tag') ? $('inf-datos-tag').value.trim() : DEFAULT_INFORME_CONFIG.headerTag,
      serviceType: $('inf-datos-service') ? $('inf-datos-service').value.trim() : DEFAULT_INFORME_CONFIG.serviceType,
      defaultObs: $('inf-datos-obs') ? $('inf-datos-obs').value : DEFAULT_INFORME_CONFIG.defaultObs
    };

    setStorage('pr_informe_config', state.informeConfig);

    // Actualizar campos en el formulario de informe si están con valores predeterminados
    if ($('inf-elab-cargo')) $('inf-elab-cargo').value = state.informeConfig.cargo;
    if ($('inf-elab-correo')) $('inf-elab-correo').value = state.informeConfig.correo;
    if ($('inf-elab-celular')) $('inf-elab-celular').value = state.informeConfig.celular;
    if ($('inf-header-tag')) $('inf-header-tag').value = state.informeConfig.headerTag;
    if ($('inf-service-type')) $('inf-service-type').value = state.informeConfig.serviceType;

    renderInformePreview();
    triggerIncrementalSync();
    showToast('Datos de informes técnicos guardados', '💾');
  }

  // ==========================================================================
  // EVENT LISTENERS DE INFORMES TÉCNICOS
  // ==========================================================================

  function setupInformeEvents() {
    // 1. Toggle colapsar vista previa
    const btnToggleInfPrev = $('btn-toggle-inf-preview');
    if (btnToggleInfPrev) {
      btnToggleInfPrev.addEventListener('click', toggleInformePreviewCollapse);
    }
    updateInformePreviewCollapseUI(getInformePreviewCollapsed());

    // 2. Escuchar cambios en campos de texto para actualizar preview en tiempo real
    const liveInputIds = [
      'inf-header-tag', 'inf-title', 'inf-subtitle',
      'inf-client-name', 'inf-client-nit', 'inf-equipment', 'inf-serial',
      'inf-date', 'inf-service-type', 'inf-falla',
      'inf-sec-motivo-title', 'inf-sec-motivo-text',
      'inf-sec-verif-title',
      'inf-sec-diag-title', 'inf-sec-diag-text',
      'inf-sec-prop-title', 'inf-sec-prop-text',
      'inf-sec-obs-title', 'inf-sec-obs-text',
      'inf-sec-conc-title', 'inf-sec-conc-text',
      'inf-elab-cargo', 'inf-elab-correo', 'inf-elab-celular', 'inf-elab-date', 'inf-num'
    ];

    liveInputIds.forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener('input', () => renderInformePreview());
      }
    });

    // Escuchar selección de cliente en datalist para autocompletar NIT
    const clientInput = $('inf-client-name');
    if (clientInput) {
      clientInput.addEventListener('change', () => {
        const val = clientInput.value.trim().toLowerCase();
        const found = (state.cobroClients || []).find(c => c.name.toLowerCase() === val);
        if (found && found.nit && $('inf-client-nit')) {
          $('inf-client-nit').value = found.nit;
          renderInformePreview();
        }
      });
    }

    // Fecha del informe actualiza automáticamente la fecha en elaborado por si no ha sido personalizada
    const dateInput = $('inf-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        if ($('inf-elab-date')) {
          $('inf-elab-date').value = formatSpanishDate(dateInput.value);
        }
        renderInformePreview();
      });
    }

    // Toggles de incluir secciones y casillas de visualización
    const toggleIds = [
      'inf-sec-motivo-inc', 'inf-sec-verif-inc', 'inf-sec-diag-inc',
      'inf-sec-prop-inc', 'inf-sec-obs-inc', 'inf-sec-conc-inc',
      'inf-include-logo', 'inf-include-firma', 'inf-show-number'
    ];

    toggleIds.forEach(id => {
      const el = $(id);
      if (el) {
        el.addEventListener('change', () => renderInformePreview());
      }
    });

    // 3. Verificaciones y pruebas interacciones
    const btnAddVerif = $('btn-inf-add-verif');
    if (btnAddVerif) {
      btnAddVerif.addEventListener('click', () => {
        if (!Array.isArray(state.currentInformeVerificaciones)) state.currentInformeVerificaciones = [];
        state.currentInformeVerificaciones.push({ title: '', desc: '' });
        renderInformeVerificacionesUI();
        renderInformePreview();
      });
    }

    const verifContainer = $('inf-verif-items-container');
    if (verifContainer) {
      verifContainer.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (isNaN(idx) || !state.currentInformeVerificaciones[idx]) return;
        if (e.target.classList.contains('verif-item-title-input')) {
          state.currentInformeVerificaciones[idx].title = e.target.value;
        } else if (e.target.classList.contains('verif-item-desc-input')) {
          state.currentInformeVerificaciones[idx].desc = e.target.value;
        }
        renderInformePreview();
      });

      verifContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-verif-del');
        if (delBtn) {
          const idx = parseInt(delBtn.dataset.index, 10);
          if (!isNaN(idx) && state.currentInformeVerificaciones[idx]) {
            state.currentInformeVerificaciones.splice(idx, 1);
            if (state.currentInformeVerificaciones.length === 0) {
              state.currentInformeVerificaciones.push({ title: '', desc: '' });
            }
            renderInformeVerificacionesUI();
            renderInformePreview();
          }
          return;
        }

        const upBtn = e.target.closest('.btn-verif-up');
        if (upBtn) {
          const idx = parseInt(upBtn.dataset.index, 10);
          if (idx > 0) {
            const temp = state.currentInformeVerificaciones[idx];
            state.currentInformeVerificaciones[idx] = state.currentInformeVerificaciones[idx - 1];
            state.currentInformeVerificaciones[idx - 1] = temp;
            renderInformeVerificacionesUI();
            renderInformePreview();
          }
          return;
        }

        const downBtn = e.target.closest('.btn-verif-down');
        if (downBtn) {
          const idx = parseInt(downBtn.dataset.index, 10);
          if (idx < state.currentInformeVerificaciones.length - 1) {
            const temp = state.currentInformeVerificaciones[idx];
            state.currentInformeVerificaciones[idx] = state.currentInformeVerificaciones[idx + 1];
            state.currentInformeVerificaciones[idx + 1] = temp;
            renderInformeVerificacionesUI();
            renderInformePreview();
          }
          return;
        }
      });
    }

    // 4. Trabajos Propuestos interacciones
    const btnAddTrabajo = $('btn-inf-add-trabajo');
    if (btnAddTrabajo) {
      btnAddTrabajo.addEventListener('click', () => {
        if (!Array.isArray(state.currentInformePropuestas)) state.currentInformePropuestas = [];
        state.currentInformePropuestas.push({ desc: '', valor: 0 });
        renderInformePropuestasUI();
        renderInformePreview();
      });
    }

    const propContainer = $('inf-propuesta-items-container');
    if (propContainer) {
      propContainer.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (isNaN(idx) || !state.currentInformePropuestas[idx]) return;
        if (e.target.classList.contains('propuesta-row-desc')) {
          state.currentInformePropuestas[idx].desc = e.target.value;
        } else if (e.target.classList.contains('propuesta-row-val')) {
          state.currentInformePropuestas[idx].valor = parseFloat(e.target.value) || 0;
          let total = 0;
          state.currentInformePropuestas.forEach(p => total += (parseFloat(p.valor) || 0));
          if ($('inf-propuesta-total-val')) $('inf-propuesta-total-val').textContent = formatMoneyCop(total);
          updateMobileStickyBar();
        }
        renderInformePreview();
      });

      propContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-prop-del');
        if (delBtn) {
          const idx = parseInt(delBtn.dataset.index, 10);
          if (!isNaN(idx) && state.currentInformePropuestas[idx]) {
            state.currentInformePropuestas.splice(idx, 1);
            if (state.currentInformePropuestas.length === 0) {
              state.currentInformePropuestas.push({ desc: '', valor: 0 });
            }
            renderInformePropuestasUI();
            renderInformePreview();
          }
        }
      });
    }

    // 5. Secciones personalizadas extras
    const btnAddCustomSec = $('btn-inf-add-custom-section');
    if (btnAddCustomSec) {
      btnAddCustomSec.addEventListener('click', () => {
        if (!Array.isArray(state.currentInformeCustomSections)) state.currentInformeCustomSections = [];
        state.currentInformeCustomSections.push({
          title: `Sección adicional ${state.currentInformeCustomSections.length + 1}`,
          content: '',
          included: true
        });
        renderInformeCustomSectionsUI();
        renderInformePreview();
      });
    }

    const customSecContainer = $('inf-custom-sections-container');
    if (customSecContainer) {
      customSecContainer.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (isNaN(idx) || !state.currentInformeCustomSections[idx]) return;
        if (e.target.classList.contains('custom-sec-title')) {
          state.currentInformeCustomSections[idx].title = e.target.value;
        } else if (e.target.classList.contains('custom-sec-text')) {
          state.currentInformeCustomSections[idx].content = e.target.value;
        }
        renderInformePreview();
      });

      customSecContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('custom-sec-inc')) {
          const idx = parseInt(e.target.dataset.index, 10);
          if (!isNaN(idx) && state.currentInformeCustomSections[idx]) {
            state.currentInformeCustomSections[idx].included = e.target.checked;
            renderInformePreview();
          }
        }
      });

      customSecContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-custom-sec-del');
        if (delBtn) {
          const idx = parseInt(delBtn.dataset.index, 10);
          if (!isNaN(idx) && state.currentInformeCustomSections[idx]) {
            state.currentInformeCustomSections.splice(idx, 1);
            renderInformeCustomSectionsUI();
            renderInformePreview();
          }
        }
      });
    }

    // 6. Restablecer observaciones a predeterminadas
    const btnResetObs = $('btn-inf-reset-obs');
    if (btnResetObs) {
      btnResetObs.addEventListener('click', () => {
        if ($('inf-sec-obs-text')) {
          $('inf-sec-obs-text').value = state.informeConfig.defaultObs || DEFAULT_INFORME_CONFIG.defaultObs;
          renderInformePreview();
          showToast('Observaciones restablecidas a las de Mis datos', '🔄');
        }
      });
    }

    // 7. Acciones principales del formulario
    const btnSave = $('btn-inf-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => saveCurrentInforme(true));
    }

    const btnNew = $('btn-inf-new');
    if (btnNew) {
      btnNew.addEventListener('click', resetInformeForm);
    }

    const btnPreviewPdf = $('btn-inf-preview-pdf');
    if (btnPreviewPdf) {
      btnPreviewPdf.addEventListener('click', () => {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        renderInformePreview(data);
        window.PedroRoaPdf.previewInformePdf(data);
      });
    }

    const btnDownloadPdf = $('btn-inf-download-pdf');
    if (btnDownloadPdf) {
      btnDownloadPdf.addEventListener('click', () => {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentInforme(false);
        showToast('Descargando archivo PDF...', '📥');
        window.PedroRoaPdf.downloadInformePdf(data);
      });
    }

    const btnPrint = $('btn-inf-print');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentInforme(false);
        renderInformePreview(data);
        window.print();
      });
    }

    const btnWhatsAppPdf = $('btn-inf-whatsapp-pdf');
    if (btnWhatsAppPdf) {
      btnWhatsAppPdf.addEventListener('click', async () => {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentInforme(false);
        const result = await window.PedroRoaPdf.shareInformePdfViaWhatsApp(data);
        if (result && result.success && result.method === 'native-share') {
          showToast('Compartiendo PDF de informe directamente en WhatsApp...', '🚀');
        }
      });
    }

    const btnWhatsAppText = $('btn-inf-whatsapp-text');
    if (btnWhatsAppText) {
      btnWhatsAppText.addEventListener('click', () => {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        saveCurrentInforme(false);
        const text = generateInformePlainText(data);
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
    }

    const btnCopyText = $('btn-inf-copy-text');
    if (btnCopyText) {
      btnCopyText.addEventListener('click', async () => {
        const data = getInformeDataFromForm();
        const text = generateInformePlainText(data);
        try {
          await navigator.clipboard.writeText(text);
          showToast('Texto del informe copiado al portapapeles', '📋');
        } catch (e) {
          showToast('No se pudo copiar automáticamente', '⚠️');
        }
      });
    }

    // Botones rápidos de plantilla en el formulario
    const btnPickTpl = $('btn-inf-pick-template');
    if (btnPickTpl) {
      btnPickTpl.addEventListener('click', () => switchSubview('view-informe-plantillas'));
    }

    const btnQuickSaveTpl = $('btn-inf-quick-save-template');
    if (btnQuickSaveTpl) {
      btnQuickSaveTpl.addEventListener('click', () => saveCurrentAsPlantilla());
    }

    // 8. Eventos de la lista del historial
    const histList = $('inf-history-list');
    if (histList) {
      histList.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.btn-inf-act-open');
        if (openBtn) {
          loadInformeFromHistory(openBtn.dataset.infId);
          return;
        }

        const dupBtn = e.target.closest('.btn-inf-act-dup');
        if (dupBtn) {
          duplicateInforme(dupBtn.dataset.infId);
          return;
        }

        const pdfBtn = e.target.closest('.btn-inf-act-pdf');
        if (pdfBtn) {
          const item = (state.informeHistory || []).find(h => h.id === pdfBtn.dataset.infId);
          if (item) window.PedroRoaPdf.previewInformePdf(item);
          return;
        }

        const waBtn = e.target.closest('.btn-inf-act-wa');
        if (waBtn) {
          const item = (state.informeHistory || []).find(h => h.id === waBtn.dataset.infId);
          if (item) window.PedroRoaPdf.shareInformePdfViaWhatsApp(item);
          return;
        }

        // Dropdown toggle
        const moreBtn = e.target.closest('.btn-inf-more-trigger');
        if (moreBtn) {
          e.stopPropagation();
          const drop = $(`dropdown-${moreBtn.dataset.infId}`);
          document.querySelectorAll('.inf-more-dropdown').forEach(d => {
            if (d !== drop) d.style.display = 'none';
          });
          if (drop) {
            drop.style.display = drop.style.display === 'block' ? 'none' : 'block';
          }
          return;
        }

        // Acciones del dropdown
        const cobroBtn = e.target.closest('.btn-inf-create-cobro');
        if (cobroBtn) {
          createCobroFromInforme(cobroBtn.dataset.infId);
          return;
        }

        const cotBtn = e.target.closest('.btn-inf-create-cot');
        if (cotBtn) {
          createCotizacionFromInforme(cotBtn.dataset.infId);
          return;
        }

        const tplBtn = e.target.closest('.btn-inf-save-tpl');
        if (tplBtn) {
          const item = (state.informeHistory || []).find(h => h.id === tplBtn.dataset.infId);
          if (item) {
            const name = prompt('Nombre para la plantilla a partir de este informe:', item.subtitle || item.equipment || 'Plantilla');
            if (name) {
              const tpl = {
                id: generateUUID(),
                name: name.trim(),
                title: item.title,
                subtitle: item.subtitle,
                headerTag: item.headerTag,
                serviceType: item.serviceType,
                falla: item.falla,
                motivo: item.motivo,
                verificaciones: Array.isArray(item.verificaciones) ? JSON.parse(JSON.stringify(item.verificaciones)) : [],
                diagnostico: item.diagnostico,
                propuestaTexto: item.propuestaTexto,
                propuestaItems: Array.isArray(item.propuestaItems) ? item.propuestaItems.map(p => ({ desc: p.desc, valor: 0 })) : [],
                observaciones: item.observaciones,
                conclusion: item.conclusion,
                customSections: Array.isArray(item.customSections) ? JSON.parse(JSON.stringify(item.customSections)) : [],
                updatedAt: new Date().toISOString()
              };
              if (!Array.isArray(state.informePlantillas)) state.informePlantillas = [];
              state.informePlantillas.push(tpl);
              setStorage('pr_informe_plantillas', state.informePlantillas);
              renderInformePlantillasList();
              triggerIncrementalSync();
              showToast(`Plantilla "${name}" guardada con éxito`, '💾');
            }
          }
          return;
        }

        const copyBtn = e.target.closest('.btn-inf-copy-txt');
        if (copyBtn) {
          const item = (state.informeHistory || []).find(h => h.id === copyBtn.dataset.infId);
          if (item) {
            const text = generateInformePlainText(item);
            navigator.clipboard.writeText(text)
              .then(() => showToast('Resumen del informe copiado', '📋'))
              .catch(() => showToast('No se pudo copiar', '⚠️'));
          }
          return;
        }

        const delBtn = e.target.closest('.btn-inf-del');
        if (delBtn) {
          deleteInforme(delBtn.dataset.infId);
          return;
        }
      });

      histList.addEventListener('change', (e) => {
        if (e.target.classList.contains('inf-status-select')) {
          changeInformeStatus(e.target.dataset.infId, e.target.value);
        }
      });
    }

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', () => {
      document.querySelectorAll('.inf-more-dropdown').forEach(d => d.style.display = 'none');
    });

    // Filtros del historial
    const histSearch = $('inf-hist-search');
    if (histSearch) histSearch.addEventListener('input', renderInformeHistory);

    const histFilterStatus = $('inf-hist-filter-status');
    if (histFilterStatus) histFilterStatus.addEventListener('change', renderInformeHistory);

    const histFilterMonth = $('inf-hist-filter-month');
    if (histFilterMonth) histFilterMonth.addEventListener('change', renderInformeHistory);

    const btnClearFilters = $('btn-inf-clear-filters');
    if (btnClearFilters) {
      btnClearFilters.addEventListener('click', () => {
        if (histSearch) histSearch.value = '';
        if (histFilterStatus) histFilterStatus.value = 'all';
        if (histFilterMonth) histFilterMonth.value = '';
        renderInformeHistory();
      });
    }

    // Exportar e Importar Historial
    const btnExpHist = $('btn-inf-export-history');
    if (btnExpHist) btnExpHist.addEventListener('click', exportInformeHistory);

    const btnImpHist = $('btn-inf-import-history');
    const inputImpHist = $('inf-import-history-file');
    if (btnImpHist && inputImpHist) {
      btnImpHist.addEventListener('click', () => inputImpHist.click());
      inputImpHist.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importInformeHistory(e.target.files[0]);
          inputImpHist.value = '';
        }
      });
    }

    // 9. Plantillas de Informes
    const plantillasList = $('inf-plantillas-list');
    if (plantillasList) {
      plantillasList.addEventListener('click', (e) => {
        const useBtn = e.target.closest('.btn-tpl-use');
        if (useBtn) {
          applyPlantilla(useBtn.dataset.tplId);
          return;
        }

        const renBtn = e.target.closest('.btn-tpl-rename');
        if (renBtn) {
          renamePlantilla(renBtn.dataset.tplId);
          return;
        }

        const delBtn = e.target.closest('.btn-tpl-del');
        if (delBtn) {
          deletePlantilla(delBtn.dataset.tplId);
          return;
        }
      });
    }

    // 10. Mis Datos Informes
    const btnSaveInfDatos = $('btn-save-inf-datos');
    if (btnSaveInfDatos) {
      btnSaveInfDatos.addEventListener('click', saveInformeDatosFromUI);
    }

    const btnResetDatosObs = $('btn-inf-reset-datos-obs');
    if (btnResetDatosObs) {
      btnResetDatosObs.addEventListener('click', () => {
        if ($('inf-datos-obs')) {
          $('inf-datos-obs').value = DEFAULT_INFORME_CONFIG.defaultObs;
          showToast('Observaciones predeterminadas restablecidas', '🔄');
        }
      });
    }

    // Click en tarjetas recientes de la pantalla de entrada de informes
    const recentInfContainer = $('inf-entry-recent-list');
    if (recentInfContainer) {
      recentInfContainer.addEventListener('click', (e) => {
        const row = e.target.closest('.entry-inf-row');
        if (row && row.dataset.infId) {
          loadInformeFromHistory(row.dataset.infId);
        }
      });
    }
  }

  // --- Event Listeners Setup ---
  // Mapa de relación entre subvistas y secciones principales
  const SUBVIEW_SECTION_MAP = {
    'view-cotizador': 'cotizaciones',
    'view-historial': 'cotizaciones',
    'view-catalogo': 'cotizaciones',
    'view-config': 'cotizaciones',
    'view-cuentas-cobro': 'cuentas-cobro',
    'view-cobro-historial': 'cuentas-cobro',
    'view-cobro-emisor': 'cuentas-cobro',
    'view-informe-tecnico': 'informes',
    'view-informe-historial': 'informes',
    'view-informe-plantillas': 'informes',
    'view-informe-datos': 'informes'
  };

  const SUBVIEW_NAMES_MAP = {
    'view-cotizador': 'Nueva Cotización',
    'view-historial': 'Historial de Cotizaciones',
    'view-catalogo': 'Catálogo de Precios',
    'view-config': 'Mi Negocio',
    'view-cuentas-cobro': 'Nueva Cuenta',
    'view-cobro-historial': 'Historial de Cuentas',
    'view-cobro-emisor': 'Mis Datos de Emisor',
    'view-informe-tecnico': 'Nuevo informe',
    'view-informe-historial': 'Historial de informes',
    'view-informe-plantillas': 'Plantillas',
    'view-informe-datos': 'Mis datos'
  };

  // Volver al Menú Principal (Ahora 3 Opciones)
  function goToMainMenu() {
    const navWrap = $('section-nav-wrapper');
    if (navWrap) navWrap.style.display = 'none';

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    if ($('view-main-menu')) $('view-main-menu').classList.add('active');

    state.activeMainSection = 'main-menu';
    setStorage('pr_active_tab', 'view-main-menu');

    updateMobileStickyBar();
    updateBadges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Entrar a una sección principal ('cotizaciones', 'cuentas-cobro' o 'informes')
  function enterSection(section, targetSubview = null) {
    const isCobro = section === 'cuentas-cobro';
    const isInforme = section === 'informes';
    let mainSection = 'cotizaciones';
    if (isCobro) mainSection = 'cuentas-cobro';
    if (isInforme) mainSection = 'informes';

    state.activeMainSection = mainSection;
    setStorage('pr_active_main_section', mainSection);

    // Mostrar barra de navegación de sección y ocultar menú principal
    const navWrap = $('section-nav-wrapper');
    if (navWrap) navWrap.style.display = 'block';

    // Actualizar indicador de sección activa
    const badge = $('section-active-badge');
    if (badge) {
      if (isInforme) {
        badge.textContent = '🛠️ Informes técnicos';
      } else if (isCobro) {
        badge.textContent = '💼 Cuentas de cobro';
      } else {
        badge.textContent = '📋 Cotizaciones';
      }
    }

    // Alternar submenú visible
    const subCot = $('submenu-cotizaciones');
    const subCobro = $('submenu-cuentas-cobro');
    const subInf = $('submenu-informes');
    if (subCot) subCot.style.display = (mainSection === 'cotizaciones') ? 'flex' : 'none';
    if (subCobro) subCobro.style.display = (mainSection === 'cuentas-cobro') ? 'flex' : 'none';
    if (subInf) subInf.style.display = (mainSection === 'informes') ? 'flex' : 'none';

    // Determinar subvista a mostrar
    let subviewToOpen = targetSubview;
    if (!subviewToOpen) {
      if (isInforme) {
        subviewToOpen = state.activeSubviewInf || 'view-informe-tecnico';
      } else if (isCobro) {
        subviewToOpen = state.activeSubviewCobro || 'view-cuentas-cobro';
      } else {
        subviewToOpen = state.activeSubviewCot || 'view-cotizador';
      }
    }

    if (SUBVIEW_SECTION_MAP[subviewToOpen] !== mainSection) {
      if (isInforme) subviewToOpen = 'view-informe-tecnico';
      else if (isCobro) subviewToOpen = 'view-cuentas-cobro';
      else subviewToOpen = 'view-cotizador';
    }

    switchSubview(subviewToOpen, mainSection);
  }

  // Cambiar entre opciones del submenú propio
  function switchSubview(viewId, forcedSection = null) {
    if (viewId === 'view-main-menu') {
      goToMainMenu();
      return;
    }

    if (!$(viewId)) return;
    const targetSection = forcedSection || SUBVIEW_SECTION_MAP[viewId] || 'cotizaciones';
    const isCobro = targetSection === 'cuentas-cobro';
    const isInforme = targetSection === 'informes';

    state.activeMainSection = targetSection;
    setStorage('pr_active_main_section', targetSection);

    // Asegurar que la barra de sección esté visible
    const navWrap = $('section-nav-wrapper');
    if (navWrap) navWrap.style.display = 'block';

    const badge = $('section-active-badge');
    if (badge) {
      if (isInforme) {
        badge.textContent = '🛠️ Informes técnicos';
      } else if (isCobro) {
        badge.textContent = '💼 Cuentas de cobro';
      } else {
        badge.textContent = '📋 Cotizaciones';
      }
    }

    const subCot = $('submenu-cotizaciones');
    const subCobro = $('submenu-cuentas-cobro');
    const subInf = $('submenu-informes');
    if (subCot) subCot.style.display = (targetSection === 'cotizaciones') ? 'flex' : 'none';
    if (subCobro) subCobro.style.display = (targetSection === 'cuentas-cobro') ? 'flex' : 'none';
    if (subInf) subInf.style.display = (targetSection === 'informes') ? 'flex' : 'none';

    // Actualizar botones de submenú activos
    document.querySelectorAll('.subnav-btn, .tab-btn').forEach(btn => {
      const match = (btn.dataset.subview === viewId || btn.dataset.view === viewId);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Ocultar todas las demás vistas y mostrar únicamente la seleccionada
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    $(viewId).classList.add('active');

    // Guardar última subvista en localStorage con try/catch
    if (targetSection === 'informes') {
      state.activeSubviewInf = viewId;
      setStorage('pr_active_subview_inf', viewId);
    } else if (targetSection === 'cuentas-cobro') {
      state.activeSubviewCobro = viewId;
      setStorage('pr_active_subview_cobro', viewId);
    } else {
      state.activeSubviewCot = viewId;
      setStorage('pr_active_subview_cot', viewId);
    }
    setStorage('pr_active_tab', viewId);

    // Actualizar contenidos si es necesario
    if (viewId === 'view-cobro-historial') {
      renderCobroHistory();
    } else if (viewId === 'view-cobro-emisor') {
      syncEmisorTabUI();
    } else if (viewId === 'view-historial') {
      renderHistory();
    } else if (viewId === 'view-catalogo') {
      renderCatalogManager();
    } else if (viewId === 'view-informe-historial') {
      renderInformeHistory();
    } else if (viewId === 'view-informe-plantillas') {
      renderInformePlantillasList();
    } else if (viewId === 'view-informe-datos') {
      syncInformeDatosUI();
    } else if (viewId === 'view-informe-tecnico') {
      renderInformePreview();
      updateSectionEntrySummaries();
    }

    // Barra fija inferior en móviles
    updateMobileStickyBar();
    updateBadges();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Event Listeners Setup ---
  function setupEvents() {
    // 1. Menú Principal: Botones de selección de módulo
    const btnMainCot = $('btn-main-cotizaciones');
    if (btnMainCot) {
      btnMainCot.addEventListener('click', () => enterSection('cotizaciones'));
    }

    const btnMainCobro = $('btn-main-cobro');
    if (btnMainCobro) {
      btnMainCobro.addEventListener('click', () => enterSection('cuentas-cobro'));
    }

    const btnMainInf = $('btn-main-informes');
    if (btnMainInf) {
      btnMainInf.addEventListener('click', () => enterSection('informes'));
    }

    // Botón para volver al Menú Principal
    const btnBackMain = $('btn-back-to-main-menu');
    if (btnBackMain) {
      btnBackMain.addEventListener('click', goToMainMenu);
    }

    // 2. Submenús (Cada opción abre su propia vista)
    document.querySelectorAll('.subnav-btn, .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.subview || btn.dataset.view;
        if (targetView) switchSubview(targetView);
      });
    });

    // Botones de las tarjetas resumen de entrada para ir al historial completo
    const btnCobroEntryHist = $('btn-cobro-entry-view-history');
    if (btnCobroEntryHist) {
      btnCobroEntryHist.addEventListener('click', () => switchSubview('view-cobro-historial'));
    }

    const btnCotEntryHist = $('btn-cot-entry-view-history');
    if (btnCotEntryHist) {
      btnCotEntryHist.addEventListener('click', () => switchSubview('view-historial'));
    }

    const btnInfEntryHist = $('btn-inf-entry-view-history');
    if (btnInfEntryHist) {
      btnInfEntryHist.addEventListener('click', () => switchSubview('view-informe-historial'));
    }

    const btnHistNewInf = $('btn-hist-create-new-inf');
    if (btnHistNewInf) {
      btnHistNewInf.addEventListener('click', () => {
        resetInformeForm();
        switchSubview('view-informe-tecnico');
      });
    }

    const btnPlantillasNewInf = $('btn-plantillas-new-inf');
    if (btnPlantillasNewInf) {
      btnPlantillasNewInf.addEventListener('click', () => {
        resetInformeForm();
        switchSubview('view-informe-tecnico');
      });
    }

    const btnBackToInf = $('btn-back-to-inf-form');
    if (btnBackToInf) {
      btnBackToInf.addEventListener('click', () => switchSubview('view-informe-tecnico'));
    }

    // Delegación de clics en la lista de cuentas pendientes del resumen de entrada
    const cobroEntryList = $('cobro-entry-pending-list');
    if (cobroEntryList) {
      cobroEntryList.addEventListener('click', (e) => {
        const row = e.target.closest('[data-cobro-num]');
        if (row && row.dataset.cobroNum) {
          openCobroForEditing(row.dataset.cobroNum);
        }
      });
    }

    // Delegación de clics en la lista de cotizaciones recientes del resumen de entrada
    const cotEntryList = $('cot-entry-recent-list');
    if (cotEntryList) {
      cotEntryList.addEventListener('click', (e) => {
        const row = e.target.closest('[data-quote-index]');
        if (row && row.dataset.quoteIndex !== undefined) {
          loadQuoteFromHistory(parseInt(row.dataset.quoteIndex, 10));
        }
      });
    }

    // 3. Eventos del Historial de Cuentas de Cobro
    const btnHistNewCobro = $('btn-hist-create-new-cobro');
    if (btnHistNewCobro) {
      btnHistNewCobro.addEventListener('click', () => switchSubview('view-cuentas-cobro'));
    }

    // Filtros de búsqueda, estado y mes
    if ($('cc-hist-search')) {
      $('cc-hist-search').addEventListener('input', renderCobroHistory);
    }
    if ($('cc-hist-filter-status')) {
      $('cc-hist-filter-status').addEventListener('change', renderCobroHistory);
    }
    if ($('cc-hist-filter-month')) {
      $('cc-hist-filter-month').addEventListener('change', renderCobroHistory);
    }
    if ($('btn-cc-clear-filters')) {
      $('btn-cc-clear-filters').addEventListener('click', () => {
        if ($('cc-hist-search')) $('cc-hist-search').value = '';
        if ($('cc-hist-filter-status')) $('cc-hist-filter-status').value = 'all';
        if ($('cc-hist-filter-month')) $('cc-hist-filter-month').value = '';
        renderCobroHistory();
      });
    }

    // Delegación de acciones de tarjetas de Cuentas de Cobro
    const cobroHistList = $('cc-history-list');
    if (cobroHistList) {
      cobroHistList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const num = btn.dataset.num;

        if (action === 'toggle-status') {
          toggleCobroStatus(num);
        } else if (action === 'edit-cobro') {
          openCobroForEditing(num);
        } else if (action === 'duplicate-cobro') {
          duplicateCobroFromHistory(num);
        } else if (action === 'pdf-cobro') {
          previewCobroFromHistory(num);
        } else if (action === 'whatsapp-cobro') {
          shareCobroFromHistory(num);
        } else if (action === 'delete-cobro') {
          deleteCobroFromHistory(num);
        }
      });
    }

    // Exportar e Importar historial de cuentas de cobro
    if ($('btn-cc-export-history')) {
      $('btn-cc-export-history').addEventListener('click', exportCobroHistory);
    }

    const btnImportHist = $('btn-cc-import-history');
    const fileImportHist = $('cc-import-history-file');
    if (btnImportHist && fileImportHist) {
      btnImportHist.addEventListener('click', () => fileImportHist.click());
      fileImportHist.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          importCobroHistory(file);
          fileImportHist.value = '';
        }
      });
    }

    // 4. Pestaña Mis Datos de Emisor (Eventos)
    const emisorTabFields = [
      { id: 'cc-emisor-name-tab', key: 'name', syncId: 'cc-emisor-name' },
      { id: 'cc-emisor-cc-tab', key: 'cc', syncId: 'cc-emisor-cc' },
      { id: 'cc-emisor-city-tab', key: 'city', syncId: 'cc-emisor-city' },
      { id: 'cc-emisor-phone-tab', key: 'phone', syncId: 'cc-emisor-phone' },
      { id: 'cc-emisor-address-tab', key: 'address', syncId: 'cc-emisor-address' }
    ];

    emisorTabFields.forEach(f => {
      const el = $(f.id);
      if (el) {
        el.addEventListener('input', () => {
          state.cobroEmisor[f.key] = el.value;
          setStorage('pr_cobro_emisor', state.cobroEmisor);
          if ($(f.syncId)) $(f.syncId).value = el.value;
          renderCobroPreview();
        });
      }
    });

    const legalTextTab = $('cc-legal-text-tab');
    if (legalTextTab) {
      legalTextTab.addEventListener('input', () => {
        state.cobroLegalText = legalTextTab.value;
        setStorage('pr_cobro_legal_text', state.cobroLegalText);
        if ($('cc-legal-text')) $('cc-legal-text').value = legalTextTab.value;
        renderCobroPreview();
      });
    }

    const btnResetLegalTab = $('btn-cc-reset-legal-tab');
    if (btnResetLegalTab) {
      btnResetLegalTab.addEventListener('click', () => {
        state.cobroLegalText = DEFAULT_LEGAL_TEXT;
        $('cc-legal-text-tab').value = DEFAULT_LEGAL_TEXT;
        if ($('cc-legal-text')) $('cc-legal-text').value = DEFAULT_LEGAL_TEXT;
        setStorage('pr_cobro_legal_text', DEFAULT_LEGAL_TEXT);
        renderCobroPreview();
        showToast('Texto legal restablecido por defecto', '🔄');
      });
    }

    // Garantías por defecto en pestaña Mis Datos (se guarda inmediatamente con try/catch al editarse)
    const defaultNotesTab = $('cc-default-notes-tab');
    if (defaultNotesTab) {
      defaultNotesTab.addEventListener('input', () => {
        state.cobroDefaultNotes = defaultNotesTab.value;
        setStorage('pr_cobro_default_notes', state.cobroDefaultNotes);
        if ($('cc-default-notes')) $('cc-default-notes').value = defaultNotesTab.value;
      });
    }

    const btnResetNotesTab = $('btn-cc-reset-notes-tab');
    if (btnResetNotesTab) {
      btnResetNotesTab.addEventListener('click', () => {
        state.cobroDefaultNotes = DEFAULT_COBRO_NOTES;
        if ($('cc-default-notes-tab')) $('cc-default-notes-tab').value = DEFAULT_COBRO_NOTES;
        if ($('cc-default-notes')) $('cc-default-notes').value = DEFAULT_COBRO_NOTES;
        setStorage('pr_cobro_default_notes', DEFAULT_COBRO_NOTES);
        showToast('Garantías predeterminadas restablecidas', '🔄');
      });
    }

    const btnUploadFirmaTab = $('btn-cc-upload-firma-tab');
    const inputFirmaTab = $('cc-firma-input-tab');
    const btnRemoveFirmaTab = $('btn-cc-remove-firma-tab');

    if (btnUploadFirmaTab && inputFirmaTab) {
      btnUploadFirmaTab.addEventListener('click', () => inputFirmaTab.click());
      inputFirmaTab.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          showToast('Selecciona un archivo PNG o JPG válido', '⚠️');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          state.cobroFirma = evt.target.result;
          setStorage('pr_cobro_firma', state.cobroFirma);
          renderCobroFirmaUI();
          syncEmisorTabUI();
          renderCobroPreview();
          showToast('Firma digitalizada guardada', '✍️');
        };
        reader.readAsDataURL(file);
      });
    }

    if (btnRemoveFirmaTab && inputFirmaTab) {
      btnRemoveFirmaTab.addEventListener('click', () => {
        state.cobroFirma = '';
        inputFirmaTab.value = '';
        setStorage('pr_cobro_firma', '');
        renderCobroFirmaUI();
        syncEmisorTabUI();
        renderCobroPreview();
        showToast('Firma eliminada', 'ℹ️');
      });
    }

    const btnSaveEmisorTab = $('btn-save-emisor-tab');
    if (btnSaveEmisorTab) {
      btnSaveEmisorTab.addEventListener('click', () => {
        setStorage('pr_cobro_emisor', state.cobroEmisor);
        setStorage('pr_cobro_legal_text', state.cobroLegalText);
        setStorage('pr_cobro_default_notes', state.cobroDefaultNotes);
        setStorage('pr_config_updated_at', new Date().toISOString());
        showToast('Tus datos de emisor y garantías se guardaron correctamente', '💾');
        switchSubview('view-cuentas-cobro');
        triggerIncrementalSync();
      });
    }

    const btnBackToCobro = $('btn-back-to-cobro-form');
    if (btnBackToCobro) {
      btnBackToCobro.addEventListener('click', () => switchSubview('view-cuentas-cobro'));
    }

    // 5. Restaurar última sección y opción usada en localStorage
    const savedTab = getStorage('pr_active_tab', null);
    if (savedTab && SUBVIEW_SECTION_MAP[savedTab]) {
      const sec = SUBVIEW_SECTION_MAP[savedTab];
      enterSection(sec, savedTab);
    } else if (savedTab === 'view-main-menu') {
      goToMainMenu();
    } else {
      goToMainMenu();
    }

    // Theme toggle
    const themeToggle = $('theme-toggle');
    const currentTheme = localStorage.getItem('pr_theme') || 'dark';
    if (currentTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '🌙';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('pr_theme', 'dark');
        themeToggle.textContent = '☀️';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('pr_theme', 'light');
        themeToggle.textContent = '🌙';
      }
    });

    // Toggle para desplegar / recoger vista previa de la cotización
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-toggle-preview');
      if (btn) {
        e.preventDefault();
        togglePreviewCollapse();
      }
    });

    // Inicializar estado guardado de la vista previa (por defecto desplegada)
    updatePreviewCollapseUI(getPreviewCollapsed());

    // Add item from catalog
    $('btn-add-catalog').addEventListener('click', () => {
      const selVal = $('catalog-select').value;
      if (selVal === '') {
        showToast('Selecciona primero un ítem del menú desplegable.', 'ℹ️');
        return;
      }
      const item = state.catalog[parseInt(selVal)];
      if (!item) return;

      state.currentQuote.items.push({
        d: item.n,
        q: 1,
        p: item.p
      });
      renderQuoteItems();
      renderLivePreview();
      showToast(`Añadido: ${item.n}`, '➕');
    });

    // Add free line item
    $('btn-add-line').addEventListener('click', () => {
      state.currentQuote.items.push({
        d: '',
        q: 1,
        p: 0
      });
      renderQuoteItems();
      renderLivePreview();
      // Focus on new input
      const inputs = document.querySelectorAll('#quote-lines input[data-field="d"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    // Items interaction (delegation)
    $('quote-lines').addEventListener('input', (e) => {
      const target = e.target;
      const row = target.closest('.line-item');
      if (!row) return;
      const idx = parseInt(row.dataset.index);
      const field = target.dataset.field;
      const item = state.currentQuote.items[idx];
      if (!item) return;

      if (field === 'd') {
        item.d = target.value;
      } else if (field === 'q') {
        item.q = Math.max(1, parseInt(target.value) || 1);
      } else if (field === 'p') {
        item.p = Math.max(0, parseFloat(target.value) || 0);
      }

      // Update subtotal in line
      const subtotalEl = row.querySelector('.line-subtotal');
      if (subtotalEl) subtotalEl.textContent = formatMoney(item.q * item.p);

      renderLivePreview();
    });

    $('quote-lines').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="remove-line"]');
      if (!btn) return;
      const row = btn.closest('.line-item');
      const idx = parseInt(row.dataset.index);
      state.currentQuote.items.splice(idx, 1);
      renderQuoteItems();
      renderLivePreview();
    });

    // Auto-formatting and prefix auto-detect on phone inputs
    const handlePhoneInput = (inputEl, prefixEl) => {
      let val = inputEl.value;
      if (val.includes('+')) {
        const cleanDigits = val.replace(/\D/g, '');
        const commonPrefixes = ['57', '1', '34', '58', '52', '54', '56', '51', '593', '507'];
        for (const p of commonPrefixes) {
          if (cleanDigits.startsWith(p) && cleanDigits.length > p.length + 6) {
            prefixEl.value = p;
            val = cleanDigits.substring(p.length);
            break;
          }
        }
      }
      inputEl.value = formatLocalPhone(val, prefixEl.value);
      updatePhoneFeedback();
      renderLivePreview();
    };

    $('q-client-phone').addEventListener('input', () => {
      handlePhoneInput($('q-client-phone'), $('q-client-prefix'));
    });
    $('q-client-prefix').addEventListener('change', () => {
      handlePhoneInput($('q-client-phone'), $('q-client-prefix'));
    });

    $('b-phone').addEventListener('input', () => {
      handlePhoneInput($('b-phone'), $('b-prefix'));
    });
    $('b-prefix').addEventListener('change', () => {
      handlePhoneInput($('b-phone'), $('b-prefix'));
    });

    // Form inputs that trigger preview recalculation
    ['q-client-name', 'q-equipment', 'q-discount', 'q-delivery', 'q-validity', 'q-tax', 'q-notes'].forEach(id => {
      $(id).addEventListener('input', renderLivePreview);
    });

    // Save business profile
    $('btn-save-biz').addEventListener('click', () => {
      const prefix = $('b-prefix') ? $('b-prefix').value : '57';
      state.business = {
        name: $('b-name').value.trim() || 'Pedro Roa',
        prefix: prefix,
        phone: ($('b-phone').value.trim() || '3024555428').replace(/\D/g, ''),
        address: $('b-address').value.trim(),
        terms: $('b-terms').value.trim()
      };
      setStorage('pr_business', state.business);
      setStorage('pr_config_updated_at', new Date().toISOString());
      showToast('Configuración del negocio guardada con éxito', '💾');
      renderLivePreview();
      triggerIncrementalSync();
    });

    // Reset business default
    $('btn-reset-biz').addEventListener('click', () => {
      if (confirm('¿Restablecer información de negocio por defecto de Pedro Roa?')) {
        state.business = {
          name: 'Pedro Roa - Servicios Técnicos',
          prefix: '57',
          phone: '3024555428',
          address: 'Servicio a Domicilio y Taller Especializado',
          terms: 'Garantía de 30 días sobre mano de obra y servicio técnico. Repuestos sujetos a garantía oficial del fabricante. Todo trabajo incluye diagnóstico y pruebas previas.'
        };
        $('b-name').value = state.business.name;
        if ($('b-prefix')) $('b-prefix').value = '57';
        $('b-phone').value = '302 455 5428';
        $('b-address').value = state.business.address;
        $('b-terms').value = state.business.terms;
        setStorage('pr_business', state.business);
        setStorage('pr_config_updated_at', new Date().toISOString());
        renderLivePreview();
        showToast('Restablecido a Pedro Roa', '🔄');
        triggerIncrementalSync();
      }
    });

    // Catalog interactions
    $('catalog-search').addEventListener('input', renderCatalogManager);

    $('btn-cat-add-new').addEventListener('click', () => {
      state.catalog.unshift({
        id: generateUUID(),
        c: 'Servicios',
        n: '',
        p: 0,
        updatedAt: new Date().toISOString()
      });
      saveCatalogToStorage(state.catalog);
      renderCatalogManager();
      renderCatalogSelect();
      const firstInput = document.querySelector('#catalog-manage-list input[data-field="n"]');
      if (firstInput) firstInput.focus();
      triggerIncrementalSync();
    });

    $('btn-cat-restore').addEventListener('click', () => {
      if (confirm('¿Restaurar catálogo inicial de servicios y productos de Pedro Roa? Se borrarán las personalizaciones.')) {
        state.catalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
        state.catalog.forEach(ensureItemUuid);
        saveCatalogToStorage(state.catalog);
        renderCatalogManager();
        renderCatalogSelect();
        showToast('Catálogo inicial restaurado', '🔄');
        triggerIncrementalSync();
      }
    });

    // Guardar cambios al editar cualquier campo (nombre, categoría o precio)
    const handleCatalogFieldChange = (e) => {
      const target = e.target;
      const row = target.closest('.catalog-item-row');
      if (!row) return;
      const idx = parseInt(row.dataset.index);
      const field = target.dataset.field;
      const item = state.catalog[idx];
      if (!item) return;

      ensureItemUuid(item);
      if (field === 'c') item.c = target.value;
      if (field === 'n') item.n = target.value;
      if (field === 'p') item.p = Math.max(0, parseFloat(target.value) || 0);
      item.updatedAt = new Date().toISOString();

      saveCatalogToStorage(state.catalog);
      renderCatalogSelect();
      triggerIncrementalSync();
    };

    $('catalog-manage-list').addEventListener('input', handleCatalogFieldChange);
    $('catalog-manage-list').addEventListener('change', handleCatalogFieldChange);

    // Guardar catálogo al borrar un producto
    $('catalog-manage-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete-cat-item"]');
      if (!btn) return;
      const row = btn.closest('.catalog-item-row');
      const idx = parseInt(row.dataset.index);
      const item = state.catalog[idx];
      if (item && item.id) {
        recordTombstone(item.id, 'catalogo');
      }
      state.catalog.splice(idx, 1);
      saveCatalogToStorage(state.catalog);
      renderCatalogManager();
      renderCatalogSelect();
      showToast('Ítem eliminado del catálogo', '🗑️');
      triggerIncrementalSync();
    });

    // History interaction (Abrir, Duplicar, Ver PDF, WhatsApp, Eliminar)
    $('history-list').addEventListener('click', (e) => {
      const loadBtn = e.target.closest('[data-action="load-history"]');
      if (loadBtn) {
        const idx = parseInt(loadBtn.dataset.index, 10);
        loadQuoteFromHistory(idx);
        return;
      }

      const dupBtn = e.target.closest('[data-action="duplicate-history"]');
      if (dupBtn) {
        const idx = parseInt(dupBtn.dataset.index, 10);
        duplicateQuoteFromHistory(idx);
        return;
      }

      const pdfBtn = e.target.closest('[data-action="pdf-history"]');
      if (pdfBtn) {
        const idx = parseInt(pdfBtn.dataset.index, 10);
        const saved = state.history[idx];
        if (saved) window.PedroRoaPdf.previewPdf(saved);
        return;
      }

      const waBtn = e.target.closest('[data-action="whatsapp-history"]');
      if (waBtn) {
        const idx = parseInt(waBtn.dataset.index, 10);
        const saved = state.history[idx];
        if (saved) window.PedroRoaPdf.sharePdfViaWhatsApp(saved);
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-history"]');
      if (delBtn) {
        if (confirm('¿Eliminar esta cotización del historial?')) {
          const idx = parseInt(delBtn.dataset.index, 10);
          const item = state.history[idx];
          if (item && item.id) {
            recordTombstone(item.id, 'cotizacion');
          }
          state.history.splice(idx, 1);
          setStorage('pr_history', state.history);
          renderHistory();
          showToast('Cotización eliminada', '🗑️');
          triggerIncrementalSync();
        }
      }
    });

    // New Quote Button
    $('btn-new-quote').addEventListener('click', () => {
      if (state.currentQuote.items.length > 0) {
        if (!confirm('¿Crear una nueva cotización? Se incrementará el consecutivo y se limpiará el formulario actual.')) {
          return;
        }
      }
      state.quoteNumber = getCalculatedNextQuoteNum();
      setStorage('pr_quote_num', state.quoteNumber);
      triggerIncrementalSync();

      state.currentQuote.items = [];
      $('q-client-name').value = '';
      if ($('q-client-prefix')) $('q-client-prefix').value = '57';
      $('q-client-phone').value = '';
      $('q-equipment').value = '';
      $('q-discount').value = 0;
      $('q-delivery').value = 0;
      $('q-tax').value = 0;
      $('q-notes').value = state.business.terms;

      renderQuoteItems();
      renderLivePreview();
      showToast(`Nueva cotización ${getQuoteIdString()} lista`, '✨');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ==========================================
    // PDF GENERATION & WHATSAPP SHARING
    // ==========================================

    // 1. Send PDF to WhatsApp (Mobile Web Share or Desktop Dual Action)
    const handleSendPdfWhatsApp = async () => {
      if (!validateHasItems()) return;
      saveCurrentToHistory(true);
      const data = getFullQuoteData();

      showToast('Generando documento PDF...', '📄');

      const result = await window.PedroRoaPdf.sharePdfViaWhatsApp(data, (fileName) => {
        // Fallback callback for desktop
        showModal(
          '📄 PDF Descargado & WhatsApp Abierto',
          `<p>El archivo <strong>${escapeHtml(fileName)}</strong> se descargó a tu computador.</p>
           <p style="margin-top: 8px;">En la pestaña de WhatsApp que acabamos de abrir con tu cliente, simplemente <strong>arrastra el PDF</strong> o dale clic en el clip 📎 y selecciona el archivo descargado para enviarlo.</p>`,
          'Entendido'
        );
      });

      if (result.success && result.method === 'native-share') {
        showToast('Compartiendo PDF directamente en WhatsApp...', '🚀');
      }
    };

    $('btn-send-whatsapp-pdf').addEventListener('click', handleSendPdfWhatsApp);
    $('sticky-btn-pdf').addEventListener('click', () => {
      const activeSection = document.querySelector('.view-section.active');
      if (activeSection && activeSection.id === 'view-cuentas-cobro') {
        const data = getFullCobroData();
        saveCobroClient(data.clientName, data.clientNit);
        renderCobroPreview(data);
        window.PedroRoaPdf.previewCobroPdf(data);
      } else if (activeSection && activeSection.id === 'view-informe-tecnico') {
        const data = getInformeDataFromForm();
        saveCobroClient(data.clientName, data.clientNit);
        renderInformePreview(data);
        window.PedroRoaPdf.previewInformePdf(data);
      } else {
        handleSendPdfWhatsApp();
      }
    });

    // 2. Download PDF
    $('btn-download-pdf').addEventListener('click', () => {
      if (!validateHasItems()) return;
      saveCurrentToHistory(true);
      const data = getFullQuoteData();
      showToast('Descargando archivo PDF...', '📥');
      window.PedroRoaPdf.downloadPdf(data);
    });

    // 3. Preview PDF in Browser
    $('btn-preview-pdf').addEventListener('click', () => {
      if (!validateHasItems()) return;
      const data = getFullQuoteData();
      window.PedroRoaPdf.previewPdf(data);
    });

    // 4. Send plain text WhatsApp message
    $('btn-send-whatsapp-text').addEventListener('click', () => {
      if (!validateHasItems()) return;
      saveCurrentToHistory(true);
      const data = getFullQuoteData();
      const phone = data.clientPhoneFull;
      const text = generatePlainText(data);
      const url = phone
        ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });

    // 5. Copy text
    $('btn-copy-text').addEventListener('click', () => {
      if (!validateHasItems()) return;
      const data = getFullQuoteData();
      const text = generatePlainText(data);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Texto de cotización copiado al portapapeles', '📋');
        }).catch(() => {
          prompt('Copia el texto:', text);
        });
      } else {
        prompt('Copia el texto:', text);
      }
    });

    // 6. Print
    $('btn-print').addEventListener('click', () => {
      if (!validateHasItems()) return;
      saveCurrentToHistory(true);
      window.print();
    });

    // 7. Manual Save Quote Button
    $('btn-save-quote').addEventListener('click', () => {
      if (!validateHasItems()) return;
      saveCurrentToHistory(false);
    });

    // ==========================================
    // PWA INSTALLATION FLOW
    // ==========================================
    const installBanner = $('install-banner');
    const btnInstallHeader = $('btn-install-app');
    const btnInstallBanner = $('btn-install-banner');
    const btnDismissBanner = $('btn-dismiss-banner');

    // Android/Chrome beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstallPrompt = e;
      installBanner.classList.add('active');
      btnInstallHeader.style.display = 'inline-flex';
    });

    const triggerInstall = async () => {
      if (state.deferredInstallPrompt) {
        state.deferredInstallPrompt.prompt();
        const { outcome } = await state.deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('¡Gracias por instalar la app de Pedro Roa!', '🎉');
        }
        state.deferredInstallPrompt = null;
        installBanner.classList.remove('active');
        btnInstallHeader.style.display = 'none';
      } else {
        // Detect iOS
        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos) {
          showModal(
            '📲 Instalar en tu iPhone / iPad',
            `<ol style="padding-left: 20px; line-height: 1.6;">
              <li>Toca el botón <strong>Compartir</strong> <span style="font-size: 1.2rem;">⎙</span> en la barra inferior de Safari.</li>
              <li>Desplaza hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong> ➕.</li>
              <li>Toca <strong>"Añadir"</strong> arriba a la derecha. ¡Listo! Tendrás la aplicación instalada como app nativa.</li>
            </ol>`,
            '¡Entendido!'
          );
        } else {
          showModal(
            '📲 Instalar en tu Celular',
            `<p>Para tener esta aplicación como App nativa en tu celular:</p>
             <ol style="padding-left: 20px; margin-top: 8px; line-height: 1.6;">
              <li>Abre el menú de opciones de tu navegador (los 3 puntos ⋮ arriba o abajo).</li>
              <li>Toca en <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.</li>
             </ol>`,
            'Cerrar'
          );
        }
      }
    };

    btnInstallBanner.addEventListener('click', triggerInstall);
    btnInstallHeader.addEventListener('click', triggerInstall);

    btnDismissBanner.addEventListener('click', () => {
      installBanner.classList.remove('active');
    });

    window.addEventListener('appinstalled', () => {
      installBanner.classList.remove('active');
      btnInstallHeader.style.display = 'none';
      showToast('Aplicación instalada exitosamente', '🚀');
    });

    // Inicializar eventos de Cuentas de Cobro
    setupCobroEvents();

    // Inicializar eventos de Informes Técnicos
    setupInformeEvents();

    updateMobileStickyBar();

    // Inicializar eventos de Sincronización en la Nube
    setupSyncEvents();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registrado con éxito:', reg.scope))
          .catch(err => console.warn('Error registrando SW:', err));
      });
    }
  }

  // Init application safely (executes immediately if DOM is ready or on DOMContentLoaded)
  function boot() {
    initForm();
    setupEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
