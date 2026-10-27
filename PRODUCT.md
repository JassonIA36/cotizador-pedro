# Product

<!-- impeccable:product-schema 1 -->

> Nota: redactado a partir de lo que Jasson contó durante el trabajo (no de una entrevista formal). Confirmar si algo cambió.

## Platform

web

## Users

Pedro Roa, técnico independiente de servicio (impresoras, computadores) en Colombia, que cotiza y cobra a sus propios clientes. Usa la app a ratos en un celular Android (en casa del cliente, de pie, con una mano) y a ratos en un PC (en su mesa). Es la herramienta de trabajo de todos los días, no un sitio que visita por curiosidad. Quien la mantiene es Jasson (Universo Gráfico).

## Product Purpose

Crear y guardar cotizaciones, cuentas de cobro e informes técnicos con la marca de Pedro, exportarlos a PDF y enviarlos por WhatsApp, y tener todo sincronizado entre celular y PC. Éxito: sacar una cotización lista para enviar en menos de un minuto en el celular y no perder nunca un documento.

## Positioning

Es un cotizador hecho a la medida de un técnico: catálogo propio de servicios y repuestos, formatos de PDF y texto legal de Pedro, consecutivos propios, y funciona sin internet y sincroniza después.

## Operating Context

- PWA publicada en GitHub Pages desde `main`; datos en el dispositivo (localStorage + copia en IndexedDB) y sincronizados con Supabase (tabla `registros`).
- Documentos: cotizaciones (COT-0001…), cuentas de cobro (consecutivo por cliente), informes técnicos con plantillas.
- Salidas: PDF (jsPDF) y mensaje de WhatsApp.
- Moneda COP; teléfonos colombianos (+57).

## Capabilities and Constraints

- No cambiar: el logo, el formato del PDF, el texto legal, las claves de almacenamiento (`pr_*`) ni los datos existentes.
- Debe funcionar sin conexión y en celulares Android de gama media.
- HTML/CSS/JS sin framework ni paso de compilación (se publica tal cual).
- Pruebas automáticas en `pruebas/` (Playwright) deben seguir pasando.

## Brand Commitments

Logo oficial de Pedro Roa (`assets/logo.png`). El resto de la identidad visual de la app NO es vinculante: el diseño actual (hecho con Antigravity) se considera genérico y se reemplaza.

## Evidence on Hand

Datos reales de Pedro viven en su Supabase y en sus dispositivos; no hay testimonios ni métricas públicas. No inventar clientes ni cifras.

## Product Principles

1. Rápido primero: lo más frecuente (nueva cotización, buscar una anterior, enviar) a un toque.
2. Nada se pierde y siempre se sabe: el estado de guardado y sincronización es visible y honesto.
3. Una sola mano en el celular: acciones principales al alcance del pulgar.
4. Un solo lugar para cada cosa (datos del negocio, catálogo, consecutivos).
5. Lenguaje de taller y oficio, en español claro, sin jerga de software.

## Accessibility & Inclusion

Contraste suficiente para uso a la luz del día al aire libre; objetivos táctiles amplios; texto en español de Colombia.
