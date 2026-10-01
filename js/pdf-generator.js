/**
 * Cotizador Pedro Roa - Motor de Generación y Compartición de PDF
 * Integración con jsPDF y jsPDF-AutoTable
 */

(function (window) {
  'use strict';

  function formatMoney(amount) {
    return '$' + Math.round(amount || 0).toLocaleString('es-CO');
  }

  // Conversión de números a letras en español según estándar legal colombiano
  function numeroALetras(num) {
    if (typeof window !== 'undefined' && typeof window.numeroALetras === 'function' && window.numeroALetras !== numeroALetras) {
      return window.numeroALetras(num);
    }
    num = Math.round(Number(num) || 0);
    const formattedNumber = num.toLocaleString('es-CO');
    if (num === 0) return 'Cero pesos m/cte. ($0.oo)';
    if (num < 0) return 'Menos ' + numeroALetras(-num);

    const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const DECENAS_10 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const VEINTES = ['veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    function seccionMenorMil(n) {
      if (n === 0) return '';
      if (n === 100) return 'cien';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;
      let res = '';
      if (c > 0) res += CENTENAS[c] + ' ';
      if (d === 1) {
        res += DECENAS_10[u];
      } else if (d === 2) {
        res += VEINTES[u];
      } else if (d > 2) {
        res += DECENAS[d];
        if (u > 0) res += ' y ' + UNIDADES[u];
      } else if (u > 0) {
        res += UNIDADES[u];
      }
      return res.trim();
    }

    function resolver(n) {
      const millones = Math.floor(n / 1000000);
      const restoMillones = n % 1000000;
      const miles = Math.floor(restoMillones / 1000);
      const unidades = restoMillones % 1000;

      const partes = [];
      if (millones > 0) {
        if (millones === 1) partes.push('un millón');
        else partes.push(seccionMenorMil(millones) + ' millones');
      }
      if (miles > 0) {
        if (miles === 1) partes.push('mil');
        else partes.push(seccionMenorMil(miles) + ' mil');
      }
      if (unidades > 0) {
        partes.push(seccionMenorMil(unidades));
      }
      return partes.join(' ');
    }

    const letras = resolver(num);
    const esDePesos = (num >= 1000000 && (num % 1000000 === 0));
    const sufijo = num === 1 ? 'peso m/cte.' : (esDePesos ? 'de pesos m/cte.' : 'pesos m/cte.');

    const resultado = `${letras} ${sufijo} ($${formattedNumber}.oo)`;
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  }

  if (typeof window !== 'undefined' && !window.numeroALetras) {
    window.numeroALetras = numeroALetras;
  }

  function createPdfDocument(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Palette Colors
    const primaryColor = [124, 58, 237]; // Violet #7c3aed
    const darkColor = [17, 24, 39];      // #111827
    const grayText = [107, 114, 128];    // #6b7280
    const lightBg = [249, 250, 251];     // #f9fafb
    const borderColor = [229, 231, 235]; // #e5e7eb

    // Top decorative bar
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 1. Logo
    let yPos = 14;
    const logoSize = 22;
    if (window.PEDRO_ROA_LOGO) {
      try {
        doc.addImage(window.PEDRO_ROA_LOGO, 'PNG', margin, yPos, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo image:', e);
      }
    }

    // 2. Business Information (Header Left)
    const textStartX = margin + logoSize + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(data.businessName || 'Pedro Roa', textStartX, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('Servicios Técnicos Especializados & Computadores', textStartX, yPos + 12);
    doc.text('WhatsApp / Tel: ' + (data.businessPhone || '+57 302 4555428'), textStartX, yPos + 17);

    // 3. Quotation Meta Box (Header Right)
    const metaBoxWidth = 65;
    const metaBoxX = pageWidth - margin - metaBoxWidth;
    
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(metaBoxX, yPos, metaBoxWidth, 23, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(data.quoteNumber || 'COT-0001', metaBoxX + (metaBoxWidth / 2), yPos + 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('Fecha: ' + (data.issueDate || 'Hoy'), metaBoxX + 6, yPos + 13);
    doc.text('Vence: ' + (data.expireDate || '15 días'), metaBoxX + 6, yPos + 19);

    yPos += 30;

    // 4. Client Info Card
    const clientBoxHeight = data.equipment ? 22 : 16;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), clientBoxHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('DATOS DEL CLIENTE', margin + 6, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('Cliente: ' + (data.clientName || 'Cliente General'), margin + 6, yPos + 12);
    doc.text('Teléfono / WhatsApp: ' + (data.clientPhone || 'No registrado'), (pageWidth / 2) + 6, yPos + 12);

    if (data.equipment) {
      doc.setFont('helvetica', 'bold');
      doc.text('Equipo / Falla: ', margin + 6, yPos + 18);
      doc.setFont('helvetica', 'normal');
      doc.text(data.equipment, margin + 32, yPos + 18);
    }

    yPos += clientBoxHeight + 8;

    // 5. Items Table (AutoTable)
    const tableColumns = [
      { header: 'DESCRIPCIÓN DEL SERVICIO / PRODUCTO', dataKey: 'desc' },
      { header: 'CANT.', dataKey: 'qty' },
      { header: 'VR. UNITARIO', dataKey: 'unit' },
      { header: 'SUBTOTAL', dataKey: 'total' }
    ];

    const tableRows = (data.items || []).map(item => ({
      desc: item.d || 'Servicio / Producto',
      qty: String(item.q || 1),
      unit: formatMoney(item.p || 0),
      total: formatMoney((item.q || 1) * (item.p || 0))
    }));

    if (tableRows.length === 0) {
      tableRows.push({
        desc: 'Sin ítems registrados',
        qty: '1',
        unit: '$0',
        total: '$0'
      });
    }

    doc.autoTable({
      startY: yPos,
      margin: { left: margin, right: margin },
      columns: tableColumns,
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor,
        cellPadding: 3.8
      },
      columnStyles: {
        desc: { cellWidth: 'auto' },
        qty: { cellWidth: 18, halign: 'center' },
        unit: { cellWidth: 32, halign: 'right' },
        total: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // 6. Totals Box & Notes Section
    const totalsWidth = 75;
    const totalsX = pageWidth - margin - totalsWidth;
    const totalsStartY = yPos;

    // Totals card
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    
    let totalsHeight = 24;
    if (data.discountAmount > 0) totalsHeight += 6;
    if (data.deliveryAmount > 0) totalsHeight += 6;
    if (data.taxAmount > 0) totalsHeight += 6;

    doc.roundedRect(totalsX, totalsStartY, totalsWidth, totalsHeight, 3, 3, 'FD');

    let currentTotalY = totalsStartY + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);

    // Subtotal
    doc.text('Subtotal:', totalsX + 6, currentTotalY);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(formatMoney(data.subtotal), totalsX + totalsWidth - 6, currentTotalY, { align: 'right' });

    // Descuento
    if (data.discountAmount > 0) {
      currentTotalY += 6;
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Descuento (' + (data.discountPercent || 0) + '%):', totalsX + 6, currentTotalY);
      doc.setTextColor(220, 38, 38);
      doc.text('-' + formatMoney(data.discountAmount), totalsX + totalsWidth - 6, currentTotalY, { align: 'right' });
    }

    // Domicilio
    if (data.deliveryAmount > 0) {
      currentTotalY += 6;
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('Domicilio / Visita:', totalsX + 6, currentTotalY);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('+' + formatMoney(data.deliveryAmount), totalsX + totalsWidth - 6, currentTotalY, { align: 'right' });
    }

    // IVA
    if (data.taxAmount > 0) {
      currentTotalY += 6;
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      doc.text('IVA 19%:', totalsX + 6, currentTotalY);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('+' + formatMoney(data.taxAmount), totalsX + totalsWidth - 6, currentTotalY, { align: 'right' });
    }

    // TOTAL Highlighted
    currentTotalY += 7;
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(totalsX + 3, currentTotalY - 4.5, totalsWidth - 6, 8, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX + 7, currentTotalY + 1.5);
    doc.text(formatMoney(data.total), totalsX + totalsWidth - 7, currentTotalY + 1.5, { align: 'right' });

    // Notes Box (Left of Totals)
    const notesWidth = totalsX - margin - 8;
    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('NOTAS Y CONDICIONES:', margin, totalsStartY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayText[0], grayText[1], grayText[2]);
      
      const splitNotes = doc.splitTextToSize(data.notes, notesWidth);
      doc.text(splitNotes, margin, totalsStartY + 10);
    }

    // 7. Footer
    const footerY = pageHeight - 14;
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('Pedro Roa · Soporte Técnico, Reparación y Computadores a Medida · WhatsApp: ' + (data.businessPhone || '+57 302 4555428'), pageWidth / 2, footerY, { align: 'center' });

    return doc;
  }

  // Generate File & Blob
  function generatePdfFile(data) {
    const doc = createPdfDocument(data);
    const sanitizedNumber = (data.quoteNumber || 'COT-0001').replace(/[^a-zA-Z0-9_-]/g, '');
    const clientSlug = (data.clientName || 'Cliente').replace(/\s+/g, '_').substring(0, 15);
    const fileName = `Cotizacion_${sanitizedNumber}_${clientSlug}.pdf`;
    
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });
    
    return { doc, blob, file, fileName };
  }

  // Download directly
  function downloadPdf(data) {
    const { doc, fileName } = generatePdfFile(data);
    doc.save(fileName);
  }

  // Shared helper to open PDF preview in a new window/tab (with mobile/popup fallback)
  function previewPdfBlob(blob) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 100);
    }
  }

  // Open Quote in preview
  function previewPdf(data) {
    const { blob } = generatePdfFile(data);
    previewPdfBlob(blob);
  }

  // ==========================================================================
  // CUENTAS DE COBRO - MOTOR DE GENERACIÓN PDF (TAMAÑO CARTA, 1 PÁGINA)
  // ==========================================================================
  function createCobroPdfDocument(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 215.9 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm
    const margin = 16;
    const contentWidth = pageWidth - (margin * 2);

    let yPos = 14;

    // 0. Logo Oficial Pedro Roa arriba (si está activado y existe)
    if (data.includeLogo !== false && window.PEDRO_ROA_LOGO) {
      try {
        const logoSize = 22;
        const logoX = (pageWidth - logoSize) / 2;
        doc.addImage(window.PEDRO_ROA_LOGO, 'PNG', logoX, yPos, logoSize, logoSize);
        yPos += logoSize + 5;
      } catch (e) {
        console.warn('Could not add logo image to Cuenta de Cobro:', e);
        yPos += 4;
      }
    } else {
      yPos += 4;
    }

    // 1. Ciudad y fecha (en negrita, alineado a la izquierda)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    const dateText = `${data.city || 'Bogotá'}, ${data.dateFormatted || ''}`;
    doc.text(dateText, margin, yPos);
    yPos += 9;

    // 2. "Cuenta de cobro 012" (centrado y en negrita)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cuenta de cobro ${data.cobroNumber || '001'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 9;

    // 3. Nombre de la empresa o cliente en letra grande y negrita, con "Nit." debajo. Centrado.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text(data.clientName || 'Cliente General', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(data.clientNit ? `Nit. ${data.clientNit}` : 'Nit. (Por registrar)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // 4. "DEBE A:" centrado, en negrita
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('DEBE A:', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // 5. Nombre de quien cobra en mayúsculas y "C.C. ... de Bogotá" debajo. Centrado
    const emisor = data.emisor || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text((emisor.name || 'PEDRO LUIS ROA MORA').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`C.C. ${emisor.cc || '1.015.409.172'} de ${emisor.city || 'Bogotá'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Totales calculados de forma segura para garantizar que aplique a cuentas nuevas e históricas
    let totalConceptos = 0;
    if (data.totals && typeof data.totals.totalConceptos === 'number') {
      totalConceptos = data.totals.totalConceptos;
    } else if (Array.isArray(data.conceptos)) {
      totalConceptos = data.conceptos.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    } else if (typeof data.total === 'number') {
      totalConceptos = data.total;
    }

    const adelantos = (data.adelantos || []).filter(a => (a.desc && a.desc.trim()) || (parseFloat(a.amount) > 0));
    let totalAdelantos = 0;
    if (data.totals && typeof data.totals.totalAdelantos === 'number') {
      totalAdelantos = data.totals.totalAdelantos;
    } else if (Array.isArray(adelantos)) {
      totalAdelantos = adelantos.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    }

    const saldo = (data.totals && typeof data.totals.saldo === 'number')
      ? data.totals.saldo
      : Math.max(0, totalConceptos - totalAdelantos);

    // 6. "LA SUMA DE:" centrado, en negrita
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('LA SUMA DE:', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // 7. El TOTAL de conceptos en letras y número, en negrita y centrado (sin descontar adelantos)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const amountText = (data.totalLetras) || numeroALetras(totalConceptos);
    const splitAmount = doc.splitTextToSize(amountText, contentWidth - 10);
    doc.text(splitAmount, pageWidth / 2, yPos, { align: 'center' });
    yPos += (splitAmount.length * 5) + 5;

    // 8. "Por concepto de:" y cada concepto como viñeta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Por concepto de:', margin, yPos);
    yPos += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const conceptos = data.conceptos && data.conceptos.length > 0 ? data.conceptos : [{ desc: 'Servicio técnico', amount: 0 }];
    conceptos.forEach(c => {
      const lineText = `•   ${c.desc || 'Servicio'} por ${formatMoney(c.amount || 0)}`;
      const splitLines = doc.splitTextToSize(lineText, contentWidth - 8);
      doc.text(splitLines, margin + 4, yPos);
      yPos += (splitLines.length * 4.8);
    });

    // 9. Resumen de adelantos si los hay (Total, Adelantos y Saldo a cobrar)
    if (adelantos.length > 0) {
      yPos += 2;
      const boxWidth = 92;
      const boxHeight = 25;
      const boxX = margin + 4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text('Total de conceptos:', boxX + 4, yPos + 5.5);
      doc.text(formatMoney(totalConceptos), boxX + boxWidth - 4, yPos + 5.5, { align: 'right' });

      doc.text('Menos adelantos / anticipos:', boxX + 4, yPos + 10.5);
      doc.text('-' + formatMoney(totalAdelantos), boxX + boxWidth - 4, yPos + 10.5, { align: 'right' });

      doc.setDrawColor(203, 213, 225);
      doc.line(boxX + 4, yPos + 13, boxX + boxWidth - 4, yPos + 13);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Saldo a cobrar:', boxX + 4, yPos + 17.5);
      doc.text(formatMoney(saldo), boxX + boxWidth - 4, yPos + 17.5, { align: 'right' });

      // Línea breve al final del resumen con el saldo a cobrar en letras
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      const saldoLetrasShort = numeroALetras(saldo);
      const splitSaldoLetras = doc.splitTextToSize(saldoLetrasShort, boxWidth - 8);
      doc.text(splitSaldoLetras[0] || saldoLetrasShort, boxX + boxWidth - 4, yPos + 22, { align: 'right' });

      yPos += boxHeight + 3;
    } else {
      yPos += 2;
    }

    // 9.5 Garantías y observaciones (si está activado y tiene texto)
    const notesClean = (typeof data.notes === 'string') ? data.notes.trim() : '';
    const hasNotes = (data.includeNotes !== false) && (notesClean.length > 0);
    if (hasNotes) {
      const isLongDoc = notesClean.length > 150 || (data.conceptos && data.conceptos.length > 2) || (data.adelantos && data.adelantos.length > 0);
      const notesFontSize = isLongDoc ? 7.6 : 8.5;
      const notesLineHeight = isLongDoc ? 3.4 : 3.9;

      doc.setDrawColor(203, 213, 225);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(notesFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text('Garantías y observaciones:', margin, yPos);
      yPos += 4.2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(notesFontSize);
      doc.setTextColor(55, 65, 81);

      const paragraphs = notesClean.split('\n');
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (trimmed) {
          const splitP = doc.splitTextToSize(trimmed, contentWidth);
          doc.text(splitP, margin, yPos);
          yPos += (splitP.length * notesLineHeight) + 0.8;
        } else {
          yPos += 2.2;
        }
      });
      doc.setTextColor(0, 0, 0);
      yPos += 2.5;
    }

    // 10. Texto legal (si está activado)
    if (data.includeLegal !== false && data.legalText) {
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3.5;

      const isTight = yPos > 215;
      const legalFontSize = isTight ? 6.6 : 7.2;
      const legalLineHeight = isTight ? 2.9 : 3.3;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(legalFontSize);
      doc.setTextColor(55, 65, 81);
      const paragraphs = data.legalText.split('\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const splitP = doc.splitTextToSize(p.trim(), contentWidth);
        doc.text(splitP, margin, yPos);
        yPos += (splitP.length * legalLineHeight) + 0.8;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 1.5;
    }

    // 11. "Cordialmente,", la firma, el nombre, C.C., teléfono y dirección
    const remainingForSign = pageHeight - yPos - margin;
    const isVeryCompact = remainingForSign < 38;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isVeryCompact ? 8.8 : 9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Cordialmente,', margin, yPos);
    yPos += isVeryCompact ? 3.2 : 4;

    if (data.firma) {
      try {
        const signH = isVeryCompact ? 10 : 14;
        const signW = isVeryCompact ? 36 : 45;
        doc.addImage(data.firma, 'PNG', margin, yPos, signW, signH);
        yPos += signH + 2;
      } catch (err) {
        console.warn('Could not add signature image to PDF:', err);
        yPos += isVeryCompact ? 8 : 12;
      }
    } else {
      yPos += isVeryCompact ? 7 : 11;
    }

    const nameSize = isVeryCompact ? 8.6 : 9.2;
    const infoSize = isVeryCompact ? 7.8 : 8.4;
    const infoSpacing = isVeryCompact ? 3.5 : 4.0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameSize);
    doc.text(emisor.name || 'Pedro Luis Roa Mora', margin, yPos);
    yPos += infoSpacing;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(infoSize);
    doc.text(`C.C. ${emisor.cc || '1.015.409.172'} de ${emisor.city || 'Bogotá'}`, margin, yPos);
    yPos += infoSpacing;
    doc.text(`Teléfono: ${emisor.phone || '3024555428'}`, margin, yPos);
    yPos += infoSpacing;
    doc.text(`Dirección: ${emisor.address || 'Carrera 70g 78a-80'}`, margin, yPos);

    return doc;
  }

  // Generate Cuenta de Cobro File & Blob
  function generateCobroPdfFile(data) {
    const doc = createCobroPdfDocument(data);
    const sanitizedNumber = String(data.cobroNumber || '001').padStart(3, '0');
    const clientSlug = (data.clientName || 'Cliente').replace(/\s+/g, '_').substring(0, 15);
    const fileName = `CuentaDeCobro_${sanitizedNumber}_${clientSlug}.pdf`;

    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });

    return { doc, blob, file, fileName };
  }

  // Download Cuenta de Cobro PDF directly
  function downloadCobroPdf(data) {
    const { doc, fileName } = generateCobroPdfFile(data);
    doc.save(fileName);
  }

  // Open Cuenta de Cobro in browser PDF preview
  function previewCobroPdf(data) {
    const { blob } = generateCobroPdfFile(data);
    previewPdfBlob(blob);
  }

  // Share Cuenta de Cobro via WhatsApp with PDF
  async function shareCobroPdfViaWhatsApp(data, onDesktopFallback) {
    const { file, fileName, doc } = generateCobroPdfFile(data);
    const messageText = data.fullMessageText || '';

    // 1. Mobile Native Web Share API with Files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Cuenta de Cobro ${data.cobroNumber} - Pedro Roa`,
          text: messageText
        });
        return { success: true, method: 'native-share' };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('Web Share API failed, falling back:', err);
      }
    }

    // 2. Desktop or Browser without file sharing support: download PDF and open WhatsApp
    doc.save(fileName);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    if (typeof onDesktopFallback === 'function') {
      onDesktopFallback(fileName);
    }

    return { success: true, method: 'download-and-chat', fileName };
  }

  // Share via WhatsApp with PDF (Quote)
  async function sharePdfViaWhatsApp(data, onDesktopFallback) {
    const { file, fileName, doc } = generatePdfFile(data);
    
    // Normalize client phone: prioritize clientPhoneFull or sanitize digits
    let phone = data.clientPhoneFull || (data.clientPhone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '57' + phone;

    // Comprehensive WhatsApp message with full quote details
    const messageText = data.fullMessageText || (
      `📄 *Cotización ${data.quoteNumber || 'Formal'} - ${data.businessName || 'Pedro Roa'}*\n` +
      `Hola *${data.clientName || 'estimado cliente'}*, adjunto encontrarás el documento formal en PDF con los detalles y costos de tu cotización.\n\n` +
      `💰 *Total:* ${formatMoney(data.total)}\n` +
      `📅 *Válida hasta:* ${data.expireDate || '15 días'}\n\n` +
      `Quedo atento a cualquier inquietud. ¡Gracias por confiar en nuestros servicios!`
    );

    // 1. Mobile Native Web Share API with Files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Cotización ${data.quoteNumber} - Pedro Roa`,
          text: messageText
        });
        return { success: true, method: 'native-share' };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('Web Share API failed, falling back:', err);
      }
    }

    // 2. Desktop or Browser without file sharing support
    // Download the PDF automatically
    doc.save(fileName);

    // Open WhatsApp with universal endpoint
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    if (typeof onDesktopFallback === 'function') {
      onDesktopFallback(fileName);
    }

    return { success: true, method: 'download-and-chat', fileName };
  }

  // ==========================================================================
  // INFORMES TÉCNICOS - MOTOR DE GENERACIÓN PDF (TAMAÑO CARTA, MULTI-PÁGINA)
  // Modelo idéntico al informe diagnóstico Epson EcoTank L565
  // ==========================================================================

  function formatMoneyCop(amount) {
    return '$' + Math.round(amount || 0).toLocaleString('es-CO') + ' COP';
  }

  function createInformePdfDocument(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 215.9 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm
    const margin = 16;
    const contentWidth = pageWidth - (margin * 2);

    let yPos = 16;

    function checkPageBreak(neededHeight) {
      if (yPos + neededHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 26;
        return true;
      }
      return false;
    }

    // Fila 1: Logo a la izquierda (máx 60px / 16mm) y etiqueta a la derecha
    // Si el logo está desactivado, no ocupa espacio.
    const headerTag = (data.headerTag || 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO').toUpperCase();
    const hasLogo = (data.includeLogo !== false) && !!window.PEDRO_ROA_LOGO;

    if (hasLogo) {
      try {
        const logoSize = 16; // 16mm ≈ 60px
        doc.addImage(window.PEDRO_ROA_LOGO, 'PNG', margin, yPos, logoSize, logoSize);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(14, 116, 144); // #0e7490
        doc.text(headerTag, pageWidth - margin, yPos + 8.5, { align: 'right' });
        
        // Margen al siguiente bloque de al menos 16px (6mm ≈ 23px)
        yPos += logoSize + 6;
      } catch (e) {
        console.warn('Could not add logo image to Informe:', e);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(14, 116, 144);
        doc.text(headerTag, pageWidth - margin, yPos + 4, { align: 'right' });
        yPos += 10;
      }
    } else {
      // Logo desactivado: no ocupa espacio
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(14, 116, 144);
      doc.text(headerTag, pageWidth - margin, yPos + 4, { align: 'right' });
      yPos += 10; // Margen de separación hacia el título
    }

    // Bloque 2: Título Principal y Subtítulo (debajo con margen superior >= 16px)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // #0f172a
    const titleText = data.title || 'INFORME TÉCNICO';
    doc.text(titleText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5.5;

    // Número de informe opcional en encabezado
    const numToDisplay = (data.showNumber && data.number) 
      ? data.number 
      : ((data.showNumberInDoc && data.informeNumber) ? `N° ${data.informeNumber}` : '');
    if (numToDisplay) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(2, 132, 199); // #0284c7
      doc.text(numToDisplay, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4.5;
    }

    // Subtítulo
    if (data.subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      const splitSub = doc.splitTextToSize(data.subtitle, contentWidth - 10);
      doc.text(splitSub, pageWidth / 2, yPos, { align: 'center' });
      yPos += (splitSub.length * 4.8) + 4;
    } else {
      yPos += 3;
    }

    // 4. Ficha del informe (Caja con fondo gris azulado suave #f1f5f9)
    checkPageBreak(36);
    const fichaStartY = yPos;
    const fichaPadding = 4.5;
    const colWidth = (contentWidth - 8) / 2;

    const clientVal = (data.clientName || 'Cliente General') + (data.clientNit ? ` NIT: ${data.clientNit}` : '');
    const equipVal = (data.equipment || 'Equipo evaluado') + (data.serial ? ` (Serial: ${data.serial})` : '');
    const dateVal = data.reportDateFormatted || 'Hoy';
    const fallaVal = data.falla || 'Diagnóstico general';
    const serviceVal = data.serviceType || 'Inspección y diagnóstico técnico';

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const splitClient = doc.splitTextToSize(clientVal, contentWidth - 8);
    const splitEquip = doc.splitTextToSize(equipVal, colWidth);
    const splitDate = doc.splitTextToSize(dateVal, colWidth);
    const splitFalla = doc.splitTextToSize(fallaVal, colWidth);
    const splitService = doc.splitTextToSize(serviceVal, colWidth);

    const clientBlockH = 4.5 + (splitClient.length * 4.2);
    const row2H = 4.5 + Math.max(splitEquip.length, splitDate.length) * 4.2;
    const row3H = 4.5 + Math.max(splitFalla.length, splitService.length) * 4.2;
    const fichaHeight = clientBlockH + row2H + row3H + (fichaPadding * 2) + 2;

    doc.setFillColor(241, 245, 249); // #f1f5f9
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.roundedRect(margin, fichaStartY, contentWidth, fichaHeight, 2.5, 2.5, 'FD');

    let curFichaY = fichaStartY + fichaPadding + 3.5;

    // Fila 1: CLIENTE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENTE', margin + 4, curFichaY);
    curFichaY += 3.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(splitClient, margin + 4, curFichaY);
    curFichaY += (splitClient.length * 4.2) + 2.5;

    // Fila 2: EQUIPO EVALUADO (Izq) | FECHA DEL INFORME (Der)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('EQUIPO EVALUADO', margin + 4, curFichaY);
    doc.text('FECHA DEL INFORME', margin + 4 + colWidth + 6, curFichaY);
    curFichaY += 3.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(splitEquip, margin + 4, curFichaY);
    doc.text(splitDate, margin + 4 + colWidth + 6, curFichaY);
    curFichaY += Math.max(splitEquip.length, splitDate.length) * 4.2 + 2.5;

    // Fila 3: FALLA REPORTADA (Izq) | TIPO DE SERVICIO (Der)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('FALLA REPORTADA', margin + 4, curFichaY);
    doc.text('TIPO DE SERVICIO', margin + 4 + colWidth + 6, curFichaY);
    curFichaY += 3.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(splitFalla, margin + 4, curFichaY);
    doc.text(splitService, margin + 4 + colWidth + 6, curFichaY);

    yPos = fichaStartY + fichaHeight + 7;

    // 5. Secciones numeradas (recalculadas dinámicamente)
    let secCounter = 1;
    const sections = Array.isArray(data.sections) ? data.sections : [];

    sections.forEach(sec => {
      if (sec.included === false) return;

      checkPageBreak(18);

      const secTitleText = `${secCounter}. ${sec.title || 'Sección'}`;
      secCounter++;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(secTitleText, margin, yPos);
      yPos += 5.5;

      if (sec.type === 'verificaciones') {
        const items = Array.isArray(sec.items) ? sec.items : [];
        items.forEach(it => {
          checkPageBreak(14);
          doc.setFontSize(8.8);
          doc.setTextColor(15, 23, 42);

          const bullet = '•  ';
          const title = (it.title || 'Verificación') + ': ';
          const desc = it.desc || '';

          const fullText = `${bullet}${title}${desc}`;
          const splitLines = doc.splitTextToSize(fullText, contentWidth - 4);

          doc.text(splitLines, margin + 2, yPos);
          yPos += (splitLines.length * 4.4) + 1.8;
        });
        yPos += 2;

      } else if (sec.type === 'propuesta') {
        if (sec.content) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.8);
          doc.setTextColor(30, 41, 59);
          const paras = String(sec.content).split('\n').filter(p => p.trim());
          paras.forEach(p => {
            const splitP = doc.splitTextToSize(p.trim(), contentWidth);
            checkPageBreak((splitP.length * 4.4) + 2);
            doc.text(splitP, margin, yPos);
            yPos += (splitP.length * 4.4) + 2.5;
          });
          yPos += 2;
        }

        const propuestaItems = Array.isArray(sec.propuestaItems) ? sec.propuestaItems : [];
        if (propuestaItems.length > 0) {
          checkPageBreak(25);

          const tableRows = propuestaItems.map(pi => [
            pi.desc || 'Trabajo técnico propuesto',
            formatMoneyCop(pi.valor || 0)
          ]);

          let totalPropuesta = propuestaItems.reduce((acc, pi) => acc + (parseFloat(pi.valor) || 0), 0);

          if (propuestaItems.length > 1) {
            tableRows.push([
              { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
              { content: formatMoneyCop(totalPropuesta), styles: { fontStyle: 'bold', halign: 'right' } }
            ]);
          }

          doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['TRABAJO PROPUESTO', 'VALOR']],
            body: tableRows,
            theme: 'plain',
            headStyles: {
              fillColor: [15, 41, 66], // #0f2942
              textColor: [255, 255, 255],
              fontSize: 8.5,
              fontStyle: 'bold',
              cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }
            },
            columnStyles: {
              0: { cellWidth: 'auto', halign: 'left' },
              1: { cellWidth: 44, halign: 'right', fontStyle: 'bold' }
            },
            bodyStyles: {
              fontSize: 8.8,
              textColor: [15, 23, 42],
              cellPadding: { top: 3.8, bottom: 3.8, left: 4, right: 4 }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            }
          });

          yPos = doc.lastAutoTable.finalY + 6;
        }

      } else if (sec.type === 'observaciones') {
        const bullets = Array.isArray(sec.bulletItems)
          ? sec.bulletItems
          : (String(sec.content || '').split('\n').filter(b => b.trim()));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(30, 41, 59);

        bullets.forEach(b => {
          const cleanB = String(b).replace(/^[•\-\*]\s*/, '').trim();
          if (!cleanB) return;
          const lineText = `•  ${cleanB}`;
          const splitLines = doc.splitTextToSize(lineText, contentWidth - 4);
          checkPageBreak((splitLines.length * 4.4) + 1.5);
          doc.text(splitLines, margin + 2, yPos);
          yPos += (splitLines.length * 4.4) + 1.8;
        });
        yPos += 2;

      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(30, 41, 59);
        const paras = String(sec.content || '').split('\n').filter(p => p.trim());
        paras.forEach(p => {
          const splitP = doc.splitTextToSize(p.trim(), contentWidth);
          checkPageBreak((splitP.length * 4.4) + 2);
          doc.text(splitP, margin, yPos);
          yPos += (splitP.length * 4.4) + 2.5;
        });
        yPos += 2;
      }
    });

    // 6. Caja final ELABORADO POR (fondo gris azulado #f1f5f9)
    checkPageBreak(38);

    const signBoxY = yPos + 2;
    const signBoxH = 34;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, signBoxY, contentWidth, signBoxH, 2.5, 2.5, 'FD');

    const elab = data.elaboradoPor || {};
    let leftY = signBoxY + 6;

    // Columna Izquierda: Datos del elaborador
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('ELABORADO POR', margin + 5, leftY);
    leftY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(elab.name || 'Pedro Luis Roa Mora', margin + 5, leftY);
    leftY += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(elab.cargo || 'Técnico de mantenimiento de equipos de cómputo', margin + 5, leftY);
    leftY += 4.0;
    doc.text(`Correo: ${elab.correo || 'pedrolroam@hotmail.com'}`, margin + 5, leftY);
    leftY += 4.0;
    doc.text(`Celular: ${elab.celular || '302 455 5428'}`, margin + 5, leftY);

    // Columna Derecha: Firma y Fecha
    const rightColX = margin + (contentWidth / 2) + 12;
    let rightY = signBoxY + 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text('Firma:', rightColX, rightY + 9);

    if (data.includeFirma !== false && elab.firma) {
      try {
        const fw = 38;
        const fh = 13;
        doc.addImage(elab.firma, 'PNG', rightColX + 12, rightY, fw, fh);
      } catch (err) {
        console.warn('Could not add signature image to Informe PDF:', err);
      }
    }
    doc.setDrawColor(148, 163, 184);
    doc.line(rightColX + 11, rightY + 12, rightColX + 68, rightY + 12);

    rightY += 19;
    doc.text(`Fecha: ${elab.fecha || data.reportDateFormatted || 'Hoy'}`, rightColX, rightY);

    // 7. Post-proceso: Dibujar encabezado y pie de página en páginas correspondientes
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // El encabezado repetido solo se dibuja en páginas 2 en adelante
      // (la página 1 ya incluye el encabezado unificado en la primera fila con el logo)
      if (p > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(14, 116, 144); // #0e7490
        const headerTag = (data.headerTag || 'SERVICIO TÉCNICO · INFORME DE DIAGNÓSTICO').toUpperCase();
        doc.text(headerTag, pageWidth - margin, 12, { align: 'right' });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const equipFooter = data.equipment ? `Informe técnico · ${data.equipment}` : 'Informe técnico';
      doc.text(equipFooter, pageWidth / 2, pageHeight - 9, { align: 'center' });
    }

    return doc;
  }

  // Generate Informe File & Blob
  function generateInformePdfFile(data) {
    const doc = createInformePdfDocument(data);
    const sanitizedNumber = (data.informeNumber || 'INF-0001').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `InformeTecnico_${sanitizedNumber}_${clientSlug}.pdf`;

    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });

    return { doc, blob, file, fileName };
  }

  // Download Informe PDF directly
  function downloadInformePdf(data) {
    const { doc, fileName } = generateInformePdfFile(data);
    doc.save(fileName);
  }

  // Open Informe in preview
  function previewInformePdf(data) {
    const { blob } = generateInformePdfFile(data);
    previewPdfBlob(blob);
  }

  // Share Informe via WhatsApp with PDF
  async function shareInformePdfViaWhatsApp(data, onDesktopFallback) {
    const { file, fileName, doc } = generateInformePdfFile(data);
    const messageText = data.fullMessageText || '';

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Informe Técnico ${data.informeNumber || ''} - Pedro Roa`,
          text: messageText
        });
        return { success: true, method: 'native-share' };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('Web Share API failed, falling back:', err);
      }
    }

    doc.save(fileName);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');

    if (typeof onDesktopFallback === 'function') {
      onDesktopFallback(fileName);
    }

    return { success: true, method: 'download-and-chat', fileName };
  }

  // Export to window
  window.PedroRoaPdf = {
    createPdfDocument,
    generatePdfFile,
    downloadPdf,
    previewPdf,
    sharePdfViaWhatsApp,
    createCobroPdfDocument,
    generateCobroPdfFile,
    downloadCobroPdf,
    previewCobroPdf,
    shareCobroPdfViaWhatsApp,
    createInformePdfDocument,
    generateInformePdfFile,
    downloadInformePdf,
    previewInformePdf,
    shareInformePdfViaWhatsApp,
    previewPdfBlob,
    formatMoney,
    formatMoneyCop,
    numeroALetras
  };

})(window);
