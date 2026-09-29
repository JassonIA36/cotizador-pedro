/**
 * Cotizador Pedro Roa - Core Application Logic
 */

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
    cobroNum: getStorage('pr_cobro_num', 12),
    cobroDocCity: getStorage('pr_cobro_doc_city', 'Bogotá'),
    cobroDocDate: getStorage('pr_cobro_doc_date', new Date().toISOString().split('T')[0]),
    cobroIncludeLegal: getStorage('pr_cobro_include_legal', true),
    cobroIncludeLogo: getStorage('pr_cobro_include_logo', true),
    cobroClientName: getStorage('pr_cobro_client_name', ''),
    cobroClientNit: getStorage('pr_cobro_client_nit', ''),
    cobroClients: getStorage('pr_cobro_clients', [
      { name: 'Canon de Colombia S.A.S.', nit: '860.000.123-4' }
    ]),
    cobroConceptos: getStorage('pr_cobro_conceptos', [
      { desc: 'Suministro caja de mantenimiento para impresora Canon MC-G03 serial 54496', amount: 160000 }
    ]),
    cobroAdelantos: getStorage('pr_cobro_adelantos', []),
    cobroPreviewCollapsed: getStorage('pr_cobro_preview_collapsed', false),
    cobroHistory: getStorage('pr_cobro_history', []),
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

  function renderHistory() {
    const list = $('history-list');
    if (state.history.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📜</div>
          <h3 style="font-size: 1rem; color: var(--text-main); margin-bottom: 4px;">No hay cotizaciones guardadas</h3>
          <p style="font-size: 0.84rem;">Cuando envíes o guardes cotizaciones, aparecerán en este historial para consultarlas o duplicarlas.</p>
        </div>
      `;
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
              <button class="btn-primary" data-action="load-history" data-index="${originalIdx}" title="Cargar cotización">✏️ Abrir</button>
              <button class="btn-danger btn-icon" data-action="delete-history" data-index="${originalIdx}" title="Eliminar">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    updateBadges();
  }

  // Actualizar contadores en badges de navegación
  function updateBadges() {
    const qBadge = $('badge-quotes-count');
    if (qBadge) qBadge.textContent = state.history.length;
    const cBadge = $('badge-cobros-count');
    if (cBadge) cBadge.textContent = state.cobroHistory.length;
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
    
    // Check if exists
    const existingIdx = state.history.findIndex(h => h.quoteNumber === data.quoteNumber);
    if (existingIdx >= 0) {
      state.history[existingIdx] = data;
    } else {
      state.history.push(data);
    }
    setStorage('pr_history', state.history);
    renderHistory();
    if (!auto) showToast('Cotización guardada en el historial', '💾');
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
    const totals = calculateCobroTotals();
    const emisor = state.cobroEmisor || DEFAULT_COBRO_EMISOR;
    const numFormatted = String(state.cobroNum || 1).padStart(3, '0');
    const city = state.cobroDocCity || 'Bogotá';
    const dateFormatted = formatCobroDate(state.cobroDocDate);
    const clientName = state.cobroClientName.trim() || 'Nombre del Cliente o Empresa';
    const clientNit = state.cobroClientNit.trim();
    const validConceptos = (state.cobroConceptos || []).filter(c => (c.desc && c.desc.trim()) || (parseFloat(c.amount) > 0));
    const validAdelantos = (state.cobroAdelantos || []).filter(a => (a.desc && a.desc.trim()) || (parseFloat(a.amount) > 0));

    return {
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
      firma: state.cobroFirma || '',
      fullMessageText: generateCobroPlainText()
    };
  }

  // Clientes frecuentes sugeridos
  function saveCobroClient(name, nit) {
    name = (name || '').trim();
    nit = (nit || '').trim();
    if (!name) return;
    const idx = state.cobroClients.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      if (nit) state.cobroClients[idx].nit = nit;
    } else {
      state.cobroClients.unshift({ name, nit });
    }
    if (state.cobroClients.length > 40) state.cobroClients.pop();
    setStorage('pr_cobro_clients', state.cobroClients);
    renderCobroClientsDatalist();
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

  // Renderizar la vista previa del documento oficial de Cuenta de Cobro
  function renderCobroPreview() {
    const totals = calculateCobroTotals();
    const numFormatted = String(state.cobroNum || 1).padStart(3, '0');
    const city = state.cobroDocCity || 'Bogotá';
    const dateFormatted = formatCobroDate(state.cobroDocDate);
    const clientName = state.cobroClientName.trim() || 'Nombre del Cliente o Empresa';
    const clientNit = state.cobroClientNit.trim();
    const emisor = state.cobroEmisor || DEFAULT_COBRO_EMISOR;

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
      $('cc-doc-preview-logo-wrap').style.display = (state.cobroIncludeLogo !== false) ? 'block' : 'none';
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
      const validConceptos = state.cobroConceptos.filter(c => (c.desc && c.desc.trim()) || c.amount > 0);
      if (validConceptos.length > 0) {
        $('cc-doc-preview-conceptos-list').innerHTML = validConceptos.map(c => `
          <li>${escapeHtml(c.desc || 'Servicio')} por ${formatMoney(c.amount)}</li>
        `).join('');
      } else {
        $('cc-doc-preview-conceptos-list').innerHTML = `<li>Concepto pendiente por especificar por $0</li>`;
      }
    }

    // Resumen de adelantos si los hay
    const validAdelantos = state.cobroAdelantos.filter(a => (a.desc && a.desc.trim()) || a.amount > 0);
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

    // 9. Texto legal en letra pequeña (si está activado)
    if ($('cc-doc-preview-legal-box')) {
      if (state.cobroIncludeLegal) {
        $('cc-doc-preview-legal-box').style.display = 'block';
        const paragraphs = (state.cobroLegalText || DEFAULT_LEGAL_TEXT).split('\n').filter(p => p.trim());
        $('cc-doc-preview-legal-box').innerHTML = paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
      } else {
        $('cc-doc-preview-legal-box').style.display = 'none';
      }
    }

    // 10. "Cordialmente,", la firma, el nombre, C.C., teléfono y dirección
    if ($('cc-doc-preview-firma-wrap') && $('cc-doc-preview-firma-blank') && $('cc-doc-preview-firma-img')) {
      if (state.cobroFirma) {
        $('cc-doc-preview-firma-img').src = state.cobroFirma;
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
  function generateCobroPlainText() {
    const totals = calculateCobroTotals();
    const numStr = String(state.cobroNum || 1).padStart(3, '0');
    const dateFormatted = formatCobroDate(state.cobroDocDate);
    const clientName = state.cobroClientName.trim() || 'Cliente';
    const clientNit = state.cobroClientNit.trim() ? ` (NIT/C.C.: ${state.cobroClientNit.trim()})` : '';

    let text = `*CUENTA DE COBRO N° ${numStr}*\n`;
    text += `*${(state.cobroEmisor.name || 'Pedro Luis Roa Mora').toUpperCase()}*\n`;
    text += `C.C. ${state.cobroEmisor.cc || '1.015.409.172'} de ${state.cobroEmisor.city || 'Bogotá'}\n\n`;
    text += `📅 *Fecha:* ${state.cobroDocCity || 'Bogotá'}, ${dateFormatted}\n`;
    text += `🏢 *Cliente:* ${clientName}${clientNit}\n\n`;

    text += `*Por concepto de:*\n`;
    state.cobroConceptos.forEach(c => {
      if (c.desc || c.amount) {
        text += `• ${c.desc || 'Servicio'}: ${formatMoney(c.amount)}\n`;
      }
    });

    if (state.cobroAdelantos.length > 0) {
      text += `\n*Total conceptos:* ${formatMoney(totals.totalConceptos)}\n`;
      state.cobroAdelantos.forEach(a => {
        if (a.desc || a.amount) {
          text += `• Anticipo (${a.desc || 'Abono'}): -${formatMoney(a.amount)}\n`;
        }
      });
      text += `*Total adelantos:* -${formatMoney(totals.totalAdelantos)}\n`;
    }

    text += `\n💰 *SALDO A COBRAR: ${formatMoney(totals.saldo)}*\n`;
    text += `_${numeroALetras(totals.saldo)}_\n\n`;
    text += `Cordialmente,\n`;
    text += `${state.cobroEmisor.name || 'Pedro Luis Roa Mora'}\n`;
    text += `Tel: ${state.cobroEmisor.phone || '3024555428'}\n`;
    text += `Dirección: ${state.cobroEmisor.address || 'Carrera 70g 78a-80'}`;
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
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        saveCurrentCobroToHistory(false);
        const data = getFullCobroData();
        window.PedroRoaPdf.previewCobroPdf(data);
      });
    }

    // Botón Descargar PDF de Cuenta de Cobro
    const btnCobroDownload = $('btn-cc-download-pdf');
    if (btnCobroDownload) {
      btnCobroDownload.addEventListener('click', () => {
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        saveCurrentCobroToHistory(false);
        const data = getFullCobroData();
        showToast('Descargando archivo PDF...', '📥');
        window.PedroRoaPdf.downloadCobroPdf(data);
      });
    }

    // Botón Enviar PDF por WhatsApp de Cuenta de Cobro
    const btnCobroWhatsAppPdf = $('btn-cc-whatsapp-pdf');
    if (btnCobroWhatsAppPdf) {
      btnCobroWhatsAppPdf.addEventListener('click', async () => {
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        saveCurrentCobroToHistory(false);
        const data = getFullCobroData();
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
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        saveCurrentCobroToHistory(false);
        window.print();
      });
    }

    // Botón WhatsApp Solo Texto
    const btnWhatsApp = $('btn-cc-whatsapp');
    if (btnWhatsApp) {
      btnWhatsApp.addEventListener('click', () => {
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        const text = generateCobroPlainText();
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
    }

    // Botón Copiar Texto
    const btnCopy = $('btn-cc-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        const text = generateCobroPlainText();
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

    // Actualizar contadores y vistas de historial
    updateBadges();
    renderCobroHistory();
    syncEmisorTabUI();
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
    data.id = 'CC-' + data.cobroNumber;
    data.updatedAt = new Date().toISOString();

    const existingIdx = state.cobroHistory.findIndex(h => parseInt(h.cobroNum, 10) === rawNum);
    if (existingIdx >= 0) {
      data.status = state.cobroHistory[existingIdx].status || 'pendiente';
      state.cobroHistory[existingIdx] = data;
    } else {
      data.status = 'pendiente';
      state.cobroHistory.push(data);
    }

    setStorage('pr_cobro_history', state.cobroHistory);
    updateBadges();
    renderCobroHistory();
    if (showToastMsg) {
      showToast(`Cuenta de cobro N° ${data.cobroNumber} guardada en el historial`, '💾');
    }
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
    state.cobroConceptos = JSON.parse(JSON.stringify(item.conceptos && item.conceptos.length ? item.conceptos : [{ desc: '', amount: 0 }]));
    state.cobroAdelantos = JSON.parse(JSON.stringify(item.adelantos || []));

    setStorage('pr_cobro_num', state.cobroNum);
    setStorage('pr_cobro_doc_city', state.cobroDocCity);
    setStorage('pr_cobro_doc_date', state.cobroDocDate);
    setStorage('pr_cobro_client_name', state.cobroClientName);
    setStorage('pr_cobro_client_nit', state.cobroClientNit);
    setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
    setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
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
    const maxInHistory = state.cobroHistory.reduce((max, h) => Math.max(max, parseInt(h.cobroNum, 10) || 0), 0);
    const nextNum = Math.max(maxInHistory, parseInt(state.cobroNum, 10) || 0) + 1;

    state.cobroNum = nextNum;
    state.cobroDocCity = item.city || 'Bogotá';
    state.cobroDocDate = new Date().toISOString().split('T')[0];
    state.cobroClientName = item.clientName || '';
    state.cobroClientNit = item.clientNit || '';
    state.cobroIncludeLegal = item.includeLegal !== false;
    state.cobroIncludeLogo = item.includeLogo !== false;
    state.cobroConceptos = JSON.parse(JSON.stringify(item.conceptos && item.conceptos.length ? item.conceptos : [{ desc: '', amount: 0 }]));
    state.cobroAdelantos = JSON.parse(JSON.stringify(item.adelantos || []));

    setStorage('pr_cobro_num', state.cobroNum);
    setStorage('pr_cobro_doc_city', state.cobroDocCity);
    setStorage('pr_cobro_doc_date', state.cobroDocDate);
    setStorage('pr_cobro_client_name', state.cobroClientName);
    setStorage('pr_cobro_client_nit', state.cobroClientNit);
    setStorage('pr_cobro_include_legal', state.cobroIncludeLegal);
    setStorage('pr_cobro_include_logo', state.cobroIncludeLogo);
    setStorage('pr_cobro_conceptos', state.cobroConceptos);
    setStorage('pr_cobro_adelantos', state.cobroAdelantos);

    if ($('cc-num')) $('cc-num').value = state.cobroNum;
    if ($('cc-doc-city')) $('cc-doc-city').value = state.cobroDocCity;
    if ($('cc-doc-date')) $('cc-doc-date').value = state.cobroDocDate;
    if ($('cc-client-name')) $('cc-client-name').value = state.cobroClientName;
    if ($('cc-client-nit')) $('cc-client-nit').value = state.cobroClientNit;
    if ($('cc-include-legal')) $('cc-include-legal').checked = state.cobroIncludeLegal;
    if ($('cc-include-logo')) $('cc-include-logo').checked = state.cobroIncludeLogo;

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
  }

  // Eliminar cuenta del historial
  function deleteCobroFromHistory(cobroNum) {
    const idx = state.cobroHistory.findIndex(h => parseInt(h.cobroNum, 10) === parseInt(cobroNum, 10));
    if (idx < 0) return;
    const item = state.cobroHistory[idx];
    const numDisplay = item.cobroNumber || item.cobroNum;

    if (confirm(`¿Eliminar definitivamente la cuenta de cobro N° ${numDisplay} del historial?\n\nEsta acción no se puede deshacer.`)) {
      state.cobroHistory.splice(idx, 1);
      setStorage('pr_cobro_history', state.cobroHistory);
      updateBadges();
      renderCobroHistory();
      showToast(`Cuenta de cobro N° ${numDisplay} eliminada`, '🗑️');
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

  // --- Event Listeners Setup ---
  // Mapa de relación entre subvistas y secciones principales
  const SUBVIEW_SECTION_MAP = {
    'view-cotizador': 'cotizaciones',
    'view-historial': 'cotizaciones',
    'view-catalogo': 'cotizaciones',
    'view-config': 'cotizaciones',
    'view-cuentas-cobro': 'cuentas-cobro',
    'view-cobro-historial': 'cuentas-cobro',
    'view-cobro-emisor': 'cuentas-cobro'
  };

  const SUBVIEW_NAMES_MAP = {
    'view-cotizador': 'Nueva Cotización',
    'view-historial': 'Historial de Cotizaciones',
    'view-catalogo': 'Catálogo de Precios',
    'view-config': 'Mi Negocio',
    'view-cuentas-cobro': 'Nueva Cuenta',
    'view-cobro-historial': 'Historial de Cuentas',
    'view-cobro-emisor': 'Mis Datos de Emisor'
  };

  // Cambiar entre las dos secciones principales ("Cotizaciones" y "Cuentas de cobro")
  function switchMainSection(section, targetSubview = null) {
    const isCobro = section === 'cuentas-cobro';
    const mainSection = isCobro ? 'cuentas-cobro' : 'cotizaciones';
    state.activeMainSection = mainSection;
    setStorage('pr_active_main_section', mainSection);

    // Actualizar botones principales
    const btnCot = $('btn-main-cotizaciones');
    const btnCobro = $('btn-main-cobro');
    if (btnCot) {
      btnCot.classList.toggle('active', !isCobro);
      btnCot.setAttribute('aria-selected', !isCobro ? 'true' : 'false');
    }
    if (btnCobro) {
      btnCobro.classList.toggle('active', isCobro);
      btnCobro.setAttribute('aria-selected', isCobro ? 'true' : 'false');
    }

    // Alternar visibilidad de los submenús
    const subCot = $('submenu-cotizaciones');
    const subCobro = $('submenu-cuentas-cobro');
    if (subCot) subCot.style.display = isCobro ? 'none' : 'flex';
    if (subCobro) subCobro.style.display = isCobro ? 'flex' : 'none';

    // Actualizar breadcrumbs e indicador de sección
    const crumbSection = $('nav-crumb-section');
    if (crumbSection) {
      crumbSection.textContent = isCobro ? '💼 Cuentas de cobro' : '📋 Cotizaciones';
    }

    const switchBtnText = $('btn-switch-section-text');
    const switchBtnIcon = $('btn-switch-section-icon');
    if (switchBtnText) {
      switchBtnText.textContent = isCobro ? 'Ir a Cotizaciones' : 'Ir a Cuentas de cobro';
    }
    if (switchBtnIcon) {
      switchBtnIcon.textContent = isCobro ? '📋' : '💼';
    }

    // Determinar la subvista correspondiente
    let subviewToOpen = targetSubview;
    if (!subviewToOpen) {
      subviewToOpen = isCobro
        ? (state.activeSubviewCobro || 'view-cuentas-cobro')
        : (state.activeSubviewCot || 'view-cotizador');
    }

    // Validar que pertenezca a la sección
    if (SUBVIEW_SECTION_MAP[subviewToOpen] !== mainSection) {
      subviewToOpen = isCobro ? 'view-cuentas-cobro' : 'view-cotizador';
    }

    switchSubview(subviewToOpen, mainSection);
  }

  // Cambiar entre opciones del submenú propio
  function switchSubview(viewId, forcedSection = null) {
    if (!$(viewId)) return;
    const targetSection = forcedSection || SUBVIEW_SECTION_MAP[viewId] || 'cotizaciones';

    // Si la sección principal no coincide, sincronizarla
    if (state.activeMainSection !== targetSection) {
      state.activeMainSection = targetSection;
      setStorage('pr_active_main_section', targetSection);

      const isCobro = targetSection === 'cuentas-cobro';
      const btnCot = $('btn-main-cotizaciones');
      const btnCobro = $('btn-main-cobro');
      if (btnCot) {
        btnCot.classList.toggle('active', !isCobro);
        btnCot.setAttribute('aria-selected', !isCobro ? 'true' : 'false');
      }
      if (btnCobro) {
        btnCobro.classList.toggle('active', isCobro);
        btnCobro.setAttribute('aria-selected', isCobro ? 'true' : 'false');
      }
      const subCot = $('submenu-cotizaciones');
      const subCobro = $('submenu-cuentas-cobro');
      if (subCot) subCot.style.display = isCobro ? 'none' : 'flex';
      if (subCobro) subCobro.style.display = isCobro ? 'flex' : 'none';

      const crumbSection = $('nav-crumb-section');
      if (crumbSection) {
        crumbSection.textContent = isCobro ? '💼 Cuentas de cobro' : '📋 Cotizaciones';
      }
      const switchBtnText = $('btn-switch-section-text');
      const switchBtnIcon = $('btn-switch-section-icon');
      if (switchBtnText) switchBtnText.textContent = isCobro ? 'Ir a Cotizaciones' : 'Ir a Cuentas de cobro';
      if (switchBtnIcon) switchBtnIcon.textContent = isCobro ? '📋' : '💼';
    }

    // Actualizar botones de submenú activos
    document.querySelectorAll('.subnav-btn, .tab-btn').forEach(btn => {
      const match = (btn.dataset.subview === viewId || btn.dataset.view === viewId);
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Ocultar todas las demás vistas y mostrar únicamente la seleccionada
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    $(viewId).classList.add('active');

    // Actualizar breadcrumb de subvista
    const crumbSubview = $('nav-crumb-subview');
    if (crumbSubview) {
      crumbSubview.textContent = SUBVIEW_NAMES_MAP[viewId] || 'Inicio';
    }

    // Guardar última subvista en localStorage con try/catch
    if (targetSection === 'cuentas-cobro') {
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
    }

    // Barra fija inferior en móviles
    updateMobileStickyBar();
    updateBadges();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Event Listeners Setup ---
  function setupEvents() {
    // 1. Navegación Principal (Cotizaciones / Cuentas de cobro)
    const btnMainCot = $('btn-main-cotizaciones');
    if (btnMainCot) {
      btnMainCot.addEventListener('click', () => switchMainSection('cotizaciones'));
    }

    const btnMainCobro = $('btn-main-cobro');
    if (btnMainCobro) {
      btnMainCobro.addEventListener('click', () => switchMainSection('cuentas-cobro'));
    }

    // Botón para alternar rápidamente entre Cotizaciones y Cuentas de cobro
    const btnToggleMainSection = $('btn-toggle-main-section');
    if (btnToggleMainSection) {
      btnToggleMainSection.addEventListener('click', () => {
        const next = (state.activeMainSection === 'cuentas-cobro') ? 'cotizaciones' : 'cuentas-cobro';
        switchMainSection(next);
      });
    }

    // 2. Submenús (Cada opción abre su propia vista)
    document.querySelectorAll('.subnav-btn, .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.subview || btn.dataset.view;
        if (targetView) switchSubview(targetView);
      });
    });

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
        showToast('Tus datos de emisor se guardaron correctamente', '💾');
        switchSubview('view-cuentas-cobro');
      });
    }

    const btnBackToCobro = $('btn-back-to-cobro-form');
    if (btnBackToCobro) {
      btnBackToCobro.addEventListener('click', () => switchSubview('view-cuentas-cobro'));
    }

    // 5. Restaurar última sección y opción usada en localStorage
    const savedSection = getStorage('pr_active_main_section', 'cotizaciones');
    const legacyTab = getStorage('pr_active_tab', null);
    let initialSubview = null;

    if (savedSection === 'cuentas-cobro') {
      initialSubview = getStorage('pr_active_subview_cobro', 'view-cuentas-cobro');
    } else {
      initialSubview = getStorage('pr_active_subview_cot', 'view-cotizador');
    }

    // Compatibilidad si venía de versión previa
    if (legacyTab && SUBVIEW_SECTION_MAP[legacyTab]) {
      const legacySection = SUBVIEW_SECTION_MAP[legacyTab];
      if (legacySection === savedSection) {
        initialSubview = legacyTab;
      }
    }

    switchMainSection(savedSection, initialSubview);

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
      showToast('Configuración del negocio guardada con éxito', '💾');
      renderLivePreview();
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
        renderLivePreview();
        showToast('Restablecido a Pedro Roa', '🔄');
      }
    });

    // Catalog interactions
    $('catalog-search').addEventListener('input', renderCatalogManager);

    $('btn-cat-add-new').addEventListener('click', () => {
      state.catalog.unshift({
        c: 'Servicios',
        n: '',
        p: 0
      });
      saveCatalogToStorage(state.catalog);
      renderCatalogManager();
      renderCatalogSelect();
      const firstInput = document.querySelector('#catalog-manage-list input[data-field="n"]');
      if (firstInput) firstInput.focus();
    });

    $('btn-cat-restore').addEventListener('click', () => {
      if (confirm('¿Restaurar catálogo inicial de servicios y productos de Pedro Roa? Se borrarán las personalizaciones.')) {
        state.catalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
        saveCatalogToStorage(state.catalog);
        renderCatalogManager();
        renderCatalogSelect();
        showToast('Catálogo inicial restaurado', '🔄');
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

      if (field === 'c') item.c = target.value;
      if (field === 'n') item.n = target.value;
      if (field === 'p') item.p = Math.max(0, parseFloat(target.value) || 0);

      saveCatalogToStorage(state.catalog);
      renderCatalogSelect();
    };

    $('catalog-manage-list').addEventListener('input', handleCatalogFieldChange);
    $('catalog-manage-list').addEventListener('change', handleCatalogFieldChange);

    // Guardar catálogo al borrar un producto
    $('catalog-manage-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete-cat-item"]');
      if (!btn) return;
      const row = btn.closest('.catalog-item-row');
      const idx = parseInt(row.dataset.index);
      state.catalog.splice(idx, 1);
      saveCatalogToStorage(state.catalog);
      renderCatalogManager();
      renderCatalogSelect();
      showToast('Ítem eliminado del catálogo', '🗑️');
    });

    // History interaction
    $('history-list').addEventListener('click', (e) => {
      const loadBtn = e.target.closest('[data-action="load-history"]');
      if (loadBtn) {
        const idx = parseInt(loadBtn.dataset.index);
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
        
        // Switch to cotizador view
        document.querySelector('.tab-btn[data-view="view-cotizador"]').click();
        renderQuoteItems();
        renderLivePreview();
        showToast(`Cotización ${saved.quoteNumber} cargada`, '📋');
        return;
      }

      const delBtn = e.target.closest('[data-action="delete-history"]');
      if (delBtn) {
        if (confirm('¿Eliminar esta cotización del historial?')) {
          const idx = parseInt(delBtn.dataset.index);
          state.history.splice(idx, 1);
          setStorage('pr_history', state.history);
          renderHistory();
          showToast('Cotización eliminada', '🗑️');
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
      state.quoteNumber++;
      setStorage('pr_quote_num', state.quoteNumber);

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
        saveCobroClient(state.cobroClientName, state.cobroClientNit);
        const data = getFullCobroData();
        window.PedroRoaPdf.previewCobroPdf(data);
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
    updateMobileStickyBar();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registrado con éxito:', reg.scope))
          .catch(err => console.warn('Error registrando SW:', err));
      });
    }
  }

  // Init application
  window.addEventListener('DOMContentLoaded', () => {
    initForm();
    setupEvents();
  });

})();
