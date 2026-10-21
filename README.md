# PowerUPS - Tienda Online de Respaldo Energético y Sistema de Cotizaciones

Plataforma web integral para la exhibición, consulta técnica y solicitud de presupuestos/cotizaciones de equipos de respaldo ininterrumpido (**Mini UPS** para routers y módems, e **Inversores Solares Híbridos** de alta capacidad).

Construida con **Frontend interactivo** y **Backend en Node.js + Express & JavaScript**.

---

## 🚀 Cómo Iniciar el Proyecto

1. **Instalar dependencias** (si es la primera vez):
   ```bash
   npm install
   ```

2. **Iniciar el servidor en desarrollo:**
   ```bash
   npm run dev
   ```
   O en producción:
   ```bash
   npm start
   ```

3. **Abrir en tu navegador:**
   - Tienda principal: [http://localhost:3000](http://localhost:3000)
   - Catálogo interactivo: [http://localhost:3000/catalogo.html](http://localhost:3000/catalogo.html)
   - Panel de cotizaciones: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🛠️ Arquitectura del Sistema

```
Pagina_UPS/
├── .env                       # Variables de entorno (Puerto, WhatsApp de ventas, etc.)
├── package.json               # Dependencias (Express, Cors, Dotenv)
├── server.js                  # Servidor principal Node.js / Express
├── data/
│   ├── products.json          # Catálogo completo con fichas técnicas y fotos
│   └── quotes.json            # Historial persistente de cotizaciones recibidas
├── routes/
│   ├── products.routes.js     # API REST para catálogo, filtros y detalles
│   └── quotes.routes.js       # API REST para recibir cotizaciones y generar WhatsApp
├── assets/
│   ├── css/
│   │   ├── main.css           # Estilos base
│   │   └── custom-store.css   # Estilos de la tienda, carrito modal y fichas técnicas
│   └── js/
│       └── quote-cart.js      # Motor interactivo de cotización (localStorage + WhatsApp)
├── images/
│   └── new_pic/               # Imágenes reales, infografías y especificaciones de proveedores
├── index.html                 # Página de inicio con propuesta de valor y destacados
├── catalogo.html              # Catálogo con filtros por categoría y buscador en vivo
├── producto.html              # Ficha técnica dinámica con galería interactiva de fotos
├── nosotros.html              # Información corporativa y beneficios de respaldo
└── admin.html                 # Panel de administración de cotizaciones
```

---

## 📦 Productos Registrados

Los datos y fotos fueron extraídos y formateados directamente desde las especificaciones técnicas en `images/new_pic/`:

1. **Mini UPS DC Shanpu DC1018P (10,400 mAh - 18W)**
   - Respaldo para Router WiFi y Módem de Fibra Óptica (ONU).
   - Salidas USB 5V, DC 9V, DC 12V y POE 15V/24V.

2. **Mini UPS Inteligente WGP 30WDL (115.44 Wh - 30W)**
   - Autonomía ultra extendida de hasta **12+ horas continuas**.
   - 4 salidas simultáneas (2x 12V, 9V, USB QC 3.0).

3. **Inversor Solar Híbrido Anern AN-FGI-S (6kW - MPPT 160A)**
   - Onda sinusoidal pura de 6000W nominales.
   - Controlador MPPT de 160A para paneles solares y bancos de baterías de 24V/48V.

---

## 💬 Flujo de Cotizaciones (Clientes y Empresa)

1. El usuario navega por la tienda pública y hace clic en **"Cotizar"** o **"Agregar a mi Cotización"**.
2. Un botón flotante con contador en tiempo real (`quote-cart.js`) le permite abrir su lista.
3. El cliente ingresa su Nombre, Teléfono/WhatsApp, Correo y Notas.
4. El backend registra la cotización con código único (ej: `COT-2026-9786`) en `data/quotes.json`.
5. Se genera automáticamente un enlace de WhatsApp con el resumen listo para enviar.
6. Si está configurado el correo, se dispara una notificación por email a la empresa y un acuse al cliente.

---

## 🔒 Panel Privado Exclusivo de la Empresa (`admin.html`)

El panel de cotizaciones **no es visible para los visitantes comunes** (no aparece en ningún menú de la tienda). Es una herramienta interna protegida por PIN:

- **Ruta privada:** `http://localhost:3000/admin.html`
- **PIN por defecto:** `1234` (configurable en `.env` vía `ADMIN_PIN`)
- **Funcionalidades para la empresa:**
  - Consulta en tiempo real de todas las cotizaciones recibidas.
  - Cambio de estados (*Pendiente, Contactado, Cotización Enviada, Cerrada/Vendida, Cancelada*).
  - Notas internas de seguimiento por cotización (visibles únicamente para el equipo de ventas).
  - Botón directo para chatear con el cliente por **WhatsApp**.
  - Modal para **Enviar Presupuesto por Correo** al cliente directamente desde el panel.
  - Opción para imprimir o archivar la ficha.

---

## ⚙️ Configuración (`.env`)

En el archivo `.env` puedes personalizar todas las opciones:

```env
PORT=3000
STORE_NAME="PowerUPS - Soluciones de Respaldo Energético"

# Número de WhatsApp de ventas con código de país (ej: 584121234567)
SALES_WHATSAPP_PHONE=""

# Clave / PIN secreto para entrar al Panel Privado de la Empresa
ADMIN_PIN="1234"

# Correo donde la empresa recibirá las notificaciones de cotización
COMPANY_EMAIL=""

# Configuración SMTP para envío automático de correos (opcional)
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="ventas@powerups.com"
```
