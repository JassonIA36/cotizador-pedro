# Diseño del Cotizador Pedro Roa

Sistema visual «hoja de prueba de impresión»: papel blanco, tinta negra y las cuatro tintas de proceso
(cian, magenta, amarillo, negro). Pedro repara impresoras; la barra de control CMYK de una hoja de prueba es su firma.
Es una herramienta de trabajo diario (modo *Operate*): lo reconocible y rápido manda; la identidad vive en los detalles.

## Principios
1. Lo más frecuente a un toque: «Cotizar», historial, enviar por WhatsApp.
2. El estado se ve siempre: punto de color + la barra de tintas de la cabecera reflejan la sincronización.
3. Claro por defecto (se usa a pleno sol); oscuro opcional y recordado.
4. Una mano en el celular: navegación principal abajo, acciones grandes (≥44 px), campos de 16 px (no hacen zoom).
5. Sin emojis como interfaz: iconos SVG de trazo propios (`js/iconos.js`).

## Tokens (css/app.css, `:root` y `[data-theme="dark"]`)
- Tintas: `--ink-c` cian, `--ink-m` magenta, `--ink-y` amarillo, `--ink-k` negro.
- Color de marca/acción: `--primary` (cian oscuro #006fa6, contraste 5.5:1 sobre blanco). WhatsApp: `--whatsapp` (verde, solo para ese botón).
- Estados de documento: borrador = gris/negro, enviada = cian, aprobada/pagada = verde, rechazada = magenta, pendiente = amarillo.
- Superficies: `--bg-main`, `--bg-card-solid`, `--bg-sunken`, bordes `--border` / `--border-light`.
- Radios 6/10/14 px. Sin sombras decorativas ni brillos.

## Tipografía
- Atkinson Hyperlegible Next (texto) y Atkinson Hyperlegible Mono (cifras y números de documento), locales en `assets/fonts/`.
  Elegida por legibilidad al aire libre: el cero lleva barra y las letras ambiguas se distinguen.
- Escala: 12 / 13 / 15 / 17 / 18 / 22 / 28 px. Cifras tabulares en todo el cuerpo.

## Componentes
- Cabecera fija con barra CMYK de 3 px; pestañas del módulo pegadas debajo (subrayado, no cajas).
- Navegación principal: barra inferior de 4 módulos en el celular; fila de pestañas en pantallas ≥900 px.
- Tarjeta de historial: número (mono) + estado + total; acciones principales (Abrir, Ver PDF, WhatsApp) y «Más opciones».
- Avisos (toast) oscuros sobre la barra inferior; diálogos como hoja inferior en celular y centrados en escritorio.

## Movimiento (poco y con motivo)
Motion `animate` (≈9 KB, local): la barra CMYK se «imprime» al abrir, el inicio entra una vez, y una línea nueva de cotización aparece.
Presión de botones 100 ms; nada de lo que se usa cien veces al día se anima. Respeta «reducir movimiento».

## Lo que NO cambia
Logo, formato y colores del PDF, el «papel» de la vista previa (`css/documento.css`, violeta del PDF), texto legal, datos y claves `pr_*`.
