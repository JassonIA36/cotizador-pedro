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

  // Helper storage functions
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

  // --- App State ---
  const state = {
    catalog: getStorage('pr_catalog', DEFAULT_CATALOG),
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
    deferredInstallPrompt: null
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
        <input type="text" data-field="d" value="${escapeHtml(it.d)}" placeholder="Descripción del producto o servicio" />
        <input type="number" data-field="q" min="1" value="${it.q}" title="Cantidad" />
        <input type="number" data-field="p" min="0" step="1000" value="${it.p}" title="Precio unitario" />
        <div class="line-subtotal">${formatMoney(it.q * it.p)}</div>
        <button class="btn-danger btn-icon" data-action="remove-line" title="Eliminar ítem">✕</button>
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
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="history-price">${formatMoney(item.total)}</div>
            <div class="history-actions">
              <button class="btn-primary" data-action="load-history" data-index="${originalIdx}" title="Cargar cotización">✏️ Abrir</button>
              <button class="btn-danger btn-icon" data-action="delete-history" data-index="${originalIdx}" title="Eliminar">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
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
  }

  // --- Event Listeners Setup ---
  function setupEvents() {
    // Navigation Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        const targetView = btn.dataset.view;
        if ($(targetView)) $(targetView).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

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
      setStorage('pr_catalog', state.catalog);
      renderCatalogManager();
      renderCatalogSelect();
      const firstInput = document.querySelector('#catalog-manage-list input[data-field="n"]');
      if (firstInput) firstInput.focus();
    });

    $('btn-cat-restore').addEventListener('click', () => {
      if (confirm('¿Restaurar catálogo inicial de servicios y productos de Pedro Roa? Se borrarán las personalizaciones.')) {
        state.catalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
        setStorage('pr_catalog', state.catalog);
        renderCatalogManager();
        renderCatalogSelect();
        showToast('Catálogo inicial restaurado', '🔄');
      }
    });

    $('catalog-manage-list').addEventListener('input', (e) => {
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

      setStorage('pr_catalog', state.catalog);
      renderCatalogSelect();
    });

    $('catalog-manage-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete-cat-item"]');
      if (!btn) return;
      const row = btn.closest('.catalog-item-row');
      const idx = parseInt(row.dataset.index);
      state.catalog.splice(idx, 1);
      setStorage('pr_catalog', state.catalog);
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
    $('sticky-btn-pdf').addEventListener('click', handleSendPdfWhatsApp);

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
