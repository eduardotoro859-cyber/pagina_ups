/**
 * PowerUPS - Sistema de Cotización Inmediata por Producto
 */

const QuoteModal = {
  currentProduct: null,
  currentQty: 1,

  async open(productId) {
    if (!productId) return;

    try {
      // Obtener datos del producto desde la API
      const res = await fetch(`/api/products/${productId}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        alert('No se pudo cargar la información del producto.');
        return;
      }

      this.currentProduct = json.data;
      this.currentQty = 1;
      this.renderModal();

      const modal = document.getElementById('ups-quote-modal');
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    } catch (err) {
      console.error('Error al abrir cotizador:', err);
    }
  },

  close() {
    const modal = document.getElementById('ups-quote-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  updateQty(delta) {
    this.currentQty = Math.max(1, this.currentQty + delta);
    const qtyEl = document.getElementById('modal-qty-val');
    const totalEl = document.getElementById('modal-calc-total');

    if (qtyEl) qtyEl.textContent = this.currentQty;
    if (totalEl && this.currentProduct) {
      const total = (this.currentProduct.price || 0) * this.currentQty;
      totalEl.textContent = `$${total.toFixed(2)} USD`;
    }
  },

  renderModal() {
    const p = this.currentProduct;
    if (!p) return;

    const modal = document.getElementById('ups-quote-modal');
    if (!modal) return;

    const unitPrice = Number(p.price || 0).toFixed(2);
    const initialTotal = (p.price || 0) * this.currentQty;

    modal.innerHTML = `
      <div class="quote-modal-container" style="max-width: 650px;">
        <!-- Header Moderno -->
        <div class="quote-modal-header" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 18px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 18px;">
              <i class="icon solid fa-file-invoice-dollar"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #ffffff; text-transform: none; letter-spacing: normal; line-height: 1.2;">Solicitar Cotización de Equipo</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: #94a3b8; text-transform: none;">Presupuesto formal e inmediato con garantía y disponibilidad</p>
            </div>
          </div>
          <button type="button" class="quote-modal-close" onclick="QuoteModal.close()" title="Cerrar">&times;</button>
        </div>

        <div class="quote-modal-body" id="modal-content-area" style="padding: 20px 24px;">
          <!-- Tarjeta del Producto Seleccionado -->
          <div style="display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
            <img src="${p.mainImage}" alt="${p.name}" style="width: 60px; height: 60px; object-fit: contain; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 4px; flex-shrink: 0;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #0284c7; letter-spacing: 0.03em; text-transform: uppercase;">${p.brand} • ${p.model}</div>
              <h4 style="margin: 2px 0 4px 0; font-size: 0.96rem; color: #0f172a; font-weight: 700; text-transform: none; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</h4>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem;">
                <span style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">
                  <i class="icon solid fa-check"></i> Disponible
                </span>
                <span style="color: #64748b;">Precio unitario ref.: <strong style="color: #0f172a; font-weight: 700;">$${unitPrice} USD</strong></span>
              </div>
            </div>
          </div>

          <!-- Formulario de Datos Requeridos -->
          <form id="quote-direct-form" onsubmit="QuoteModal.submit(event)">
            <div class="form-grid-2" style="gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="q-name" style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Nombre y Apellido <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" id="q-name" required placeholder="Ej: Carlos Pérez" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="q-email" style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Correo Electrónico <span style="color: #ef4444;">*</span>
                </label>
                <input type="email" id="q-email" required placeholder="carlos@correo.com" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
              </div>
            </div>

            <div class="form-grid-2" style="gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="q-phone" style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Teléfono / WhatsApp <span style="color: #ef4444;">*</span>
                </label>
                <input type="tel" id="q-phone" required placeholder="Ej: +58 412 1234567" style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label for="q-city" style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Ciudad / Ubicación <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" id="q-city" required placeholder="Ej: Caracas, Valencia, etc." style="width: 100%; padding: 9px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;" />
              </div>
            </div>

            <!-- Fila: Envío y Cantidad -->
            <div class="form-grid-2" style="gap: 12px; margin-bottom: 14px; align-items: flex-end;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="q-shipping" style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Modalidad de Entrega <span style="color: #ef4444;">*</span>
                </label>
                <select id="q-shipping" style="width: 100%; height: 42px; padding: 0 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; background: #ffffff; color: #0f172a;">
                  <option value="no">Retiro en tienda / Entrega local</option>
                  <option value="si">Envio nacional asegurado (MRW / Zoom / Tealca)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 5px; display: block; text-transform: none;">
                  Cantidad y Total Estimado:
                </label>
                <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0 10px; height: 42px;">
                  <div class="quote-qty-controls" style="border: none; background: transparent; height: auto;">
                    <button type="button" class="quote-qty-btn" onclick="QuoteModal.updateQty(-1)" style="border-radius: 6px; width: 28px; height: 28px; font-size: 15px; line-height: 1; border: 1px solid #cbd5e1; background: #ffffff; cursor: pointer;">−</button>
                    <span id="modal-qty-val" class="quote-qty-val" style="width: 34px; font-size: 0.96rem; font-weight: 700; color: #0f172a;">${this.currentQty}</span>
                    <button type="button" class="quote-qty-btn" onclick="QuoteModal.updateQty(1)" style="border-radius: 6px; width: 28px; height: 28px; font-size: 15px; line-height: 1; border: 1px solid #cbd5e1; background: #ffffff; cursor: pointer;">+</button>
                  </div>
                  <div style="font-size: 0.85rem; color: #64748b; font-weight: 500;">
                    Total: <strong id="modal-calc-total" style="color: #0284c7; font-size: 1.05rem; font-weight: 800;">$${initialTotal.toFixed(2)} USD</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer con Botones -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 14px;">
              <div style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 5px;">
                <i class="icon solid fa-lock" style="color: #10b981;"></i>
                <span>Sin compromiso de compra</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="button alt small" onclick="QuoteModal.close()" style="border-radius: 8px; padding: 8px 16px; font-size: 0.88rem;">Cancelar</button>
                <button type="submit" id="btn-submit-direct-quote" class="button small" style="border-radius: 8px; background: #0284c7; color: white; padding: 8px 18px; font-size: 0.88rem; font-weight: 700; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);">
                  <i class="icon solid fa-paper-plane"></i> Generar Cotización
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async submit(e) {
    if (e) e.preventDefault();

    const p = this.currentProduct;
    if (!p) return;

    const name = document.getElementById('q-name').value.trim();
    const email = document.getElementById('q-email').value.trim();
    const phone = document.getElementById('q-phone').value.trim();
    const city = document.getElementById('q-city').value.trim();
    const needsShipping = document.getElementById('q-shipping').value === 'si';

    if (!name || !email || !phone || !city) {
      alert('Por favor completa todos los campos del formulario.');
      return;
    }

    const btn = document.getElementById('btn-submit-direct-quote');
    btn.disabled = true;
    btn.innerHTML = '<i class="icon solid fa-spinner fa-spin"></i> Generando cotización...';

    if (window.ProcessLoader) {
      ProcessLoader.show('Generando cotización oficial...', 'Registrando solicitud en el sistema');
    }

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          clientCity: city,
          needsShipping: needsShipping,
          productId: p.id,
          quantity: this.currentQty
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error generando la cotización');
      }

      this.lastQuoteData = data.quote || {
        id: data.quoteNumber,
        createdAt: new Date().toISOString(),
        client: { name, email, phone, city, needsShipping },
        items: [{
          productName: p.name,
          model: p.model || '',
          brand: p.brand || '',
          warranty: p.warranty || '1 año de garantía oficial',
          price: p.price,
          quantity: this.currentQty,
          total: (p.price || 0) * this.currentQty,
          notes: notes
        }],
        grandTotal: data.grandTotal || (p.price * this.currentQty)
      };

      // Mostrar pantalla de cotización generada
      const contentArea = document.getElementById('modal-content-area');
      const totalFmt = Number(data.grandTotal || 0).toFixed(2);

      contentArea.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
          <div style="width: 58px; height: 58px; background: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 14px auto; border: 1.5px solid #a7f3d0;">
            <i class="icon solid fa-check"></i>
          </div>
          <h3 style="color: #0f172a; margin-bottom: 6px; font-size: 1.35em; font-weight: 800;">¡Cotización Formal Generada!</h3>
          <p style="color: #64748b; font-size: 0.95em; margin-bottom: 18px;">
            Código Oficial: <strong style="color: #0284c7; font-size: 1.15em; font-family: monospace;">${data.quoteNumber}</strong>
          </p>

          <!-- Tarjeta resumen formal -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; text-align: left; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
              <div>
                <strong style="color: #0f172a; font-size: 1.05em;">${p.name}</strong>
                <div style="font-size: 0.85em; color: #64748b;">Cantidad: ${this.currentQty} unidad(es) • ${p.warranty || 'Garantía oficial'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.25em; font-weight: 800; color: #0284c7;">$${totalFmt} USD</div>
              </div>
            </div>

            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Cliente:</strong> ${name}</p>
            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Correo de contacto:</strong> ${email}</p>
            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Teléfono:</strong> ${phone}</p>
            <p style="margin: 0; font-size: 0.9em; color: #334155;"><strong>Modalidad:</strong> ${needsShipping ? 'Envío Nacional Asegurado' : 'Retiro en Tienda / Entrega Local'}</p>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; text-align: left; border-radius: 8px; font-size: 0.88em; color: #166534; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <i class="icon solid fa-envelope-circle-check" style="font-size: 18px; color: #16a34a; flex-shrink: 0;"></i>
            <div>El documento oficial con precios, garantías y métodos de pago fue enviado a <strong>${email}</strong>.</div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="button small" onclick="QuoteModal.openQuotePDF()" style="background: #0284c7; color: white; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; height: 42px; line-height: 42px; border-radius: 8px; padding: 0 18px;">
              <i class="icon solid fa-file-pdf"></i> Descargar Cotización en PDF
            </button>
            <button type="button" class="button alt small" onclick="QuoteModal.close(); location.reload();" style="height: 42px; line-height: 42px; border-radius: 8px; padding: 0 16px;">
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      `;

    } catch (err) {
      alert('Error: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="icon solid fa-paper-plane"></i> Generar y Enviar Cotización';
    } finally {
      if (window.ProcessLoader) {
        ProcessLoader.hide();
      }
    }
  },

  openQuotePDF() {
    const q = this.lastQuoteData;
    if (!q) {
      alert('No hay información de la cotización disponible.');
      return;
    }

    if (window.ProcessLoader) {
      ProcessLoader.show('Preparando documento PDF...', 'Generando cotización oficial');
      setTimeout(() => ProcessLoader.hide(), 700);
    }

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

    const pdfHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización Oficial ${q.id} - PowerUPS</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\\/script>
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
      <button type="button" class="top-action-btn secondary" onclick="window.close()">
        <i class="icon solid fa-times"></i> Cerrar
      </button>
    </div>
  </div>

  <div class="pdf-wrapper">
    <div id="quotation-document" class="pdf-sheet" style="width: 700px; max-width: 700px; margin: 0 auto; background: #ffffff; padding: 16px 20px; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
      <!-- Encabezado Membretado -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 10px;">
        <div>
          <div style="font-size: 23px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;">
            Power<span style="color: #0284c7;">UPS</span>
          </div>
          <div style="color: #64748b; font-size: 10.5px; font-weight: 600; margin-top: 2px;">
            Sistemas de Respaldo Ininterrumpido de Energía & Mini UPS DC
          </div>
          <div style="color: #475569; font-size: 10px; margin-top: 3px; line-height: 1.35;">
            <strong>RIF:</strong> J-50123456-7 &bull; Valencia, Estado Carabobo, Venezuela<br/>
            <strong>Atención Comercial:</strong> +58 424-4097970 &bull; ventas@powerups.com<br/>
            <strong>Sitio Web Oficial:</strong> www.powerups.com
          </div>
        </div>

        <div style="text-align: right; min-width: 220px;">
          <div style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 10px; border-radius: 5px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
            Cotización Oficial
          </div>
          <div style="font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 3px; font-family: monospace;">
            ${q.id}
          </div>
          <div style="font-size: 10.5px; color: #475569; margin-top: 2px; white-space: nowrap;">
            <strong>Fecha de Emisión:</strong> ${dateFormatted}
          </div>
          <div style="font-size: 10.5px; color: #059669; font-weight: 700; margin-top: 2px; white-space: nowrap;">
            <strong>Válida hasta:</strong> ${validityDateFormatted} (2 días)
          </div>
        </div>
      </div>

      <!-- Datos del Cliente y Condiciones -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 9px 12px;">
          <div style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
            Cliente / Solicitante:
          </div>
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${(q.client && q.client.name) || 'Cliente'}
          </div>
          <div style="font-size: 10.5px; color: #334155; line-height: 1.4;">
            <div><strong>Teléfono:</strong> ${(q.client && q.client.phone) || 'N/A'}</div>
            <div><strong>Correo:</strong> ${(q.client && q.client.email) || 'N/A'}</div>
            <div><strong>Ciudad / Destino:</strong> ${(q.client && q.client.city) || 'Valencia, Venezuela'}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 9px 12px;">
          <div style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
            Condiciones Comerciales:
          </div>
          <div style="font-size: 10.5px; color: #334155; line-height: 1.4;">
            <div><strong>Modalidad de Entrega:</strong> ${shippingText}</div>
            <div><strong>Moneda de Referencia:</strong> Dólares Americanos (USD)</div>
            <div><strong>Tasa en Bolívares:</strong> Oficial BCV a la fecha de pago</div>
            <div><strong>Disponibilidad:</strong> Entrega inmediata en almacén</div>
          </div>
        </div>
      </div>

      <!-- Tabla de Equipos Cotizados -->
      <div style="margin-bottom: 10px; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.3px;">
              <th style="padding: 6px 10px; text-align: center; width: 35px;">N°</th>
              <th style="padding: 6px 10px;">Descripción del Equipo</th>
              <th style="padding: 6px 10px; text-align: center; width: 120px;">Garantía</th>
              <th style="padding: 6px 10px; text-align: center; width: 55px;">Cant.</th>
              <th style="padding: 6px 10px; text-align: right; width: 95px;">P. Unit.</th>
              <th style="padding: 6px 10px; text-align: right; width: 100px;">Total (USD)</th>
            </tr>
          </thead>
          <tbody style="font-size: 11.5px;">
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <!-- Bloque de Totales -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
        <div style="width: 250px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 9px 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 3px;">
            <span>Subtotal de Equipos:</span>
            <span style="font-weight: 600; color: #0f172a;">$${subtotalFmt} USD</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
            <span>IVA (16%):</span>
            <span style="font-weight: 700; color: #0f172a;">$${ivaFmt} USD</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14.5px; font-weight: 900; color: #0284c7; border-top: 1.5px solid #cbd5e1; padding-top: 4px;">
            <span>TOTAL GENERAL:</span>
            <span>$${grandTotalWithIvaFmt} USD</span>
          </div>
        </div>
      </div>

      <!-- Condiciones de Pago y Validez -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Formas de Pago:</strong> Transferencias BCV, Pago Móvil, Zelle, Efectivo en Tienda & Binance Pay.
        </div>
        <div style="color: #0369a1; font-weight: 700; white-space: nowrap; margin-left: 10px;">
          Validez: 2 días continuos (48h)
        </div>
      </div>
    </div>
  </div>

  <script>
    function downloadPdfFile() {
      const element = document.getElementById('quotation-document');
      const opt = {
        margin: [6, 6, 6, 6],
        filename: 'Cotizacion_${q.id}_PowerUPS.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 1000
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };
      if (typeof html2pdf !== 'undefined' && element) {
        html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }
  <\\/script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(pdfHtml);
      printWin.document.close();
    } else {
      alert('Por favor permite ventanas emergentes en tu navegador para ver y guardar la cotización en PDF.');
    }
  },

  injectModalContainer() {
    if (document.getElementById('ups-quote-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'quote-modal-overlay';
    modal.id = 'ups-quote-modal';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
    document.body.appendChild(modal);
  },

  init() {
    this.injectModalContainer();
  }
};

// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => QuoteModal.init());
} else {
  QuoteModal.init();
}
