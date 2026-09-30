const fs = require('fs');
const path = require('path');

console.log('--- VALIDANDO MÓDULO INFORMES TÉCNICOS ---');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const pdfJs = fs.readFileSync(path.join(__dirname, '../js/pdf-generator.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/app.css'), 'utf8');

// 1. Verificar Navegación en HTML
const requiredIds = [
  'btn-main-informes',
  'submenu-informes',
  'badge-informes-count',
  'view-informe-tecnico',
  'view-informe-historial',
  'view-informe-plantillas',
  'view-informe-datos',
  'informe-entry-summary-card',
  'inf-entry-stat-pending-val',
  'inf-entry-stat-pending-count',
  'inf-entry-stat-total-count',
  'inf-entry-recent-list',
  'btn-inf-entry-view-history',
  'inf-header-tag',
  'inf-title',
  'inf-subtitle',
  'inf-client-name',
  'inf-client-nit',
  'inf-equipment',
  'inf-serial',
  'inf-date',
  'inf-service-type',
  'inf-falla',
  'inf-sec-motivo-inc',
  'inf-sec-verif-inc',
  'inf-sec-diag-inc',
  'inf-sec-prop-inc',
  'inf-sec-obs-inc',
  'inf-sec-conc-inc',
  'btn-inf-add-custom-section',
  'btn-inf-add-verif',
  'btn-inf-add-trabajo',
  'inf-propuesta-total-val',
  'inf-elab-name',
  'inf-elab-cargo',
  'inf-elab-correo',
  'inf-elab-celular',
  'inf-elab-date',
  'inf-include-logo',
  'inf-include-firma',
  'inf-show-number',
  'inf-num',
  'informe-document',
  'inf-history-list',
  'inf-plantillas-list',
  'inf-datos-cargo',
  'inf-datos-correo',
  'inf-datos-celular',
  'inf-datos-tag',
  'inf-datos-service',
  'inf-datos-obs'
];

let missingIds = [];
requiredIds.forEach(id => {
  if (!html.includes(`id="${id}"`)) {
    missingIds.push(id);
  }
});

if (missingIds.length > 0) {
  console.error('❌ Faltan IDs en index.html:', missingIds);
  process.exit(1);
} else {
  console.log('✅ Todos los IDs requeridos existen en index.html (' + requiredIds.length + ' IDs)');
}

// 2. Verificar funciones en pdf-generator.js
const requiredPdfFns = [
  'createInformePdfDocument',
  'generateInformePdfFile',
  'downloadInformePdf',
  'previewInformePdf',
  'shareInformePdfViaWhatsApp'
];

missingPdfFns = [];
requiredPdfFns.forEach(fn => {
  if (!pdfJs.includes(fn)) {
    missingPdfFns.push(fn);
  }
});

if (missingPdfFns.length > 0) {
  console.error('❌ Faltan funciones en pdf-generator.js:', missingPdfFns);
  process.exit(1);
} else {
  console.log('✅ Funciones de generación de PDF verificadas en pdf-generator.js');
}

// 3. Verificar funciones en app.js
const requiredAppFns = [
  'formatSpanishDate',
  'formatMoneyCop',
  'formatInformeNumber',
  'getInformeDataFromForm',
  'renderInformeDocumentHtml',
  'renderInformePreview',
  'generateInformePlainText',
  'renderInformeVerificacionesUI',
  'renderInformePropuestasUI',
  'renderInformeCustomSectionsUI',
  'saveCurrentInforme',
  'resetInformeForm',
  'renderInformeHistory',
  'createCobroFromInforme',
  'createCotizacionFromInforme',
  'saveCurrentAsPlantilla',
  'applyPlantilla',
  'syncInformeDatosUI',
  'saveInformeDatosFromUI',
  'setupInformeEvents'
];

let missingAppFns = [];
requiredAppFns.forEach(fn => {
  if (!appJs.includes(fn)) {
    missingAppFns.push(fn);
  }
});

if (missingAppFns.length > 0) {
  console.error('❌ Faltan funciones en app.js:', missingAppFns);
  process.exit(1);
} else {
  console.log('✅ Todas las funciones controladoras existen en app.js (' + requiredAppFns.length + ' funciones)');
}

// 4. Verificar estilos en app.css
const requiredClasses = [
  'card-informes',
  'icon-informes',
  'pill-informes',
  'doc-informe-paper',
  'doc-informe-top-tag',
  'doc-informe-ficha',
  'doc-informe-table',
  'doc-informe-firmas',
  'doc-informe-page-footer',
  'badge-borrador',
  'badge-enviado',
  'badge-aprobado',
  'badge-rechazado'
];

let missingClasses = [];
requiredClasses.forEach(cls => {
  if (!css.includes(`.${cls}`)) {
    missingClasses.push(cls);
  }
});

if (missingClasses.length > 0) {
  console.error('❌ Faltan clases CSS:', missingClasses);
  process.exit(1);
} else {
  console.log('✅ Todas las clases CSS requeridas existen en app.css');
}

console.log('--- PRUEBA COMPLETADA CON ÉXITO ---');
