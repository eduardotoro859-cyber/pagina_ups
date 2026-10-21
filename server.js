const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const productsRouter = require('./routes/products.routes');
const quotesRouter = require('./routes/quotes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS, Imágenes)
app.use(express.static(path.join(__dirname)));

// Rutas de API
app.use('/api/products', productsRouter);
app.use('/api/quotes', quotesRouter);

// Endpoint de configuración pública
app.get('/api/config', (req, res) => {
  res.json({
    storeName: process.env.STORE_NAME || 'PowerUPS - Soluciones de Respaldo',
    whatsappPhone: process.env.SALES_WHATSAPP_PHONE || ''
  });
});

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚡ Servidor de PowerUPS iniciado exitosamente`);
  console.log(`🌐 Acceso Web: http://localhost:${PORT}`);
  console.log(`📦 API de Productos: http://localhost:${PORT}/api/products`);
  console.log(`📋 API de Cotizaciones: http://localhost:${PORT}/api/quotes`);
  console.log(`====================================================`);
});
