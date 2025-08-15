import { $, escapeHtml } from '../../lib/dom.js';
import { DB, byId } from '../../state/store.js';
import { api } from '../../state/api.js';
import { renderInvoice } from '../../services/invoice.js';

function renderStats(stats){
  if (stats){
    $('#statItems').textContent = stats.items;
    $('#statLow').textContent = stats.low;
    $('#statEvents').textContent = stats.events;
    $('#statCO').textContent = stats.checkouts;
  } else {
    $('#statItems').textContent = DB.inventory.length;
    $('#statEvents').textContent = DB.events.length;
    $('#statCO').textContent = DB.checkouts.length;
    $('#statLow').textContent = DB.inventory.filter(i=>i.qty_available<= (i.safety_stock||0)).length;
  }
}

function renderActivity(){
  const since = Date.now() - 1000*60*60*24*30;
  const acts = DB.activity.filter(a => new Date(a.date).getTime() >= since);
  $('#actCount').textContent = `${acts.length} records`;
  $('#actBody').innerHTML = acts.slice(0,200).map(a=>`
    <tr>
      <td>${escapeHtml((a.date||'').slice(0,10))}</td>
      <td><span class="tag">${escapeHtml(a.type||'')}</span></td>
      <td>${escapeHtml(a.ref||'')}</td>
      <td>${escapeHtml(a.details||'')}</td>
    </tr>`).join('');
}

function fillInvoices(){
  $('#invoiceSelect').innerHTML = DB.checkouts.map(co=>{
    const ev = byId(DB.events, co.event_id) || {name:'[deleted]'};
    const label = `${(co.date||'').slice(0,10)} — ${ev.name} — ${co.items.length} item(s)`;
    return `<option value="${co.id}">${escapeHtml(label)}</option>`;
  }).join('');
}

function openInvoiceSelected(){
  const id = $('#invoiceSelect').value; if(!id){ alert('Choose an invoice'); return; }
  const co = byId(DB.checkouts, id);
  const ev = byId(DB.events, co?.event_id);
  const html = renderInvoice({ checkout: co, event: ev, settings: DB.settings, withPrices: $('#togglePrices').checked });
  $('#invoiceArea').classList.add('active');
  $('#invoiceArea').innerHTML = html;
}

export function mountReports(){
  // Stats: try API, fallback to local
  api.getStats().then(renderStats).catch(()=> renderStats(null));
  renderActivity();
  fillInvoices();
  $('#btnOpenInvoice').onclick = openInvoiceSelected;
  $('#btnPrintInvoice').onclick = ()=>{ if(!$('#invoiceArea').classList.contains('active')) openInvoiceSelected(); window.print(); };
  $('#togglePrices').addEventListener('change', ()=>{ if($('#invoiceArea').classList.contains('active')) openInvoiceSelected(); });
}


