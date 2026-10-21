const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendOfficialQuoteEmail } = require('../services/email.service');

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

// Middleware de autenticación para uso exclusivo de la Empresa
function requireAdminPin(req, res, next) {
  const incomingPin = req.headers['x-admin-pin'] || req.query.pin;
  const configuredPin = process.env.ADMIN_PIN || '1234';

  if (!incomingPin || incomingPin !== configuredPin) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. PIN de empresa inválido o ausente.'
    });
  }
  next();
}

// POST /api/quotes/verify-pin - Validar PIN de la empresa
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  const configuredPin = process.env.ADMIN_PIN || '1234';

  if (pin === configuredPin) {
    return res.json({ success: true, message: 'Acceso concedido al panel de la empresa' });
  }

  return res.status(401).json({ success: false, message: 'PIN incorrecto' });
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

module.exports = router;
