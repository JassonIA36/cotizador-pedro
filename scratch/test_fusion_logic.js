// Mock simulation test for fusion logic
console.log('--- TEST SIMULACIÓN LÓGICA DE FUSIÓN Y ROBUSTEZ ---');

const mockState = {
  informeHistory: [
    {
      id: 'uuid-1',
      number: 'INF-2026-0001',
      clientName: 'Cliente 1',
      updatedAt: '2026-03-30T10:00:00.000Z'
    },
    {
      id: 'uuid-2',
      number: 'INF-2026-0002',
      clientName: 'Cliente 2',
      updatedAt: '2026-03-30T10:00:00.000Z'
    }
  ]
};

const mockCloudRows = [
  // 5 activas
  { id: 'uuid-1', tipo: 'informe_tecnico', deleted: false, updated_at: '2026-03-30T10:00:00.000Z', datos: { number: 'INF-2026-0001', clientName: 'Cliente 1' } },
  { id: 'uuid-2', tipo: 'informe_tecnico', deleted: false, updated_at: '2026-03-30T10:00:00.000Z', datos: { number: 'INF-2026-0002', clientName: 'Cliente 2' } },
  { id: 'uuid-3', tipo: 'informe_tecnico', deleted: false, updated_at: '2026-03-30T11:00:00.000Z', datos: { number: 'INF-2026-0003', clientName: 'Cliente 3' } },
  { id: 'uuid-4', tipo: 'informe_tecnico', deleted: false, updated_at: '2026-03-30T12:00:00.000Z', datos: { number: 'INF-2026-0004', clientName: 'Cliente 4' } },
  { id: 'uuid-5', tipo: 'informe_tecnico', deleted: false, updated_at: '2026-03-30T13:00:00.000Z', datos: { number: 'INF-2026-0005', clientName: 'Cliente 5' } },
  // 1 borrada con datos vacíos
  { id: 'uuid-6', tipo: 'informe_tecnico', deleted: true, updated_at: '2026-03-30T14:00:00.000Z', datos: {} }
];

const mockTombstones = {};

function mockRecordTombstone(id, tipo, datos = null) {
  mockTombstones[id] = {
    id,
    tipo,
    datos: (datos && Object.keys(datos).length > 0) ? { ...datos } : (mockTombstones[id]?.datos || {}),
    deleted: true,
    updated_at: new Date().toISOString()
  };
}

function mockApplyCloudRecordToLocal(cloudRec) {
  const { id, tipo, datos, deleted, updated_at } = cloudRec;
  if (deleted) {
    let existing = null;
    const idx = mockState.informeHistory.findIndex(h => h.id === id);
    if (idx >= 0) {
      existing = mockState.informeHistory[idx];
      mockState.informeHistory.splice(idx, 1);
    }
    mockRecordTombstone(id, tipo, (datos && Object.keys(datos).length > 0) ? datos : existing);
    return { success: true, action: 'deleted' };
  }

  if (!datos || typeof datos !== 'object' || Object.keys(datos).length === 0) {
    return { success: true, action: 'ignored_empty' };
  }

  const inf = {
    number: datos.number || 'INF-0000',
    clientName: datos.clientName || 'Cliente General',
    ...datos,
    id,
    updatedAt: updated_at
  };

  const idx = mockState.informeHistory.findIndex(h => h.id === id);
  if (idx >= 0) {
    mockState.informeHistory[idx] = inf;
  } else {
    mockState.informeHistory.push(inf);
  }
  return { success: true, action: 'applied' };
}

// Simular fusión
const cloudMap = new Map();
mockCloudRows.forEach(r => cloudMap.set(r.id, r));

const cloudActiveCount = mockCloudRows.filter(r => r.tipo === 'informe_tecnico' && !r.deleted).length;

const localMap = new Map();
mockState.informeHistory.forEach(inf => {
  localMap.set(inf.id, {
    id: inf.id,
    tipo: 'informe_tecnico',
    datos: { ...inf },
    deleted: false,
    updated_at: inf.updatedAt
  });
});

let uploadedCount = 0;
let downloadedCount = 0;
let identicalCount = 0;
const errors = [];

const allIds = new Set([...cloudMap.keys(), ...localMap.keys()]);

for (const id of allIds) {
  try {
    const localRec = localMap.get(id);
    const cloudRec = cloudMap.get(id);

    if (cloudRec && !localRec) {
      mockApplyCloudRecordToLocal(cloudRec);
      downloadedCount++;
    } else if (localRec && !cloudRec) {
      uploadedCount++;
    } else if (cloudRec && localRec) {
      const cloudTime = new Date(cloudRec.updated_at).getTime();
      const localTime = new Date(localRec.updated_at).getTime();
      const sameDeleted = Boolean(cloudRec.deleted) === Boolean(localRec.deleted);

      if (cloudTime === localTime && sameDeleted) {
        identicalCount++;
      } else if (cloudTime > localTime) {
        mockApplyCloudRecordToLocal(cloudRec);
        downloadedCount++;
      } else {
        uploadedCount++;
      }
    }
  } catch (err) {
    errors.push({ id, reason: err.message });
  }
}

const finalLocalActive = mockState.informeHistory.length;
const diagnosticText = `En este dispositivo: ${finalLocalActive} · En la nube: ${cloudActiveCount} (activos) · Subidos: ${uploadedCount} · Bajados: ${downloadedCount} · Ya iguales: ${identicalCount} · Con error: ${errors.length}`;

console.log('Diagnóstico generado:');
console.log(diagnosticText);

if (finalLocalActive !== 5) {
  console.error(`❌ Esperaba 5 informes activos pero obtuve ${finalLocalActive}`);
  process.exit(1);
}
if (cloudActiveCount !== 5) {
  console.error(`❌ Esperaba 5 informes activos en la nube pero obtuve ${cloudActiveCount}`);
  process.exit(1);
}
if (errors.length !== 0) {
  console.error('❌ Hubo errores en la fusión');
  process.exit(1);
}

// Probar borrado sin perder datos
console.log('--- TEST BORRADO SIN PERDER DATOS ---');
const itemToDelete = mockState.informeHistory[0];
mockRecordTombstone(itemToDelete.id, 'informe_tecnico', itemToDelete);
mockState.informeHistory.splice(0, 1);

const tombstone = mockTombstones[itemToDelete.id];
console.log('Tombstone creado:', tombstone);

if (!tombstone || tombstone.deleted !== true || !tombstone.datos || !tombstone.datos.clientName) {
  console.error('❌ El tombstone no conservó los datos al borrar');
  process.exit(1);
}

console.log('✅ Todos los escenarios de prueba pasaron exitosamente.');
