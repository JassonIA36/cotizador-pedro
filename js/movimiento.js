/* Movimiento del Cotizador: poco y con motivo. Nada de lo que se usa cien veces al día se anima;
   solo la «impresión» de la barra de tintas al abrir, la entrada del inicio y la línea nueva de una cotización. */
(function () {
  'use strict';
  var M = window.PRMotion;
  if (!M || !M.animate) return;
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido) return;

  var EASE = [0.23, 1, 0.32, 1];

  function entrar() {
    // La barra de control se «imprime» de izquierda a derecha, una tinta tras otra
    var tintas = document.querySelectorAll('.cmyk-bar i');
    tintas.forEach(function (t, i) {
      t.style.transformOrigin = 'left center';
      M.animate(t, { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 0.45, delay: i * 0.09, ease: EASE });
    });
    // Los tres módulos del inicio suben suavemente, una sola vez
    var filas = document.querySelectorAll('#view-main-menu .hub-action-card, #view-main-menu .hub-quick-widgets, #view-main-menu .hub-support-card');
    filas.forEach(function (f, i) {
      M.animate(f, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] }, { duration: 0.28, delay: 0.08 + i * 0.05, ease: EASE });
    });
  }

  // Una línea nueva en la cotización aparece donde se agregó (solo cuando se agrega exactamente una)
  function vigilarLineas() {
    var cont = document.getElementById('quote-lines');
    if (!cont) return;
    var antes = cont.children.length;
    new MutationObserver(function () {
      var ahora = cont.children.length;
      if (ahora === antes + 1) {
        var nueva = cont.lastElementChild;
        M.animate(nueva, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] }, { duration: 0.22, ease: EASE });
      }
      antes = ahora;
    }).observe(cont, { childList: true });
  }

  function iniciar() { entrar(); vigilarLineas(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
