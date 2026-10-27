/* Iconos del Cotizador: una hoja SVG (trazo de 1.75, esquinas redondeadas) y un convertidor que cambia los
   emojis que escribe la app por estos iconos, para que todo se vea de una sola familia en cualquier celular. */
(function () {
  'use strict';

  var ICONOS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    quote: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    'quote-plus': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v6M9 15h6"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    send: '<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13L21 3"/>',
    whatsapp: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.5-2-1-.8.7c-.8-.3-1.6-1.1-1.9-1.9l.7-.8-1-2z"/>',
    message: '<path d="M4 5h16v11H9l-5 4z"/>',
    download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.7A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    package: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    logout: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    hash: '<path d="M5 9h15M4 15h15M10 4L8 20M16 4l-2 16"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>',
    signal: '<path d="M5 19v-4M10 19v-8M15 19V8M20 19V4"/>',
    building: '<path d="M5 21V4h9v17M14 9h5v12M3 21h18"/><path d="M8 8h3M8 12h3M8 16h3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };

  // Emoji -> nombre del icono (sin el selector de variación U+FE0F)
  var EMOJI = {
    '📜': 'history', '📝': 'edit', '✏': 'edit', '✍': 'edit', '👤': 'user', '👨': 'user', '🔄': 'refresh', '💾': 'save',
    '📋': 'quote', '📄': 'quote', '📖': 'quote', '📥': 'download', '📤': 'upload', '👁': 'eye', '🙈': 'eye-off',
    '📲': 'whatsapp', '📱': 'phone', '📞': 'phone', '🛠': 'wrench', '🔧': 'wrench', '📦': 'package', '📎': 'package',
    '📑': 'layers', '💬': 'message', '⚙': 'sliders', '💼': 'receipt', '🖨': 'printer', '✨': 'plus', '➕': 'plus',
    '🔍': 'search', '💰': 'tag', '💵': 'tag', '🏷': 'tag', '🚀': 'send', '📁': 'folder', '🗑': 'trash', '⚠': 'alert',
    '📡': 'signal', '🕒': 'clock', '⏳': 'clock', '🔑': 'key', '🔐': 'lock', '🔒': 'lock', '✉': 'mail', '🚪': 'logout',
    '☀': 'sun', '🌙': 'moon', '✕': 'x', '✅': 'check-circle', '❌': 'x-circle', '🎉': 'check', '✓': 'check',
    '🔢': 'hash', '📅': 'calendar', '💻': 'laptop', '🏢': 'building', 'ℹ': 'info', '🌐': 'globe', '📍': 'info'
  };
  var PUNTOS = { '🟢': 'ok', '🟡': 'warn', '🔴': 'bad' };

  var NS = 'http://www.w3.org/2000/svg';

  function svg(nombre, clase) {
    return '<svg class="ic' + (clase ? ' ' + clase : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + nombre + '"/></svg>';
  }

  function inyectarHoja() {
    if (document.getElementById('pr-iconos')) return;
    var cuerpo = '';
    for (var k in ICONOS) {
      cuerpo += '<symbol id="i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ICONOS[k] + '</symbol>';
    }
    var hoja = document.createElementNS(NS, 'svg');
    hoja.setAttribute('id', 'pr-iconos');
    hoja.setAttribute('width', '0');
    hoja.setAttribute('height', '0');
    hoja.setAttribute('aria-hidden', 'true');
    hoja.style.position = 'absolute';
    hoja.innerHTML = cuerpo;
    document.body.insertBefore(hoja, document.body.firstChild);
  }

  var RE = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2139}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}\u{2713}\u{2715}][️‍]*/gu;
  var OMITIR = { OPTION: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, TITLE: 1 };

  function nodoIcono(nombre) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + nombre);
    s.appendChild(u);
    return s;
  }

  function nodoPunto(tono) {
    var s = document.createElement('span');
    s.className = 'punto punto-' + tono;
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  // Cambia los emojis de los nodos de texto bajo `raiz` por iconos. Lo que no conoce lo deja como está.
  function iconizar(raiz) {
    if (!raiz) return;
    var cuerpoTexto = [];
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || OMITIR[p.nodeName]) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.doc-paper, .doc-cobro-paper, .doc-informe-paper, #pr-iconos, [data-sin-iconos]')) return NodeFilter.FILTER_REJECT;
        RE.lastIndex = 0;
        return RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (w.nextNode()) cuerpoTexto.push(w.currentNode);
    cuerpoTexto.forEach(function (n) {
      var txt = n.nodeValue, frag = document.createDocumentFragment(), ultimo = 0, hubo = false, m;
      RE.lastIndex = 0;
      while ((m = RE.exec(txt))) {
        var base = m[0].replace(/[️‍]/g, '');
        var nombre = EMOJI[base] || EMOJI[base.charAt(0)];
        var punto = PUNTOS[base];
        if (!nombre && !punto) continue;
        if (m.index > ultimo) frag.appendChild(document.createTextNode(txt.slice(ultimo, m.index)));
        frag.appendChild(punto ? nodoPunto(punto) : nodoIcono(nombre));
        ultimo = m.index + m[0].length;
        hubo = true;
      }
      if (!hubo) return;
      if (ultimo < txt.length) frag.appendChild(document.createTextNode(txt.slice(ultimo)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  var pendiente = false;
  function observar() {
    var obs = new MutationObserver(function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { pendiente = false; iconizar(document.body); });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function iniciar() {
    inyectarHoja();
    iconizar(document.body);
    observar();
  }

  window.PRIconos = { svg: svg, iconizar: iconizar, ICONOS: ICONOS, EMOJI: EMOJI };
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
