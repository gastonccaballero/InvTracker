import { $, uid, nowISO } from '../../lib/dom.js';
import { DB, byId, idxById } from '../../state/store.js';
import { upsertInventory } from '../../state/actions.js';

let onChangeRef = () => {};

export function setupInventoryDialog(onChange){
  onChangeRef = typeof onChange === 'function' ? onChange : () => {};
  const dlg = $('#invDialog');
  dlg?.addEventListener('click', e => { if (e.target?.hasAttribute?.('data-close')) dlg.close(); });
  $('#btnSaveItem')?.addEventListener('click', onSaveItem);
}

export function openInventoryDialog(item=null){
  const dlg = $('#invDialog');
  const form = $('#invForm');
  const title = $('#invDialogTitle');
  title.textContent = item ? 'Edit Item' : 'New Item';
  form.reset();
  form.id.value = item?.id || '';
  form.sku.value = item?.sku || '';
  form.name.value = item?.name || '';
  form.category.value = item?.category || '';
  form.location.value = item?.location || '';
  form.unit.value = item?.unit || '';
  form.safety_stock.value = item?.safety_stock ?? 0;
  form.qty_total.value = item?.qty_total ?? 0;
  form.qty_available.value = item?.qty_available ?? (item?.qty_total ?? 0);
  form.cost.value = item?.cost ?? 0;
  form.price.value = item?.price ?? 0;
  form.tags.value = (item?.tags || []).join(', ');
  form.notes.value = item?.notes || '';
  form.image_path.value = item?.image_path || '';
  dlg.showModal();
}

async function onSaveItem(e){
  e.preventDefault();
  const form = $('#invForm');
  const f = new FormData(form);
  const existingId = form.id.value.trim();
  const isNew = !existingId;
  const itemId = isNew ? uid() : existingId;

  const next = {
    id: itemId,
    sku: (f.get('sku')||'').toString().trim(),
    name: (f.get('name')||'').toString().trim(),
    category: (f.get('category')||'').toString().trim(),
    location: (f.get('location')||'').toString().trim(),
    unit: (f.get('unit')||'').toString().trim(),
    safety_stock: Number(f.get('safety_stock')||0),
    qty_total: Number(f.get('qty_total')||0),
    qty_available: Number(f.get('qty_available')|| (f.get('qty_total')||0)),
    cost: Number(f.get('cost')||0),
    price: Number(f.get('price')||0),
    tags: (f.get('tags')||'').toString().split(',').map(t=>t.trim()).filter(Boolean),
    notes: (f.get('notes')||'').toString(),
    image_path: (f.get('image_path')||'').toString().trim(),
    updated_at: nowISO()
  };

  const idx = idxById(DB.inventory, itemId);
  if (idx >= 0) {
    const prev = DB.inventory[idx];
    if (next.qty_total < (prev.qty_total - prev.qty_available)) {
      alert('Total qty cannot be less than currently out on checkout.');
      return;
    }
  } else {
    next.created_at = nowISO();
  }

  try {
    await upsertInventory(next);
    $('#invDialog')?.close();
    onChangeRef();
  } catch (err) {
    console.error('Failed to save inventory item', err);
    alert('Failed to save item. Please try again.');
  }
}


