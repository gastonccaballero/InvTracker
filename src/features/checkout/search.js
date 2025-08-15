import { $, escapeHtml } from '../../lib/dom.js';
import { DB } from '../../state/store.js';

export function mountCheckoutSearch({ onAdd }){
  const input = $('#coSearch');
  const body = $('#coSearchBody');

  function render(){
    const q = (input.value||'').toLowerCase();
    const rows = DB.inventory.filter(i=>
      [i.sku,i.name,i.category].join(' ').toLowerCase().includes(q)
    ).map(i=>`
      <tr>
        <td class="mono">${escapeHtml(i.sku)}</td>
        <td>${escapeHtml(i.name)}</td>
        <td>${i.qty_available}</td>
        <td><button class="ghost" data-addco="${i.id}">Add</button></td>
      </tr>`).join('');
    body.innerHTML = rows || `<tr><td colspan="4" style="color:#9ab">No matches.</td></tr>`;
  }

  input.oninput = render;
  body.addEventListener('click', (e)=>{
    const addId = e.target.getAttribute('data-addco');
    if (!addId) return;
    const item = DB.inventory.find(i=>i.id===addId);
    if (item && typeof onAdd==='function') onAdd(item);
  });

  render();

  return { refresh: render };
}


