const fs = require('fs');
const path = require('path');

console.log('--- VERIFICANDO NOMBRES DE BOTONES Y MENSAJES ---');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/app.css'), 'utf8');

let errors = [];

// Req 1: Submenu / Menú navigation names
if (!html.includes('<span>📝</span> Cotización actual')) {
  errors.push('Falta submenú "📝 Cotización actual" en index.html');
}
if (!html.includes('<span>📝</span> Cuenta de cobro actual')) {
  errors.push('Falta submenú "📝 Cuenta de cobro actual" en index.html');
}
if (!html.includes('<span>📝</span> Informe actual')) {
  errors.push('Falta submenú "📝 Informe actual" en index.html');
}

// Hub pills
if (!html.includes('<span class="hub-pill">📝 Cotización actual</span>')) {
  errors.push('Falta hub pill "📝 Cotización actual" en index.html');
}
if (!html.includes('<span class="hub-pill">📝 Cuenta de cobro actual</span>')) {
  errors.push('Falta hub pill "📝 Cuenta de cobro actual" en index.html');
}
if (!html.includes('<span class="hub-pill">📝 Informe actual</span>')) {
  errors.push('Falta hub pill "📝 Informe actual" en index.html');
}

// SUBVIEW_NAMES_MAP in app.js
if (!appJs.includes("'view-cotizador': 'Cotización actual'")) {
  errors.push("Falta 'view-cotizador': 'Cotización actual' en SUBVIEW_NAMES_MAP");
}
if (!appJs.includes("'view-cuentas-cobro': 'Cuenta de cobro actual'")) {
  errors.push("Falta 'view-cuentas-cobro': 'Cuenta de cobro actual' en SUBVIEW_NAMES_MAP");
}
if (!appJs.includes("'view-informe-tecnico': 'Informe actual'")) {
  errors.push("Falta 'view-informe-tecnico': 'Informe actual' en SUBVIEW_NAMES_MAP");
}

// Req 2: Botones de abajo (barra de acciones)
if (!html.includes('<span>✨</span> Nueva cotización')) {
  errors.push('Falta botón de acción "Nueva cotización" en index.html');
}
if (!html.includes('<span>✨</span> Nueva cuenta de cobro')) {
  errors.push('Falta botón de acción "Nueva cuenta de cobro" en index.html');
}
if (!html.includes('<span>✨</span> Nuevo informe')) {
  errors.push('Falta botón de acción "Nuevo informe" en index.html');
}

// Mensaje de confirmación exacto
const expectedConfirm = 'Hay cambios sin guardar, ¿empezar uno nuevo?';
if (!appJs.includes(expectedConfirm)) {
  errors.push(`Falta confirmación con mensaje exacto: "${expectedConfirm}"`);
}

// Req 3: Etiqueta de estado arriba del formulario
if (!html.includes('id="cot-form-status-badge"')) {
  errors.push('Falta #cot-form-status-badge en index.html');
}
if (!html.includes('id="cobro-form-status-badge"')) {
  errors.push('Falta #cobro-form-status-badge en index.html');
}
if (!html.includes('id="inf-form-status-badge"')) {
  errors.push('Falta #inf-form-status-badge en index.html');
}
if (!appJs.includes('Editando cuenta N°') || !appJs.includes('Editando cotización N°') || !appJs.includes('Editando informe N°')) {
  errors.push('Faltan textos "Editando..." en app.js');
}
if (!appJs.includes('Documento nuevo')) {
  errors.push('Falta texto "Documento nuevo" en app.js');
}

// Req 4: Aviso al guardar con botón
if (!appJs.includes('showSaveNotice')) {
  errors.push('Falta función showSaveNotice en app.js');
}
if (!appJs.includes('Guardada como Cuenta N°')) {
  errors.push('Falta "Guardada como Cuenta N°" en app.js');
}
if (!appJs.includes('Guardada como Cotización N°')) {
  errors.push('Falta "Guardada como Cotización N°" en app.js');
}
if (!appJs.includes('Guardado como Informe N°')) {
  errors.push('Falta "Guardado como Informe N°" en app.js');
}
if (!appJs.includes('toast-action-btn')) {
  errors.push('Falta botón de acción en el aviso de guardado');
}

// CSS
if (!css.includes('.form-doc-status-badge')) {
  errors.push('Falta clase .form-doc-status-badge en css/app.css');
}
if (!css.includes('.toast-action-btn')) {
  errors.push('Falta clase .toast-action-btn en css/app.css');
}

if (errors.length > 0) {
  console.error('❌ Se encontraron errores:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('✅ Todos los requerimientos 1, 2, 3, 4 y 5 verificados con éxito!');
  process.exit(0);
}
