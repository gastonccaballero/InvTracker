import { $, escapeHtml, uid, nowISO } from '../../lib/dom.js';
import { DB, byId } from '../../state/store.js';
import { upsertEvent, removeEvent } from '../../state/actions.js';
import { getEditIcon, getDeleteIcon } from '../../lib/icons.js';
import { showConfirmModal } from '../../lib/modal.js';

function renderTable(){
  const q = ($('#evtSearch').value||'').toLowerCase();
  const rows = DB.events
    .filter(e => ([e.name, e.client, e.location].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    .map(e => `<tr>
      <td>${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.client||'')}</td>
      <td>${escapeHtml(e.date||'')}</td>
      <td>${escapeHtml(e.location||'')}</td>
      <td><span class="badge">${escapeHtml(e.status||'planned')}</span></td>
      <td>${escapeHtml(e.contact||'')}</td>
      <td class="row-actions">
        <button class="btn-icon btn-edit" data-evted="${e.id}" title="Edit">${getEditIcon()}</button>
        <button class="btn-icon btn-delete" data-evtdel="${e.id}" title="Delete">${getDeleteIcon()}</button>
      </td>
    </tr>`).join('');
  $('#evtBody').innerHTML = rows || `<tr><td colspan="7" style="color:#9ab">No events. Click <em>Add Event</em>.</td></tr>`;
  $('#evtCount').textContent = `${DB.events.length} events (${rows ? rows.match(/<tr>/g)?.length || 0 : 0} shown)`;
}

function openDialog(data=null){
  const dlg = $('#evtDialog');
  const form = $('#evtForm');
  $('#evtDialogTitle').textContent = data ? 'Edit Event' : 'New Event';
  form.reset();
  if (data){
    form.id.value = data.id || '';
    form.name.value = data.name || '';
    form.client.value = data.client || '';
    form.date.value = data.date || '';
    form.location.value = data.location || '';
    form.contact.value = data.contact || '';
    form.status.value = data.status || 'planned';
    form.notes.value = data.notes || '';
  } else {
    form.id.value = '';
  }
  dlg.showModal();
}

async function onSave(){
  const form = $('#evtForm');
  const f = new FormData(form);
  const id = form.id.value || uid();
  const payload = {
    id,
    name: (f.get('name')||'').toString().trim(),
    client: (f.get('client')||'').toString().trim(),
    date: (f.get('date')||'').toString(),
    location: (f.get('location')||'').toString().trim(),
    contact: (f.get('contact')||'').toString().trim(),
    notes: (f.get('notes')||'').toString(),
    status: (f.get('status')||'planned').toString(),
    updated_at: nowISO()
  };
  try{
    await upsertEvent(payload);
    $('#evtDialog').close();
    renderTable();
  }catch(err){
    console.error('Failed to save event', err);
    alert('Failed to save event.');
  }
}

function wire(){
  $('#evtSearch').oninput = renderTable;
  $('#btnAddEvent').onclick = ()=> openDialog();
  $('#evtDialog')?.querySelectorAll('[data-close]')?.forEach(b=> b.onclick = ()=> $('#evtDialog').close());
  $('#btnSaveEvent').onclick = onSave;
  $('#evtBody').addEventListener('click', async (e)=>{
    const ed = e.target.getAttribute('data-evted');
    const del = e.target.getAttribute('data-evtdel');
    if (ed){ const ev = byId(DB.events, ed); if (ev) openDialog(ev); }
    if (del){
      const ev = byId(DB.events, del);
      if (ev) {
        showConfirmModal(`Are you sure you want to delete "${ev.name}"?`, async () => {
          await removeEvent(del);
          renderTable();
        });
      }
    }
  });
}

export function mountEvents(){
  renderTable();
  wire();
}


