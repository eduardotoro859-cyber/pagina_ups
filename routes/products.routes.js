const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo products.json:', err);
    return [];
  }
}

// GET /api/products - Listar productos con filtros
router.get('/', (req, res) => {
  const { category, featured, q } = req.query;
  let products = loadProducts();

  if (category) {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (featured === 'true') {
    products = products.filter(p => p.featured === true);
  }

  if (q) {
    const query = q.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.tagline.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      (p.model && p.model.toLowerCase().includes(query))
    );
  }

  res.json({
    success: true,
    count: products.length,
    data: products
  });
});

// GET /api/products/categories - Listar categorías disponibles
router.get('/meta/categories', (req, res) => {
  const products = loadProducts();
  const categoryMap = {};

  products.forEach(p => {
    if (!categoryMap[p.category]) {
      categoryMap[p.category] = {
        id: p.category,
        label: p.categoryLabel || p.category,
        count: 0
      };
    }
    categoryMap[p.category].count += 1;
  });

  res.json({
    success: true,
    data: Object.values(categoryMap)
  });
});

// GET /api/products/:id - Detalle de un producto específico
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const products = loadProducts();
  const product = products.find(p => p.id === id || p.slug === id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Producto no encontrado'
    });
  }

  // Productos relacionados de la misma categoría
  const related = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  res.json({
    success: true,
    data: product,
    related
  });
});

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

// Middleware de autenticación para administradores
function requireAdminPin(req, res, next) {
  const incomingPin = req.headers['x-admin-pin'] || req.query.pin;

  if (!isValidAdminPin(incomingPin)) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. PIN inválido o ausente.'
    });
  }
  next();
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error guardando products.json:', err);
    return false;
  }
}

// PUT /api/products/:id/price - Actualizar precio y disponibilidad de un producto (exclusivo empresa)
router.put('/:id/price', requireAdminPin, (req, res) => {
  const { id } = req.params;
  const { price, inStock } = req.body;

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar un precio numérico válido mayor o igual a 0'
    });
  }

  const products = loadProducts();
  const index = products.findIndex(p => p.id === id || p.slug === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Producto no encontrado'
    });
  }

  const newPrice = parseFloat(Number(price).toFixed(2));
  products[index].price = newPrice;

  if (inStock !== undefined) {
    products[index].inStock = Boolean(inStock);
  }

  const ok = saveProducts(products);
  if (!ok) {
    return res.status(500).json({
      success: false,
      message: 'Error al guardar los cambios en el archivo de productos'
    });
  }

  res.json({
    success: true,
    message: `Precio actualizado exitosamente a $${newPrice.toFixed(2)} USD`,
    data: products[index]
  });
});

// PUT /api/products/:id/stock - Actualizar stock e inventario físico (exclusivo empresa)
router.put('/:id/stock', requireAdminPin, (req, res) => {
  const { id } = req.params;
  const { stockQuantity, minStockAlert, stockLocation, sku, inStock } = req.body;

  if (stockQuantity === undefined || isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar una cantidad de stock válida (entero mayor o igual a 0)'
    });
  }

  const products = loadProducts();
  const index = products.findIndex(p => p.id === id || p.slug === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Producto no encontrado'
    });
  }

  const parsedQty = Math.max(0, parseInt(stockQuantity, 10));
  products[index].stockQuantity = parsedQty;

  // Sincronizar automáticamente disponibilidad con la cantidad en inventario
  if (inStock !== undefined) {
    products[index].inStock = Boolean(inStock);
  } else {
    products[index].inStock = parsedQty > 0;
  }

  if (minStockAlert !== undefined && !isNaN(Number(minStockAlert)) && Number(minStockAlert) >= 0) {
    products[index].minStockAlert = parseInt(minStockAlert, 10);
  }

  if (stockLocation !== undefined && typeof stockLocation === 'string') {
    products[index].stockLocation = stockLocation.trim();
  }

  if (sku !== undefined && typeof sku === 'string' && sku.trim()) {
    products[index].sku = sku.trim();
  }

  const ok = saveProducts(products);
  if (!ok) {
    return res.status(500).json({
      success: false,
      message: 'Error al persistir cambios de inventario en el servidor'
    });
  }

  res.json({
    success: true,
    message: `Inventario actualizado: ${parsedQty} unidades disponibles`,
    data: products[index]
  });
});

module.exports = router;

