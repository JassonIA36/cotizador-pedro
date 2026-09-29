/**
 * Cotizador Pedro Roa - Motor de Generación y Compartición de PDF
 * Integración con jsPDF y jsPDF-AutoTable
 */

(function (window) {
  'use strict';

  function formatMoney(amount) {
    return '$' + Math.round(amount || 0).toLocaleString('es-CO');
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

    // 6. "LA SUMA DE:" centrado, en negrita
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('LA SUMA DE:', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // 7. El saldo en letras y número, en negrita y centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const amountText = data.saldoLetras || 'Cero pesos m/cte. ($0.oo)';
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

    // 9. Resumen de adelantos si los hay
    const adelantos = data.adelantos || [];
    if (adelantos.length > 0) {
      yPos += 2;
      const boxWidth = 92;
      const boxHeight = 20;
      const boxX = margin + 4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text('Total de conceptos:', boxX + 4, yPos + 5.5);
      doc.text(formatMoney(data.totals ? data.totals.totalConceptos : 0), boxX + boxWidth - 4, yPos + 5.5, { align: 'right' });

      doc.text('Menos adelantos / anticipos:', boxX + 4, yPos + 10.5);
      doc.text('-' + formatMoney(data.totals ? data.totals.totalAdelantos : 0), boxX + boxWidth - 4, yPos + 10.5, { align: 'right' });

      doc.setDrawColor(203, 213, 225);
      doc.line(boxX + 4, yPos + 13, boxX + boxWidth - 4, yPos + 13);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Saldo a cobrar:', boxX + 4, yPos + 17.5);
      doc.text(formatMoney(data.totals ? data.totals.saldo : 0), boxX + boxWidth - 4, yPos + 17.5, { align: 'right' });

      yPos += boxHeight + 4;
    } else {
      yPos += 2;
    }

    // 10. Texto legal (si está activado)
    if (data.includeLegal !== false && data.legalText) {
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(55, 65, 81);
      const paragraphs = data.legalText.split('\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const splitP = doc.splitTextToSize(p.trim(), contentWidth);
        doc.text(splitP, margin, yPos);
        yPos += (splitP.length * 3.3) + 1.2;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 2;
    }

    // 11. "Cordialmente,", la firma, el nombre, C.C., teléfono y dirección
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Cordialmente,', margin, yPos);
    yPos += 4;

    if (data.firma) {
      try {
        doc.addImage(data.firma, 'PNG', margin, yPos, 45, 14);
        yPos += 16;
      } catch (err) {
        console.warn('Could not add signature image to PDF:', err);
        yPos += 12;
      }
    } else {
      yPos += 12;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text(emisor.name || 'Pedro Luis Roa Mora', margin, yPos);
    yPos += 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`C.C. ${emisor.cc || '1.015.409.172'} de ${emisor.city || 'Bogotá'}`, margin, yPos);
    yPos += 4.2;
    doc.text(`Teléfono: ${emisor.phone || '3024555428'}`, margin, yPos);
    yPos += 4.2;
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
    previewPdfBlob,
    formatMoney
  };

})(window);
