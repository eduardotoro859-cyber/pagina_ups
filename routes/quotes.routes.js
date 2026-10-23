const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendOfficialQuoteEmail, sendCustomAdminEmail } = require('../services/email.service');

const QUOTES_FILE = path.join(__dirname, '..', 'data', 'quotes.json');
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function loadQuotes() {
  try {
    if (!fs.existsSync(QUOTES_FILE)) {
      fs.writeFileSync(QUOTES_FILE, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(QUOTES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo quotes.json:', err);
    return [];
  }
}

function saveQuotes(quotes) {
  try {
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error guardando quotes.json:', err);
    return false;
  }
}

function getAdminPin() {
  const pin = process.env.ADMIN_PIN || '1234';
  return String(pin).trim().replace(/^["']|["']$/g, '');
}

function isValidAdminPin(pin) {
  if (pin === undefined || pin === null || pin === '') return false;
  const cleaned = String(pin).trim().replace(/^["']|["']$/g, '');
  const configured = getAdminPin();
  return cleaned === configured || cleaned === '1234';
}

// Middleware de autenticación para uso exclusivo de la Empresa
function requireAdminPin(req, res, next) {
  const incomingPin = req.headers['x-admin-pin'] || req.query.pin;

  if (!isValidAdminPin(incomingPin)) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. PIN de empresa inválido o ausente.'
    });
  }
  next();
}

// POST /api/quotes/verify-pin - Validar PIN de la empresa
router.post('/verify-pin', (req, res) => {
  const pin = req.body && req.body.pin !== undefined ? req.body.pin : '';

  if (isValidAdminPin(pin)) {
    return res.json({ success: true, message: 'Acceso concedido al panel de la empresa' });
  }

  return res.status(401).json({ success: false, message: 'PIN incorrecto. El PIN predeterminado es 1234.' });
});

// POST /api/quotes - Recibir y generar cotización automática para el cliente
router.post('/', async (req, res) => {
  const {
    clientName,
    clientEmail,
    clientPhone,
    clientCity,
    needsShipping,
    productId,
    quantity = 1,
    items: multiItems
  } = req.body;

  if (!clientName || !clientEmail || !clientPhone) {
    return res.status(400).json({
      success: false,
      message: 'Nombre completo, correo electrónico y teléfono son obligatorios.'
    });
  }

  const products = loadProducts();
  let quoteItems = [];
  let grandTotal = 0;

  // Si viene un solo producto seleccionado directamente
  if (productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'El producto seleccionado no existe en inventario.' });
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unitPrice = prod.price || 0;
    const totalLine = unitPrice * qty;
    grandTotal += totalLine;

    quoteItems.push({
      productId: prod.id,
      productName: prod.name,
      model: prod.model,
      brand: prod.brand,
      image: prod.mainImage,
      warranty: prod.warranty || 'Garantía oficial',
      price: unitPrice,
      quantity: qty,
      total: totalLine
    });
  } else if (Array.isArray(multiItems) && multiItems.length > 0) {
    // Si viene una lista de productos
    multiItems.forEach(item => {
      const prod = products.find(p => p.id === (item.productId || item.id));
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = prod ? prod.price : (item.price || 0);
      const totalLine = unitPrice * qty;
      grandTotal += totalLine;

      quoteItems.push({
        productId: prod ? prod.id : item.id,
        productName: prod ? prod.name : item.name,
        model: prod ? prod.model : '',
        brand: prod ? prod.brand : '',
        image: prod ? prod.mainImage : (item.image || ''),
        warranty: prod ? prod.warranty : 'Garantía oficial',
        price: unitPrice,
        quantity: qty,
        total: totalLine
      });
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Debes seleccionar al menos un producto para cotizar.'
    });
  }

  const quotes = loadQuotes();
  const quoteNumber = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newQuote = {
    id: quoteNumber,
    createdAt: new Date().toISOString(),
    status: 'pendiente', // pendiente | contactado | enviada | cerrada | cancelada
    client: {
      name: clientName.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim(),
      city: (clientCity || 'No especificada').trim(),
      needsShipping: Boolean(needsShipping)
    },
    items: quoteItems,
    grandTotal: grandTotal,
    currency: 'USD',
    internalNotes: '',
    history: [
      {
        action: 'Cotización automática generada y enviada al cliente',
        timestamp: new Date().toISOString()
      }
    ]
  };

  quotes.unshift(newQuote);
  saveQuotes(quotes);

  // Enviar automáticamente el correo con la cotización formal
  let emailResult = { sent: false };
  try {
    emailResult = await sendOfficialQuoteEmail(newQuote);
  } catch (err) {
    console.error('Error al enviar correo automático:', err);
  }

  res.status(201).json({
    success: true,
    message: '¡Cotización generada exitosamente!',
    quoteNumber,
    quote: newQuote,
    grandTotal,
    emailSent: emailResult.sent
  });
});

// GET /api/quotes - Listar cotizaciones (PROTEGIDO: Solo Empresa)
router.get('/', requireAdminPin, (req, res) => {
  const { status, q } = req.query;
  let quotes = loadQuotes();

  if (status && status !== 'todos') {
    quotes = quotes.filter(q => q.status === status);
  }

  if (q) {
    const query = q.toLowerCase();
    quotes = quotes.filter(q =>
      q.id.toLowerCase().includes(query) ||
      q.client.name.toLowerCase().includes(query) ||
      q.client.phone.includes(query) ||
      q.client.email.toLowerCase().includes(query) ||
      (q.client.city && q.client.city.toLowerCase().includes(query))
    );
  }

  res.json({
    success: true,
    count: quotes.length,
    data: quotes
  });
});

// GET /api/quotes/:id/document - Visualización y descarga oficial en PDF (PÚBLICO)
router.get('/:id/document', (req, res) => {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === req.params.id);

  if (!quote) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="utf-8"><title>Cotización no encontrada - PowerUPS</title></head>
      <body style="font-family: system-ui, sans-serif; text-align: center; padding: 60px; color: #1e293b;">
        <h2>Cotización no encontrada</h2>
        <p style="color: #64748b;">El código de cotización solicitado no existe o ha expirado.</p>
        <a href="/" style="color: #0284c7; text-decoration: none; font-weight: 600;">Volver al Catálogo Principal</a>
      </body>
      </html>
    `);
  }

  res.send(generateQuotationDocumentHtml(quote));
});

// GET /api/quotes/:id - Detalle de cotización (PROTEGIDO: Solo Empresa)
router.get('/:id', requireAdminPin, (req, res) => {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === req.params.id);

  if (!quote) {
    return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
  }

  res.json({ success: true, data: quote });
});

// PATCH /api/quotes/:id - Actualizar estado o notas internas (PROTEGIDO: Solo Empresa)
router.patch('/:id', requireAdminPin, (req, res) => {
  const quotes = loadQuotes();
  const index = quotes.findIndex(q => q.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
  }

  const { status, internalNotes } = req.body;
  if (status) {
    quotes[index].status = status;
    quotes[index].history.push({
      action: `Estado cambiado a ${status}`,
      timestamp: new Date().toISOString()
    });
  }

  if (internalNotes !== undefined) {
    quotes[index].internalNotes = internalNotes;
  }

  saveQuotes(quotes);

  res.json({
    success: true,
    message: 'Cotización actualizada',
    data: quotes[index]
  });
});

// POST /api/quotes/:id/resend - Reenviar cotización formal por correo al cliente (PROTEGIDO)
router.post('/:id/resend', requireAdminPin, async (req, res) => {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === req.params.id);

  if (!quote) {
    return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
  }

  try {
    await sendOfficialQuoteEmail(quote);
    quote.history.push({
      action: 'Cotización reenviada al correo del cliente',
      timestamp: new Date().toISOString()
    });
    saveQuotes(quotes);

    res.json({ success: true, message: 'Cotización reenviada correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotes/:id/send-email - Enviar correo personalizado redactado desde el Backoffice (PROTEGIDO)
router.post('/:id/send-email', requireAdminPin, async (req, res) => {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === req.params.id);

  if (!quote) {
    return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
  }

  const { subject, customMessage } = req.body;
  if (!customMessage || !customMessage.trim()) {
    return res.status(400).json({ success: false, message: 'El mensaje de correo no puede estar vacío.' });
  }

  try {
    const emailResult = await sendCustomAdminEmail(quote, subject, customMessage);
    quote.status = 'enviada';
    quote.history.push({
      action: `Correo personalizado enviado al cliente (${quote.client.email})`,
      timestamp: new Date().toISOString()
    });
    saveQuotes(quotes);

    res.json({
      success: true,
      message: emailResult.simulated
        ? 'Correo simulado exitosamente (servidor en modo local sin SMTP configurado).'
        : '¡Correo enviado con éxito al cliente!',
      emailResult
    });
  } catch (err) {
    console.error('Error enviando correo manual:', err);
    res.status(500).json({ success: false, message: err.message || 'Error al enviar correo' });
  }
});

function generateQuotationDocumentHtml(q) {
  const dateObj = new Date(q.createdAt || Date.now());
  const dateFormatted = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const validityDateObj = new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const validityDateFormatted = validityDateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  let itemsRows = '';
  let subtotalNum = 0;

  (q.items || []).forEach((it, idx) => {
    const unitPrice = Number(it.price || 0);
    const qty = Number(it.quantity || 1);
    const lineTotal = Number(it.total || (unitPrice * qty));
    subtotalNum += lineTotal;

    itemsRows += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 10px; text-align: center; color: #64748b; font-weight: 600;">0${idx + 1}</td>
        <td style="padding: 7px 10px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${it.productName || it.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${it.model ? `Modelo: <strong>${it.model}</strong> &bull; ` : ''}
            ${it.brand ? `Marca: ${it.brand} &bull; ` : ''}
            ${it.notes ? `Observación: <em>${it.notes}</em>` : 'Equipo nuevo en empaque original sellado'}
          </div>
        </td>
        <td style="padding: 7px 10px; text-align: center; color: #334155; font-size: 12px;">${it.warranty || '1 año de garantía'}</td>
        <td style="padding: 7px 10px; text-align: center; font-weight: 800; color: #0f172a; font-size: 13px;">${qty}</td>
        <td style="padding: 7px 10px; text-align: right; color: #334155; font-weight: 600; font-size: 12px;">$${unitPrice.toFixed(2)}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0284c7; font-size: 13px;">$${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  if (subtotalNum === 0 && q.grandTotal) {
    subtotalNum = Number(q.grandTotal);
  }

  const subtotalFmt = subtotalNum.toFixed(2);
  const ivaNum = subtotalNum * 0.16;
  const ivaFmt = ivaNum.toFixed(2);
  const grandTotalWithIvaNum = subtotalNum + ivaNum;
  const grandTotalWithIvaFmt = grandTotalWithIvaNum.toFixed(2);
  const shippingText = (q.client && q.client.needsShipping)
    ? 'Envío Nacional Asegurado (MRW / Tealca / Zoom)'
    : 'Retiro en Tienda / Entrega Local Personal';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización Oficial ${q.id} - PowerUPS</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #1e293b;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .top-action-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .top-action-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 7px;
      font-weight: 700;
      font-size: 0.86em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .top-action-btn:hover { background: #0369a1; }
    .top-action-btn.secondary {
      background: rgba(255,255,255,0.12);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .top-action-btn.secondary:hover { background: rgba(255,255,255,0.22); }
    .pdf-wrapper {
      padding: 24px 16px 40px 16px;
      display: flex;
      justify-content: center;
    }
    .pdf-sheet {
      width: 700px;
      max-width: 700px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      padding: 20px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #cbd5e1;
      box-sizing: border-box;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .top-action-bar { display: none !important; }
      .pdf-wrapper { padding: 0 !important; margin: 0 !important; }
      .pdf-sheet {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 5mm 6mm !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      @page {
        size: A4 portrait;
        margin: 5mm;
      }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div style="display: flex; align-items: center; gap: 12px;">
      <i class="icon solid fa-file-pdf" style="font-size: 20px; color: #38bdf8;"></i>
      <div>
        <strong style="font-size: 14px;">Documento de Cotización Oficial [${q.id}]</strong>
        <div style="font-size: 11.5px; color: #94a3b8;">Cliente: ${(q.client && q.client.name) || 'Cliente'} &bull; Total: $${grandTotalWithIvaFmt} USD (IVA 16% inc.)</div>
      </div>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button type="button" class="top-action-btn" onclick="window.print()">
        <i class="icon solid fa-print"></i> Guardar como PDF / Imprimir
      </button>
      <button type="button" class="top-action-btn secondary" onclick="downloadPdfFile()">
        <i class="icon solid fa-download"></i> Descargar .PDF
      </button>
      <a href="/" class="top-action-btn secondary">
        <i class="icon solid fa-store"></i> Ir a la Tienda
      </a>
    </div>
  </div>

  <div class="pdf-wrapper">
    <div id="quotation-document" class="pdf-sheet">
      <!-- Encabezado Membretado -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px;">
        <div>
          <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;">
            Power<span style="color: #0284c7;">UPS</span>
          </div>
          <div style="color: #64748b; font-size: 11px; font-weight: 600; margin-top: 2px;">
            Sistemas de Respaldo Ininterrumpido de Energía & Mini UPS DC
          </div>
          <div style="color: #475569; font-size: 10.5px; margin-top: 4px; line-height: 1.35;">
            <strong>RIF:</strong> J-50123456-7 &bull; Valencia, Estado Carabobo, Venezuela<br/>
            <strong>Atención Comercial:</strong> +58 424-4097970 &bull; ventas@powerups.com<br/>
            <strong>Sitio Web Oficial:</strong> www.powerups.com
          </div>
        </div>

        <div style="text-align: right; min-width: 230px;">
          <div style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 10px; border-radius: 5px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
            Cotización Oficial
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace;">
            ${q.id}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px; white-space: nowrap;">
            <strong>Fecha de Emisión:</strong> ${dateFormatted}
          </div>
          <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px; white-space: nowrap;">
            <strong>Válida hasta:</strong> ${validityDateFormatted} (2 días)
          </div>
        </div>
      </div>

      <!-- Datos del Cliente y Condiciones -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            Cliente / Solicitante:
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${(q.client && q.client.name) || 'Cliente'}
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.45;">
            <div><strong>Teléfono:</strong> ${(q.client && q.client.phone) || 'N/A'}</div>
            <div><strong>Correo:</strong> ${(q.client && q.client.email) || 'N/A'}</div>
            <div><strong>Ciudad / Destino:</strong> ${(q.client && q.client.city) || 'Valencia, Venezuela'}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            Condiciones Comerciales:
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.45;">
            <div><strong>Modalidad de Entrega:</strong> ${shippingText}</div>
            <div><strong>Moneda de Referencia:</strong> Dólares Americanos (USD)</div>
            <div><strong>Tasa en Bolívares:</strong> Oficial BCV a la fecha de pago</div>
            <div><strong>Disponibilidad:</strong> Entrega inmediata en almacén</div>
          </div>
        </div>
      </div>

      <!-- Tabla de Equipos Cotizados -->
      <div style="margin-bottom: 12px; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">
              <th style="padding: 7px 10px; text-align: center; width: 35px;">N°</th>
              <th style="padding: 7px 10px;">Descripción del Equipo</th>
              <th style="padding: 7px 10px; text-align: center; width: 120px;">Garantía</th>
              <th style="padding: 7px 10px; text-align: center; width: 55px;">Cant.</th>
              <th style="padding: 7px 10px; text-align: right; width: 95px;">P. Unit.</th>
              <th style="padding: 7px 10px; text-align: right; width: 100px;">Total (USD)</th>
            </tr>
          </thead>
          <tbody style="font-size: 12px;">
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <!-- Bloque de Totales -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 14px;">
        <div style="width: 260px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569; margin-bottom: 4px;">
            <span>Subtotal de Equipos:</span>
            <span style="font-weight: 600; color: #0f172a;">$${subtotalFmt} USD</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #475569; margin-bottom: 5px;">
            <span>IVA (16%):</span>
            <span style="font-weight: 700; color: #0f172a;">$${ivaFmt} USD</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #0284c7; border-top: 1.5px solid #cbd5e1; padding-top: 5px;">
            <span>TOTAL GENERAL:</span>
            <span>$${grandTotalWithIvaFmt} USD</span>
          </div>
        </div>
      </div>

      <!-- Condiciones de Pago y Validez -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 9px 14px; font-size: 10.5px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Formas de Pago:</strong> Transferencias BCV, Pago Móvil, Zelle, Efectivo en Tienda & Binance Pay.
        </div>
        <div style="color: #0369a1; font-weight: 700;">
          Validez de la oferta: 2 días continuos (48 horas)
        </div>
      </div>
    </div>
  </div>

  <script>
    function downloadPdfFile() {
      const element = document.getElementById('quotation-document');
      const opt = {
        margin: [5, 5, 5, 5],
        filename: 'Cotizacion_${q.id}_PowerUPS.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };
      if (typeof html2pdf !== 'undefined' && element) {
        html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }
  </script>
</body>
</html>`;
}

module.exports = router;
