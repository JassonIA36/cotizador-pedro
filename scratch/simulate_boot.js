const fs = require('fs');

// Create a minimal browser simulation
const html = fs.readFileSync('index.html', 'utf8');

// Parse element IDs and basic structure
const elementsById = {};
const elementsByClass = {};

class MockElement {
  constructor(id = '', tagName = 'div', className = '') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.className = className;
    this.classList = {
      contains: (c) => this.className.split(/\s+/).includes(c),
      add: (c) => { if (!this.classList.contains(c)) this.className += ' ' + c; },
      remove: (c) => { this.className = this.className.split(/\s+/).filter(x => x !== c).join(' '); }
    };
    this.dataset = {};
    this.children = [];
    this.style = {};
    this._listeners = {};
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    // parse buttons inside HTML to simulate clicks and closest
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
    // simplified mock
    return null;
  }
}

// Find all IDs in index.html to mock them
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
  const id = m[1];
  elementsById[id] = new MockElement(id);
}

// Global window/document mocks
global.window = {
  location: { href: 'http://localhost/' },
  addEventListener: () => {},
  scrollTo: () => {},
  PedroRoaPdf: {
    previewPdf: () => console.log('Mock PedroRoaPdf.previewPdf called'),
    sharePdfViaWhatsApp: () => console.log('Mock PedroRoaPdf.sharePdfViaWhatsApp called'),
    previewCobroPdf: () => console.log('Mock PedroRoaPdf.previewCobroPdf called'),
    shareCobroPdfViaWhatsApp: () => console.log('Mock PedroRoaPdf.shareCobroPdfViaWhatsApp called'),
    previewInformePdf: () => console.log('Mock PedroRoaPdf.previewInformePdf called'),
    shareInformePdfViaWhatsApp: () => console.log('Mock PedroRoaPdf.shareInformePdfViaWhatsApp called'),
  }
};

MockElement.prototype.focus = function() {};

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
  _data: {},
  getItem: (k) => global.localStorage._data[k] || null,
  setItem: (k, v) => { global.localStorage._data[k] = String(v); },
  removeItem: (k) => { delete global.localStorage._data[k]; }
};

global.navigator = {
  userAgent: 'Node Test',
  clipboard: {
    writeText: () => Promise.resolve()
  }
};

global.alert = (msg) => console.log('ALERT:', msg);
global.confirm = (msg) => { console.log('CONFIRM:', msg); return true; };
global.prompt = (msg, def) => def || 'test';

console.log('--- TESTING APP.JS EXECUTION ---');
try {
  require('../js/app.js');
  console.log('App.js executed successfully without throwing error on boot!');
} catch (err) {
  console.error('ERROR during app.js execution:', err);
}
