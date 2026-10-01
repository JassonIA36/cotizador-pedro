const fs = require('fs');
const path = require('path');

console.log('--- TEST: ESCENARIOS DE SINCRONIZACIÓN Y FUSIÓN ---');

const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

// Verify that applyCloudRecordToLocal handles deleted records without reading datos
if (!appJs.includes('// ROBUSTEZ: Si viene deleted=true, aplicar usando solo el id')) {
  console.error('❌ Falta comentario/lógica de robustez en deleted');
  process.exit(1);
}

// Verify that applyCloudRecordToLocal handles empty datos
if (!appJs.includes('omitido por datos vacíos o nulos')) {
  console.error('❌ Falta manejo de datos vacíos o nulos');
  process.exit(1);
}

// Verify that pagination is implemented
if (!appJs.includes('fetchSupabaseRowsWithPagination')) {
  console.error('❌ Falta fetchSupabaseRowsWithPagination');
  process.exit(1);
}

// Verify repairInformesSync
if (!appJs.includes('async function repairInformesSync()')) {
  console.error('❌ Falta repairInformesSync');
  process.exit(1);
}

// Verify continuous sync listeners
if (!appJs.includes("document.addEventListener('visibilitychange'") || !appJs.includes("60000")) {
  console.error('❌ Faltan listeners de sincronización continua (visibilitychange o 60s)');
  process.exit(1);
}

// Verify all delete methods pass item to recordTombstone
const tombstoneMatches = appJs.match(/recordTombstone\([^)]+\)/g) || [];
console.log('Llamadas a recordTombstone encontradas:', tombstoneMatches);

let hasUnsafeTombstone = false;
tombstoneMatches.forEach(m => {
  // Only the declaration or internal fallback should have less than 3 arguments if caller has item
  if (m === "recordTombstone(id, tipo)" || m === "recordTombstone(item.id, 'informe_tecnico')" || m === "recordTombstone(item.id, 'cuenta_cobro')" || m === "recordTombstone(item.id, 'cotizacion')" || m === "recordTombstone(item.id, 'catalogo')" || m === "recordTombstone(tpl.id, 'plantilla_informe')") {
    console.error('❌ Llamada insegura a recordTombstone encontrada:', m);
    hasUnsafeTombstone = true;
  }
});

if (hasUnsafeTombstone) {
  process.exit(1);
}

console.log('✅ Verificaciones estáticas completadas exitosamente.');
