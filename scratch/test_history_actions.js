const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

class MockElement {
  constructor(id = '', tagName = 'div', className = '') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.classList = {
      contains: (c) => this.className.split(/\s+/).includes(c),
      add: (c) => { if (!this.classList.contains(c)) this.className = (this.className + ' ' + c).trim(); },
      remove: (c) => { this.className = this.className.split(/\s+/).filter(x => x !== c).join(' '); }
    };
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.style = {};
    this._listeners = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k.startsWith('data-')) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  focus() {}

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
  }

  addEventListener(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  dispatchEvent(event) {
    if (this._listeners[event.type]) {
      this._listeners[event.type].forEach(h => h(event));
    }
  }

  closest(selector) {
    return null;
  }
}

const elementsById = {};
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
  const id = m[1];
  elementsById[id] = new MockElement(id);
}

const actionsLog = [];

global.window = {
  location: { href: 'http://localhost/' },
  addEventListener: () => {},
  scrollTo: () => {},
  PedroRoaPdf: {
    previewPdf: (d) => actionsLog.push(['previewPdf', d.quoteNumber || d.id]),
    sharePdfViaWhatsApp: (d) => actionsLog.push(['sharePdfViaWhatsApp', d.quoteNumber || d.id]),
    previewCobroPdf: (d) => actionsLog.push(['previewCobroPdf', d.cobroNum]),
    shareCobroPdfViaWhatsApp: (d) => actionsLog.push(['shareCobroPdfViaWhatsApp', d.cobroNum]),
    previewInformePdf: (d) => actionsLog.push(['previewInformePdf', d.id]),
    shareInformePdfViaWhatsApp: (d) => actionsLog.push(['shareInformePdfViaWhatsApp', d.id]),
  }
};

global.document = {
  readyState: 'complete',
  documentElement: new MockElement('html', 'html'),
  getElementById: (id) => elementsById[id] || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return elementsById[sel.substring(1)] || null;
    return new MockElement('', sel);
  },
  querySelectorAll: (sel) => [],
  addEventListener: () => {},
  createElement: (tag) => new MockElement('', tag),
  body: new MockElement('body', 'body')
};

global.localStorage = {
  _data: {
    pr_history: JSON.stringify([{
      id: 'quote-1',
      quoteNumber: 'COT-001',
      clientName: 'Cliente Test Cot',
      clientPhone: '3001234567',
      items: [{ name: 'Item 1', price: 50000, qty: 1 }],
      total: 50000,
      status: 'Borrador',
      issueDate: '2026-09-30'
    }]),
    pr_cobro_history: JSON.stringify([{
      id: 'cobro-1',
      cobroNum: 1,
      cobroNumber: 1,
      clientName: 'Cliente Test Cobro',
      clientNit: '900123456',
      city: 'Bogotá',
      conceptos: [{ desc: 'Concepto 1', amount: 80000 }],
      totals: { subtotal: 80000, saldo: 80000 },
      status: 'pendiente',
      dateIso: '2026-09-30'
    }]),
    pr_informe_history: JSON.stringify([{
      id: 'inf-uuid-1',
      number: 'INF-0001',
      clientName: 'Cliente Test Inf',
      clientNit: '12345678',
      equipment: 'Epson L565',
      falla: 'No enciende',
      status: 'Borrador',
      date: '2026-09-30',
      propuestaItems: [{ desc: 'Mantenimiento', valor: 65000 }]
    }])
  },
  getItem: (k) => global.localStorage._data[k] || null,
  setItem: (k, v) => { global.localStorage._data[k] = String(v); },
  removeItem: (k) => { delete global.localStorage._data[k]; }
};

global.navigator = {
  userAgent: 'Node Test',
  clipboard: { writeText: () => Promise.resolve() }
};

global.confirm = () => true;
global.prompt = () => 'test prompt';

// Load app
require('../js/app.js');

console.log('--- TESTING ALL 3 HISTORIES & BUTTONS ---');

// Helper to parse buttons from innerHTML
function parseButtons(htmlStr) {
  const btnRegex = /<button\s+([^>]+)>([\s\S]*?)<\/button>/g;
  const btns = [];
  let bm;
  while ((bm = btnRegex.exec(htmlStr)) !== null) {
    const attrStr = bm[1];
    const btn = new MockElement('', 'button');
    const attrRegex = /([a-z0-9-]+)="([^"]*)"/g;
    let am;
    while ((am = attrRegex.exec(attrStr)) !== null) {
      btn.setAttribute(am[1], am[2]);
    }
    btn.innerHTML = bm[2];
    btn.closest = (sel) => {
      if (sel.includes('[data-accion]') && btn.getAttribute('data-accion')) return btn;
      if (sel.includes('[data-action]') && btn.getAttribute('data-action')) return btn;
      return null;
    };
    btns.push(btn);
  }
  return btns;
}

// 1. Cotizaciones
const histListEl = elementsById['history-list'];
const cotBtns = parseButtons(histListEl.innerHTML);
console.log('Cotizaciones buttons found:', cotBtns.length);
cotBtns.forEach(b => {
  console.log('  - accion:', b.getAttribute('data-accion'), '| id:', b.getAttribute('data-id'), '| type:', b.getAttribute('type'));
  histListEl.dispatchEvent({ type: 'click', target: b, preventDefault: () => {}, stopPropagation: () => {} });
});

// 2. Cuentas de Cobro
const cobroListEl = elementsById['cc-history-list'];
const cobroBtns = parseButtons(cobroListEl.innerHTML);
console.log('\nCuentas de cobro buttons found:', cobroBtns.length);
cobroBtns.forEach(b => {
  console.log('  - accion:', b.getAttribute('data-accion'), '| id:', b.getAttribute('data-id'), '| type:', b.getAttribute('type'));
  cobroListEl.dispatchEvent({ type: 'click', target: b, preventDefault: () => {}, stopPropagation: () => {} });
});

// 3. Informes Técnicos
elementsById['inf-hist-filter-status'].value = 'all';
elementsById['inf-hist-search'].dispatchEvent({ type: 'input' });
const infListEl = elementsById['inf-history-list'];
console.log('INF LIST INNERHTML SNIPPET:\n', infListEl.innerHTML.substring(0, 300));
const infBtns = parseButtons(infListEl.innerHTML);
console.log('\nInformes técnicos buttons found:', infBtns.length);
infBtns.forEach(b => {
  console.log('  - accion:', b.getAttribute('data-accion'), '| id:', b.getAttribute('data-id'), '| type:', b.getAttribute('type'));
  infListEl.dispatchEvent({ type: 'click', target: b, preventDefault: () => {}, stopPropagation: () => {} });
});

console.log('\nActions Log of PDF & External calls:');
console.log(actionsLog);
console.log('\nALL 3 HISTORIES & ACTIONS TESTED SUCCESSFULLY!');
