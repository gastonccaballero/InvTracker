import { $, escapeHtml, uid, nowISO } from '../../lib/dom.js';
import { DB, byId } from '../../state/store.js';
import { createCheckout, submitReturns } from '../../state/actions.js';
import { api } from '../../state/api.js';
import { mountCheckoutSearch } from './search.js';

let coDraft = { event_id:'', due_date:'', lines:[] };

function fillEventSelects(){
  const opts = DB.events.map(e=>`<option value="${e.id}">${escapeHtml((e.date||'')+' — '+e.name)}</option>`).join('');
  $('#coEvent').innerHTML = `<option value="">Select event…</option>`+opts;
  $('#retCheckout').innerHTML = DB.checkouts.map(c=>{
    const ev = byId(DB.events, c.event_id)||{name:'[deleted]'};
    const status = c.returned?'returned':'open';
    return `<option value="${c.id}">${escapeHtml((c.date||'').slice(0,10)+' — '+ev.name+' — '+c.items.length+' item(s) — '+status)}</option>`;
  }).join('');
}

function renderCoLines(){
  const curSym = DB.settings.currency_symbol||'$';
  $('#coLines').innerHTML = coDraft.lines.map(l=>{
    const line = Number(l.qty||0)*Number(l.unit_price||0);
    return `<tr>
      <td class="mono">${escapeHtml(l.sku)}</td>
      <td>${escapeHtml(l.name)}</td>
      <td><input type="number" min="1" step="1" value="${l.qty}" data-qty="${l.item_id}" style="width:80px"></td>
      <td><input type="number" min="0" step="0.01" value="${l.unit_price}" data-price="${l.item_id}" style="width:110px"></td>
      <td>${curSym}${Number(line).toFixed(2)}</td>
      <td class="row-actions"><button class="ghost" data-remline="${l.item_id}">Remove</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="color:#9ab">No lines yet — add items from the left.</td></tr>`;
  const sub = coDraft.lines.reduce((a,b)=>a + Number(b.qty||0)*Number(b.unit_price||0), 0);
  const tax = sub * (Number(DB.settings.tax_rate||0)/100);
  const tot = sub + tax;
  $('#coSubtotal').textContent = `${DB.settings.currency_symbol||'$'}${sub.toFixed(2)}`;
  $('#coTax').textContent = `${DB.settings.currency_symbol||'$'}${tax.toFixed(2)}`;
  $('#coTotal').textContent = `${DB.settings.currency_symbol||'$'}${tot.toFixed(2)}`;
}

function wireLines(){
  $('#coLines').addEventListener('input',(e)=>{
    const qtyId = e.target.getAttribute('data-qty');
    const priceId = e.target.getAttribute('data-price');
    if(qtyId){
      const it = byId(DB.inventory, qtyId); const line = coDraft.lines.find(l=>l.item_id===qtyId);
      let v = Math.max(1, Math.floor(Number(e.target.value||1)));
      if(it) v = Math.min(v, it.qty_available);
      line.qty = v; e.target.value = v; renderCoLines();
    }
    if(priceId){
      const line = coDraft.lines.find(l=>l.item_id===priceId);
      let v = Math.max(0, Number(e.target.value||0)); line.unit_price = v; e.target.value = v; renderCoLines();
    }
  });
  $('#coLines').addEventListener('click',(e)=>{
    const rem = e.target.getAttribute('data-remline');
    if(rem){ coDraft.lines = coDraft.lines.filter(l=>l.item_id!==rem); renderCoLines(); }
  });
}

function onAddItem(item){
  if(item.qty_available<=0){ alert('No available quantity.'); return; }
  const exists = coDraft.lines.find(l=>l.item_id===item.id);
  if(exists){ exists.qty = Math.min((exists.qty||0)+1, item.qty_available); }
  else { coDraft.lines.push({item_id:item.id, sku:item.sku, name:item.name, qty:1, unit_price:Number(item.price||0)}); }
  renderCoLines();
}

async function finalizeCheckout(){
  if(!$('#coEvent').value){ alert('Choose an event.'); return; }
  if(coDraft.lines.length===0){ alert('Add at least one line.'); return; }
  for(const l of coDraft.lines){
    const it = byId(DB.inventory, l.item_id);
    if(!it || it.qty_available<l.qty){ alert(`Insufficient availability for ${it?.name||l.sku}.`); return; }
  }
  // Prepare payload
  const subtotal = coDraft.lines.reduce((a,b)=>a+(b.qty*b.unit_price),0);
  const tax = subtotal*(Number(DB.settings.tax_rate||0)/100);
  const total = subtotal+tax;
  const co = {
    id: uid(),
    event_id: $('#coEvent').value,
    due_date: $('#coDue').value||'',
    items: coDraft.lines.map(l=>({item_id:l.item_id,sku:l.sku,name:l.name,qty:Number(l.qty),unit_price:Number(l.unit_price)})),
    subtotal,tax,total
  };
  try{
    await createCheckout(co);
    // refresh inventory from server truth
    DB.inventory = await api.getInventory();
    // reset and refresh
    coDraft={event_id:'',due_date:'',lines:[]}; $('#coEvent').value=''; $('#coDue').value='';
    renderCoLines(); fillEventSelects(); search.refresh(); returns.refresh();
    alert('Checkout created. You can view/print its invoice in Reports.');
  }catch(err){ console.error('Failed to create checkout', err); alert('Failed to create checkout.'); }
}

function outQtyForItem(itemId){
  let out=0;
  for(const co of DB.checkouts){
    for(const l of co.items){ if(l.item_id===itemId) out += l.qty; }
    for(const r of (co.returns||[])){ if(r.item_id===itemId) out -= r.qty; }
  }
  return out;
}

function renderReturns(){
  const id = $('#retCheckout').value; $('#retBody').innerHTML='';
  const co = byId(DB.checkouts, id);
  if(!co){ $('#retBody').innerHTML = `<tr><td colspan="5" style="color:#9ab">Choose a checkout.</td></tr>`; return; }
  const returnedMap = {};
  for(const r of (co.returns||[])){ returnedMap[r.item_id]=(returnedMap[r.item_id]||0)+Number(r.qty||0); }
  $('#retBody').innerHTML = co.items.map(l=>{
    const ret = returnedMap[l.item_id]||0; const out = l.qty - ret;
    return `<tr>
      <td class="mono">${escapeHtml(l.sku)}</td>
      <td>${escapeHtml(l.name)}</td>
      <td>${l.qty}</td>
      <td>${ret}</td>
      <td><input type="number" min="0" max="${out}" step="1" value="${out?out:0}" data-ret="${l.item_id}" style="width:80px" ${out?'':'disabled'}></td>
    </tr>`;
  }).join('');
}

async function processReturns(){
  const id = $('#retCheckout').value; const co = byId(DB.checkouts,id);
  if(!co){ alert('Choose a checkout first.'); return; }
  const retInputs = Array.from($('#retBody').querySelectorAll('input[data-ret]'));
  if(retInputs.length===0){ alert('Nothing to return.'); return; }
  const returns = [];
  for(const inp of retInputs){
    const item_id = inp.getAttribute('data-ret');
    const qty = Math.max(0, Math.floor(Number(inp.value||0)));
    if(qty>0){ returns.push({ item_id, qty }); }
  }
  if(returns.length===0){ alert('Enter return quantities.'); return; }
  try{
    await submitReturns(id, returns);
    renderReturns();
    alert('Returns processed.');
  }catch(err){ console.error('Failed to process returns', err); alert('Failed to process returns.'); }
}

let search; // instance with refresh()

export function mountCheckout(){
  fillEventSelects();
  search = mountCheckoutSearch({ onAdd: onAddItem });
  renderCoLines();
  renderReturns();
  wireLines();
  $('#btnClearCo').onclick=()=>{ coDraft={event_id:'',due_date:'',lines:[]}; $('#coEvent').value=''; $('#coDue').value=''; renderCoLines(); };
  $('#btnFinalizeCo').onclick=finalizeCheckout;
  $('#btnLoadReturns').onclick = renderReturns;
  $('#btnProcessReturns').onclick = processReturns;
}


