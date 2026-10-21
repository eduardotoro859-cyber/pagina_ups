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
                  <option value="no">🏬 Retiro en tienda / Entrega local</option>
                  <option value="si">📦 Envío nacional (MRW / Zoom / Tealca)</option>
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

      // Mostrar pantalla de cotización generada
      const contentArea = document.getElementById('modal-content-area');
      const quote = data.quote;
      const totalFmt = Number(data.grandTotal || 0).toFixed(2);

      contentArea.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
          <div style="width: 64px; height: 64px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 14px auto;">
            ✓
          </div>
          <h3 style="color: #0f172a; margin-bottom: 6px; font-size: 1.4em; font-weight: 800;">¡Cotización Generada Exitosamente!</h3>
          <p style="color: #64748b; font-size: 0.95em; margin-bottom: 20px;">
            Código de Cotización: <strong style="color: #0284c7; font-size: 1.2em;">${data.quoteNumber}</strong>
          </p>

          <!-- Tarjeta resumen formal -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; text-align: left; margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
              <div>
                <strong style="color: #0f172a; font-size: 1.05em;">${p.name}</strong>
                <div style="font-size: 0.85em; color: #64748b;">Cantidad: ${this.currentQty} unidad(es) • ${p.warranty || 'Garantía oficial'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.25em; font-weight: 800; color: #0284c7;">$${totalFmt} USD</div>
              </div>
            </div>

            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Cliente:</strong> ${name}</p>
            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Correo de destino:</strong> ${email}</p>
            <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #334155;"><strong>Teléfono:</strong> ${phone}</p>
            <p style="margin: 0; font-size: 0.9em; color: #334155;"><strong>Modalidad:</strong> ${needsShipping ? 'Envío Nacional Requerido' : 'Retiro / Entrega Local'}</p>
          </div>

          <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px 16px; text-align: left; border-radius: 4px; font-size: 0.88em; color: #0369a1; margin-bottom: 24px;">
            📧 Hemos enviado el documento oficial de esta cotización a tu correo <strong>${email}</strong> con las especificaciones técnicas completas y opciones de pago.
          </div>

          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="button alt small" onclick="window.print()">
              <i class="icon solid fa-print"></i> Imprimir Cotización
            </button>
            <button type="button" class="button small" onclick="QuoteModal.close(); location.reload();" style="background: #0284c7; color: white;">
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      `;

    } catch (err) {
      alert('Error: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="icon solid fa-paper-plane"></i> Generar y Enviar Cotización';
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
