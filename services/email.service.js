const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

/**
 * Genera y envía automáticamente la cotización formal por correo al cliente
 */
async function sendOfficialQuoteEmail(quote) {
  const transporter = getTransporter();
  const companyEmail = process.env.COMPANY_EMAIL;
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'ventas@powerups.com';

  const dateStr = new Date(quote.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const shippingText = quote.client.needsShipping
    ? '<span style="color: #0284c7; font-weight: bold;">📦 Requiere Envío Nacional (MRW / Zoom / Tealca)</span>'
    : '<span style="color: #10b981; font-weight: bold;">🏬 Retiro en Tienda / Entrega Local</span>';

  let itemsRowsHtml = '';
  quote.items.forEach((it, idx) => {
    const unitPrice = Number(it.price || 0).toFixed(2);
    const lineTotal = Number(it.total || (it.price * it.quantity) || 0).toFixed(2);

    itemsRowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; color: #0f172a;">
          <strong>${it.productName}</strong><br/>
          <small style="color: #64748b;">Modelo: ${it.model || 'N/A'} • ${it.warranty || 'Garantía oficial'}</small>
        </td>
        <td style="padding: 12px 14px; text-align: center; color: #334155;">${it.quantity}</td>
        <td style="padding: 12px 14px; text-align: right; color: #334155;">$${unitPrice}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: bold; color: #0284c7;">$${lineTotal}</td>
      </tr>
    `;
  });

  const grandTotal = Number(quote.grandTotal || 0).toFixed(2);

  const cleanPhone = (process.env.SALES_WHATSAPP_PHONE || '').replace(/[^0-9]/g, '');
  const waReplyUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, recibí la cotización formal [${quote.id}] por un monto de $${grandTotal}. Deseo coordinar el pago y la entrega.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hola, recibí la cotización formal [${quote.id}]. Deseo coordinar el pago.`)}`;

  const quoteHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <!-- Membrete -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 26px 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 24px; color: #38bdf8; letter-spacing: -0.5px;">⚡ PowerUPS</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Soluciones de Respaldo Energético & Mini UPS</p>
            </td>
            <td style="text-align: right;">
              <span style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                COTIZACIÓN OFICIAL
              </span>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">${quote.id}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Datos de la Cotización -->
      <div style="padding: 24px 30px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Cotizado a:</p>
              <h3 style="margin: 4px 0 2px 0; color: #0f172a; font-size: 17px;">${quote.client.name}</h3>
              <p style="margin: 0; color: #475569; font-size: 13px;">📞 ${quote.client.phone}</p>
              <p style="margin: 0; color: #475569; font-size: 13px;">✉️ ${quote.client.email}</p>
              <p style="margin: 0; color: #475569; font-size: 13px;">📍 ${quote.client.city}</p>
            </td>
            <td style="vertical-align: top; text-align: right; width: 50%;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Fecha de Emisión:</p>
              <p style="margin: 4px 0 10px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${dateStr}</p>
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold;">Modalidad de Entrega:</p>
              <p style="margin: 4px 0 0 0; font-size: 13px;">${shippingText}</p>
            </td>
          </tr>
        </table>

        <!-- Tabla de Productos -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569;">
              <th style="padding: 10px 14px;">Descripción del Equipo</th>
              <th style="padding: 10px 14px; text-align: center;">Cant.</th>
              <th style="padding: 10px 14px; text-align: right;">P. Unitario</th>
              <th style="padding: 10px 14px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody style="font-size: 14px;">
            ${itemsRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-size: 16px;">
              <td colspan="3" style="padding: 14px; text-align: right; font-weight: bold; color: #0f172a;">TOTAL COTIZADO:</td>
              <td style="padding: 14px; text-align: right; font-weight: 800; color: #0284c7; font-size: 18px;">$${grandTotal} USD</td>
            </tr>
          </tfoot>
        </table>

        <!-- Condiciones y Garantía -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.6;">
          <strong>Términos y Condiciones:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 18px;">
            <li>Precios expresados en Dólares Americanos (USD), pagaderos en divisas o moneda nacional a tasa del día.</li>
            <li>Garantía de reposición directa contra defectos de fábrica.</li>
            <li>Disponibilidad inmediata en inventario al momento de emitir esta cotización (sujeta a rotación de stock).</li>
            <li>Envíos nacionales asegurados con número de guía rastreable.</li>
          </ul>
        </div>

        <!-- Botón de Confirmación -->
        <div style="text-align: center; margin-top: 10px;">
          <a href="${waReplyUrl}" target="_blank" style="background: #25d366; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);">
            💬 Confirmar Pedido o Consultar por WhatsApp
          </a>
        </div>
      </div>

      <div style="background: #0f172a; color: #94a3b8; padding: 16px; text-align: center; font-size: 11px;">
        PowerUPS • Tecnología de Respaldo Ininterrumpido para Telecomunicaciones y Equipos Críticos
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`[EmailService] (Modo demostración) Correo formal generado para ${quote.client.email} con cotización ${quote.id} por $${grandTotal}.`);
    return { sent: false, reason: 'smtp_not_configured', previewHtml: quoteHtml };
  }

  // 1. Enviar al cliente
  if (quote.client.email) {
    await transporter.sendMail({
      from: `"PowerUPS Cotizaciones" <${fromEmail}>`,
      to: quote.client.email,
      subject: `📄 Cotización Formal [${quote.id}] - PowerUPS ($${grandTotal} USD)`,
      html: quoteHtml
    });
    console.log(`[EmailService] Cotización formal enviada a ${quote.client.email}`);
  }

  // 2. Enviar copia a la empresa si hay correo configurado
  if (companyEmail) {
    await transporter.sendMail({
      from: `"PowerUPS Sistema" <${fromEmail}>`,
      to: companyEmail,
      subject: `🚨 [NUEVA COTIZACIÓN GENERADA ${quote.id}] - ${quote.client.name} ($${grandTotal} USD)`,
      html: `
        <div style="padding: 10px; background: #e0f2fe; border: 1px solid #0284c7; border-radius: 6px; margin-bottom: 14px;">
          <strong>Alerta de Empresa:</strong> Se ha generado y enviado automáticamente la siguiente cotización a ${quote.client.name} (${quote.client.phone}).
        </div>
        ${quoteHtml}
      `
    });
  }

  return { sent: true };
}

module.exports = {
  sendOfficialQuoteEmail
};
