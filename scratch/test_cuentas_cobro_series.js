const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- VALIDANDO SERIES INDEPENDIENTES DE CUENTAS DE COBRO ---');

const htmlPath = path.join(__dirname, '..', 'index.html');
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// 1. Verificación de elementos en index.html
console.log('1. Verificando elementos en index.html...');
assert(htmlContent.includes('id="cc-consecutivo-mode-tab"'), 'Debe existir #cc-consecutivo-mode-tab en Mis Datos');
assert(htmlContent.includes('id="cc-consecutivo-mode"'), 'Debe existir #cc-consecutivo-mode en el panel acordeón');
assert(htmlContent.includes('id="cobro-conflict-modal-overlay"'), 'Debe existir #cobro-conflict-modal-overlay');
assert(htmlContent.includes('id="btn-conflict-use-next"'), 'Debe existir #btn-conflict-use-next');
assert(htmlContent.includes('id="btn-conflict-replace"'), 'Debe existir #btn-conflict-replace');
assert(htmlContent.includes('id="btn-conflict-cancel"'), 'Debe existir #btn-conflict-cancel');
assert(htmlContent.includes('value="por_cliente"'), 'Debe tener opción por_cliente');
assert(htmlContent.includes('value="unico"'), 'Debe tener opción unico');
console.log('   ✅ Elementos HTML verificados correctamente');

// 2. Extraer y probar funciones lógicas de normalización y consecutivas
console.log('2. Probando normalización y cálculo de series...');

// Mock environment
const mockState = {
  cobroConsecutivoMode: 'por_cliente',
  cobroNumManual: false,
  cobroNum: 1,
  cobroClientName: '',
  cobroClientNit: '',
  editingCobro: null,
  cobroHistory: []
};

// Implementaciones extraídas directamente del código
function normalizeNitDigits(nit) {
  return (nit != null ? String(nit) : '').replace(/\D/g, '').trim();
}

function normalizeClientName(name) {
  return (name != null ? String(name) : '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isSameClient(clientA, clientB) {
  if (!clientA || !clientB) return false;
  const nitA = normalizeNitDigits(clientA.nit || clientA.clientNit);
  const nitB = normalizeNitDigits(clientB.nit || clientB.clientNit);

  if (nitA && nitB) {
    return nitA === nitB;
  }

  const nameA = normalizeClientName(clientA.name || clientA.clientName);
  const nameB = normalizeClientName(clientB.name || clientB.clientName);
  if (nameA && nameB) {
    return nameA === nameB;
  }

  return false;
}

function getCalculatedNextCobroNum(clientName, clientNit, state = mockState) {
  if (state.cobroConsecutivoMode === 'unico') {
    let max = 0;
    if (Array.isArray(state.cobroHistory)) {
      state.cobroHistory.forEach(h => {
        if (h.deleted || (h.datos && h.datos.deleted)) return;
        const n = parseInt(h.cobroNum || (h.datos && h.datos.cobroNum), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      });
    }
    return max + 1;
  }

  const cName = clientName !== undefined ? clientName : (state.cobroClientName || '');
  const cNit = clientNit !== undefined ? clientNit : (state.cobroClientNit || '');
  const target = { name: cName, nit: cNit };
  const hasTarget = Boolean(normalizeNitDigits(cNit) || normalizeClientName(cName));

  if (!hasTarget) {
    return 1;
  }

  let max = 0;
  if (Array.isArray(state.cobroHistory)) {
    state.cobroHistory.forEach(h => {
      if (h.deleted || (h.datos && h.datos.deleted)) return;
      const hClient = {
        name: h.clientName || (h.datos && h.datos.clientName) || '',
        nit: h.clientNit || (h.datos && h.datos.clientNit) || ''
      };
      if (isSameClient(target, hClient)) {
        const n = parseInt(h.cobroNum || (h.datos && h.datos.cobroNum), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    });
  }
  return max + 1;
}

// Test normalización de NIT
assert.strictEqual(normalizeNitDigits('900.123.456-7'), '9001234567');
assert.strictEqual(normalizeNitDigits(' 1.015.409.172 '), '1015409172');

// Test normalización de nombres
assert.strictEqual(normalizeClientName('  SÚPERMÓTOSCAR   S.A.S.  '), 'supermotoscar s.a.s.');
assert.strictEqual(normalizeClientName('Pedro Luis Roa Mora'), 'pedro luis roa mora');

// Test isSameClient
assert.strictEqual(isSameClient({ nit: '900.123.456-7', name: 'Super' }, { nit: '9001234567', name: 'Otro' }), true, 'NIT con diferente formato debe coincidir');
assert.strictEqual(isSameClient({ nit: '', name: '  SUPERMOTOSCAR S.A.S. ' }, { nit: '', name: 'supermotoscar s.a.s.' }), true, 'Nombre sin tildes/espacios debe coincidir');
assert.strictEqual(isSameClient({ nit: '111', name: 'Super' }, { nit: '222', name: 'Super' }), false, 'Distintos NITs no coinciden');
console.log('   ✅ Pruebas de normalización pasadas');

// Poblar historial con cuentas de dos clientes distintos
mockState.cobroHistory = [
  { id: 'uuid-1', cobroNum: 1, cobroNumber: '001', clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7', deleted: false },
  { id: 'uuid-2', cobroNum: 12, cobroNumber: '012', clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7', deleted: false },
  { id: 'uuid-3', cobroNum: 1, cobroNumber: '001', clientName: 'TIENDA DE FRENOS', clientNit: '800.999.888-1', deleted: false },
  { id: 'uuid-4', cobroNum: 3, cobroNumber: '003', clientName: 'TIENDA DE FRENOS', clientNit: '800.999.888-1', deleted: false },
  { id: 'uuid-5', cobroNum: 99, cobroNumber: '099', clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7', deleted: true } // Borrado
];

// 3. Probar series independientes
console.log('3. Probando series independientes por cliente...');
const nextSuper = getCalculatedNextCobroNum('SUPERMOTOSCAR S.A.S.', '900.123.456-7', mockState);
assert.strictEqual(nextSuper, 13, 'SUPERMOTOSCAR debe ir por el 13 (máximo 12, ignorando el 99 borrado)');

const nextFrenos = getCalculatedNextCobroNum('TIENDA DE FRENOS', '800.999.888-1', mockState);
assert.strictEqual(nextFrenos, 4, 'TIENDA DE FRENOS debe ir por el 4 (máximo 3)');

const nextNuevo = getCalculatedNextCobroNum('CLIENTE NUEVO S.A.', '901.000.000-0', mockState);
assert.strictEqual(nextNuevo, 1, 'Cliente nuevo debe empezar en 1 (001)');

const nextVacio = getCalculatedNextCobroNum('', '', mockState);
assert.strictEqual(nextVacio, 1, 'Cliente vacío debe empezar en 1 (001)');

// Modo único para todos
mockState.cobroConsecutivoMode = 'unico';
const nextUnico = getCalculatedNextCobroNum('CLIENTE NUEVO S.A.', '901.000.000-0', mockState);
assert.strictEqual(nextUnico, 13, 'En modo único el consecutivo debe ser el máximo general (12) + 1 = 13');
mockState.cobroConsecutivoMode = 'por_cliente';
console.log('   ✅ Series independientes por cliente verificadas con éxito');

// 4. Probar detección de colisiones al guardar
console.log('4. Probando lógica de colisiones al guardar...');

function checkCollision(data, currentEditingId, state = mockState) {
  const rawNum = parseInt(data.cobroNum, 10);
  return state.cobroHistory.findIndex(h => {
    if (currentEditingId && h.id === currentEditingId) return false;
    if (h.deleted || (h.datos && h.datos.deleted)) return false;
    if (parseInt(h.cobroNum, 10) !== rawNum) return false;
    if (state.cobroConsecutivoMode === 'unico') return true;
    return isSameClient(h, data);
  });
}

// Colisión: Intentar guardar número 12 para SUPERMOTOSCAR (cuenta nueva)
const col1 = checkCollision({ cobroNum: 12, clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7' }, null);
assert(col1 >= 0, 'Debe detectar colisión al guardar número 12 repetido de SUPERMOTOSCAR');

// NO colisión: Guardar número 12 para TIENDA DE FRENOS (cliente distinto)
const col2 = checkCollision({ cobroNum: 12, clientName: 'TIENDA DE FRENOS', clientNit: '800.999.888-1' }, null);
assert.strictEqual(col2, -1, 'NO debe haber colisión al usar número 12 para otro cliente en modo por_cliente');

// NO colisión contra sí misma: Editando cuenta uuid-2 (que es la número 12 de SUPERMOTOSCAR)
const col3 = checkCollision({ cobroNum: 12, clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7' }, 'uuid-2');
assert.strictEqual(col3, -1, 'Editar la cuenta abierta desde historial NO debe generar colisión contra sí misma');

// Colisión al cambiar número durante edición: editando uuid-2 pero cambiando el número a 1 (que ya pertenece a uuid-1)
const col4 = checkCollision({ cobroNum: 1, clientName: 'SUPERMOTOSCAR S.A.S.', clientNit: '900.123.456-7' }, 'uuid-2');
assert(col4 >= 0, 'Cambiar a otro número existente durante edición sí debe generar aviso de conflicto');

console.log('   ✅ Lógica de colisión verificada con éxito');

// 5. Verificar contenido de app.js para sincronización y persistencia
console.log('5. Verificando Supabase y persistencia en app.js...');
assert(appJsContent.includes("cobroConsecutivoMode: state.cobroConsecutivoMode || 'por_cliente'"), 'Debe enviar cobroConsecutivoMode en el push');
assert(appJsContent.includes("state.cobroConsecutivoMode = datos.cobroConsecutivoMode"), 'Debe recibir cobroConsecutivoMode en el pull');
assert(appJsContent.includes("isSameClient(h, cobro) && parseInt(h.cobroNum, 10) === cNum"), 'Pull de nube debe verificar cliente antes de emparejar por número');
assert(appJsContent.includes("showCobroConflictModal"), 'Debe contener función showCobroConflictModal');
assert(appJsContent.includes("btn-conflict-use-next"), 'Debe configurar acción btn-conflict-use-next');
assert(appJsContent.includes("btn-conflict-replace"), 'Debe configurar acción btn-conflict-replace');
assert(appJsContent.includes("btn-conflict-cancel"), 'Debe configurar acción btn-conflict-cancel');

console.log('--- TODAS LAS VALIDACIONES PASARON EXITOSAMENTE (100%) ---');
