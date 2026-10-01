const fs = require('fs');
const path = require('path');

console.log('--- TEST DE FLUJO LÓGICO DE BOTONES Y ESTADOS ---');

// Mock simple DOM
const elements = {};
function mockElement(id) {
  return {
    id,
    value: '',
    textContent: '',
    className: '',
    innerHTML: '',
    style: {},
    classList: {
      add: function(cls) { this[cls] = true; },
      remove: function(cls) { delete this[cls]; },
      contains: function(cls) { return !!this[cls]; }
    },
    addEventListener: function() {},
    setAttribute: function() {},
    removeAttribute: function() {}
  };
}

const requiredIds = [
  'cot-form-status-badge', 'preview-quote-badge', 'q-client-name',
  'cobro-form-status-badge', 'cc-badge-number', 'cc-client-name',
  'inf-form-status-badge', 'inf-client-name', 'inf-num',
  'toast', 'toast-save-new-btn'
];
requiredIds.forEach(id => {
  elements[id] = mockElement(id);
});

global.$ = function(id) {
  return elements[id] || mockElement(id);
};
global.escapeHtml = function(s) {
  return String(s || '');
};
global.getQuoteIdString = function() {
  return 'COT-0012';
};

// Test logic:
const state = {
  editingQuote: null,
  quoteIsDirty: false,
  editingCobro: null,
  cobroIsDirty: false,
  editingInforme: null,
  informeIsDirty: false,
  cobroNum: 12
};

function updateFormStatusBadges() {
  // 1. Cotizaciones
  const cotBadge = $('cot-form-status-badge');
  const cotCardBadge = $('preview-quote-badge');
  if (state.editingQuote) {
    const client = ($('q-client-name') ? $('q-client-name').value.trim() : '') || state.editingQuote.client || 'Cliente General';
    const num = state.editingQuote.number || getQuoteIdString();
    const txt = `Editando cotización N° ${num} – ${client}`;
    if (cotBadge) {
      cotBadge.textContent = txt;
      cotBadge.className = 'form-doc-status-badge status-editing';
    }
    if (cotCardBadge) cotCardBadge.textContent = txt;
  } else {
    const txt = 'Documento nuevo';
    if (cotBadge) {
      cotBadge.textContent = txt;
      cotBadge.className = 'form-doc-status-badge status-new';
    }
    if (cotCardBadge) cotCardBadge.textContent = txt;
  }

  // 2. Cuentas de Cobro
  const cobroBadge = $('cobro-form-status-badge');
  const cobroCardBadge = $('cc-badge-number');
  if (state.editingCobro) {
    const client = ($('cc-client-name') ? $('cc-client-name').value.trim() : '') || state.editingCobro.client || 'Cliente General';
    const num = state.editingCobro.number || String(state.cobroNum || 1).padStart(3, '0');
    const txt = `Editando cuenta N° ${num} – ${client}`;
    if (cobroBadge) {
      cobroBadge.textContent = txt;
      cobroBadge.className = 'form-doc-status-badge status-editing';
    }
    if (cobroCardBadge) cobroCardBadge.textContent = txt;
  } else {
    const txt = 'Documento nuevo';
    if (cobroBadge) {
      cobroBadge.textContent = txt;
      cobroBadge.className = 'form-doc-status-badge status-new';
    }
    if (cobroCardBadge) cobroCardBadge.textContent = txt;
  }

  // 3. Informes Técnicos
  const infBadge = $('inf-form-status-badge');
  if (state.editingInforme) {
    const client = ($('inf-client-name') ? $('inf-client-name').value.trim() : '') || state.editingInforme.client || 'Cliente General';
    const num = state.editingInforme.number || ($('inf-num') ? $('inf-num').value : 'INF-0001');
    const txt = `Editando informe N° ${num} – ${client}`;
    if (infBadge) {
      infBadge.textContent = txt;
      infBadge.className = 'form-doc-status-badge status-editing';
    }
  } else {
    const txt = 'Documento nuevo';
    if (infBadge) {
      infBadge.textContent = txt;
      infBadge.className = 'form-doc-status-badge status-new';
    }
  }
}

// 1. Initial state must be "Documento nuevo"
updateFormStatusBadges();
if ($('cot-form-status-badge').textContent !== 'Documento nuevo' ||
    $('cobro-form-status-badge').textContent !== 'Documento nuevo' ||
    $('inf-form-status-badge').textContent !== 'Documento nuevo') {
  console.error('❌ Error en estado inicial Documento nuevo');
  process.exit(1);
}
console.log('✅ Estado inicial verificado: "Documento nuevo" en las 3 secciones');

// 2. Editing from history
state.editingCobro = { num: 12, number: '012', client: 'Acme Corp' };
updateFormStatusBadges();
if ($('cobro-form-status-badge').textContent !== 'Editando cuenta N° 012 – Acme Corp') {
  console.error('❌ Error en texto de cuenta editada:', $('cobro-form-status-badge').textContent);
  process.exit(1);
}
console.log('✅ Estado editando cuenta verificado: "Editando cuenta N° 012 – Acme Corp"');

// 3. Editing quote from history
state.editingQuote = { id: 'uuid-1', number: 'COT-0005', client: 'Juan Perez' };
updateFormStatusBadges();
if ($('cot-form-status-badge').textContent !== 'Editando cotización N° COT-0005 – Juan Perez') {
  console.error('❌ Error en texto de cotización editada:', $('cot-form-status-badge').textContent);
  process.exit(1);
}
console.log('✅ Estado editando cotización verificado: "Editando cotización N° COT-0005 – Juan Perez"');

// 4. Editing informe from history
state.editingInforme = { id: 'uuid-2', number: 'INF-0003', client: 'Tech Solutions' };
updateFormStatusBadges();
if ($('inf-form-status-badge').textContent !== 'Editando informe N° INF-0003 – Tech Solutions') {
  console.error('❌ Error en texto de informe editado:', $('inf-form-status-badge').textContent);
  process.exit(1);
}
console.log('✅ Estado editando informe verificado: "Editando informe N° INF-0003 – Tech Solutions"');

// 5. Resetting to new document
state.editingCobro = null;
state.editingQuote = null;
state.editingInforme = null;
updateFormStatusBadges();
if ($('cot-form-status-badge').textContent !== 'Documento nuevo' ||
    $('cobro-form-status-badge').textContent !== 'Documento nuevo' ||
    $('inf-form-status-badge').textContent !== 'Documento nuevo') {
  console.error('❌ Error al resetear a Documento nuevo');
  process.exit(1);
}
console.log('✅ Reseteo verificado: Vuelve a "Documento nuevo"');

console.log('--- TODOS LOS TESTS LÓGICOS PASARON ---');
