import { $, $$, escapeHtml } from '../../lib/dom.js';
import { DB, byId } from '../../state/store.js';
import { removeInventory } from '../../state/actions.js';
import { setupInventoryDialog, openInventoryDialog } from './dialog.js';
import { getEditIcon, getDeleteIcon } from '../../lib/icons.js';
import { showConfirmModal } from '../../lib/modal.js';

function renderCategories(){
  const cats = Array.from(new Set(DB.inventory.map(i=>i.category).filter(Boolean))).sort();
  $('#invFilterCategory').innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
}

function renderTable(){
  const q = ($('#invSearch').value||'').toLowerCase();
  const cat = $('#invFilterCategory').value || '';
  const low = $('#invFilterLow').value;
  const rows = DB.inventory.filter(i=>{
    const matches = [i.sku,i.name,i.category].join(' ').toLowerCase().includes(q);
    const catOk = !cat || (i.category||'')===cat;
    const lowOk = !low || (low==='low' ? (i.qty_available <= (i.safety_stock||0)) : (i.qty_available > (i.safety_stock||0)));
    return matches && catOk && lowOk;
  }).map(i=>{
    const lowCls = i.qty_available <= (i.safety_stock||0) ? 'low' : 'good';
    const tags = (i.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('');
    const imageCell = i.image_path ? 
      `<img src="${escapeHtml(i.image_path)}" alt="${escapeHtml(i.name)}" class="inventory-image" onerror="this.style.display='none'">` :
      '<div style="width:40px;height:40px;background:#1b2330;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#a7b0bf;font-size:12px;">📦</div>';
    return `<tr>
      <td>${imageCell}</td>
      <td><small class="mono">${escapeHtml(i.sku)}</small></td>
      <td>${escapeHtml(i.name)}</td>
      <td>${escapeHtml(i.category||'')}</td>
      <td>${escapeHtml(i.location||'')}</td>
      <td>${escapeHtml(i.unit||'')}</td>
      <td><span class="badge ${lowCls}">${i.qty_available}</span> / ${i.qty_total}</td>
      <td>${(DB.settings.currency_symbol||'$')}${Number(i.price||0).toFixed(2)}</td>
      <td>${i.safety_stock||0}</td>
      <td>${tags}</td>
      <td class="row-actions">
        <button class="btn-icon btn-edit" data-edit="${i.id}" title="Edit">${getEditIcon()}</button>
        <button class="btn-icon btn-delete" data-del="${i.id}" title="Delete">${getDeleteIcon()}</button>
      </td>
    </tr>`;
  }).join('');
  $('#invBody').innerHTML = rows || `<tr><td colspan="10" style="color:#9ab">No items yet. Click <em>Add Item</em>.</td></tr>`;
  $('#invCount').textContent = `${DB.inventory.length} items (${rows ? rows.match(/<tr>/g)?.length || 0 : 0} shown)`;
}

function wireInteractions(){
  $('#invSearch').oninput = $('#invFilterCategory').oninput = $('#invFilterLow').oninput = ()=>{ renderCategories(); renderTable(); };
  $('#btnAddItem').onclick = ()=> openInventoryDialog();
  $('#invDialog')?.querySelectorAll('[data-close]')?.forEach(b=> b.onclick = ()=> $('#invDialog').close());
  $('#invBody').addEventListener('click', async (e)=>{
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');
    if (editId) {
      const item = byId(DB.inventory, editId);
      if (item) openInventoryDialog(item);
    }
    if (delId) {
      const item = byId(DB.inventory, delId);
      if (item) {
        const out = outQtyForItem(item.id);
        const message = out > 0 
          ? `Are you sure you want to delete "${item.name}"? This item has ${out} out on checkouts.`
          : `Are you sure you want to delete "${item.name}"?`;
        
        showConfirmModal(message, async () => {
          await removeInventory(delId);
          renderCategories();
          renderTable();
        });
      }
    }
  });
}

function outQtyForItem(itemId){
  let out=0; for(const co of DB.checkouts){
    for(const l of co.items){ if(l.item_id===itemId) out += l.qty; }
    for(const r of (co.returns||[])){ if(r.item_id===itemId) out -= r.qty; }
  } return out;
}

export function mountInventory(){
  setupInventoryDialog(()=>{ renderCategories(); renderTable(); });
  renderCategories();
  renderTable();
  wireInteractions();
}


