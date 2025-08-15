import { escapeHtml, fmtMoney } from '../lib/dom.js';

export function renderInvoice({ checkout, event, settings, withPrices }){
  const s = settings || {};
  const bizName = s.business_name || 'Invoice';
  const bizAddr = s.business_address || '';
  const bizPhone = s.business_phone || '';
  const bizEmail = s.business_email || '';
  const bizLogo = s.business_logo || '';
  const currency = s.currency_symbol || '$';

  const lineRows = (checkout.items||[]).map(l=>{
    const lineTotal = (Number(l.unit_price||0) * Number(l.qty||0));
    return `<tr>
      <td>${escapeHtml(l.sku||'')}</td>
      <td>${escapeHtml(l.name||'')}</td>
      <td>${Number(l.qty||0)}</td>
      ${withPrices ? `<td>${currency}${Number(l.unit_price||0).toFixed(2)}</td><td>${currency}${lineTotal.toFixed(2)}</td>` : ``}
    </tr>`;
  }).join('');

  const totalsBlock = withPrices ? `
    <div class="totals">
      <table>
        <tr><th>Subtotal</th><td style="text-align:right">${fmtMoney(checkout.subtotal||0, currency)}</td></tr>
        <tr><th>Tax</th><td style="text-align:right">${fmtMoney(checkout.tax||0, currency)}</td></tr>
        <tr><th>Total</th><td style="text-align:right"><strong>${fmtMoney(checkout.total||0, currency)}</strong></td></tr>
      </table>
    </div>` : '';

  const ev = event || {};
  const dateStr = (checkout.date||'').slice(0,10);

  return `
    <div class="invoice">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <h2>${escapeHtml(bizName)}</h2>
          <small>${escapeHtml(bizAddr)}</small><br>
          <small>${escapeHtml(bizPhone)}</small><br>
          <small>${escapeHtml(bizEmail)}</small>
        </div>
        <div style="text-align:right">
          ${bizLogo ? `<img src="${bizLogo}" alt="logo" style="max-height:60px;max-width:220px;object-fit:contain">` : ''}
          <div><small><strong>Invoice #</strong> ${escapeHtml(checkout.id)}</small></div>
          <div><small><strong>Date</strong> ${escapeHtml(dateStr)}</small></div>
          <div><small><strong>Due</strong> ${escapeHtml(checkout.due_date||'')}</small></div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:24px;flex-wrap:wrap">
        <div>
          <strong>Bill To</strong><br>
          <div>${escapeHtml(ev.client||'')}</div>
          <small>${escapeHtml(ev.contact||'')}</small>
        </div>
        <div>
          <strong>Event</strong><br>
          <div>${escapeHtml(ev.name||'')}</div>
          <small>${escapeHtml(ev.location||'')}</small><br>
          <small>${escapeHtml(ev.date||'')}</small>
        </div>
      </div>
      <table style="margin-top:16px">
        <thead>
          <tr>
            <th style="width:140px">SKU</th>
            <th>Item</th>
            <th style="width:80px">Qty</th>
            ${withPrices ? `<th style="width:120px">Unit</th><th style="width:120px">Line</th>` : ``}
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
      ${totalsBlock}
      <div style="margin-top:12px"><small>Notes: ${escapeHtml(ev.notes||'')}</small></div>
    </div>`;
}


