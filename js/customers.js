// Customers Module

const custBody = $('#custBody');
const custCount = $('#custCount');
const custSearch = $('#custSearch');
const custDialog = $('#custDialog');
const custForm = $('#custForm');

function initCustomers(){
  custSearch.oninput = renderCustomers;
  $('#btnAddCustomer').onclick = ()=> openCustomerDialog();
  custDialog.querySelectorAll('[data-close]').forEach(b=> b.onclick = ()=> custDialog.close());
  $('#btnSaveCustomer').onclick = saveCustomerHandler;
  custBody.addEventListener('click', handleCustomerActions);
  renderCustomers();
}

function renderCustomers(){
  const q = (custSearch.value||'').toLowerCase();
  const rows = (DB.customers||[]).filter(c=>{
    return [c.name,c.contact,c.email,c.phone].join(' ').toLowerCase().includes(q);
  }).map(c=>{
    const curSym = DB.settings?.currency_symbol || DB.settings?.currencySymbol || '$';
    const disc = !c.discount_type || c.discount_type==='none' ? '—' : (c.discount_type==='percent' ? `${Number(c.discount_value||0)}%` : fmtMoney(c.discount_value||0, curSym));
    return `<tr>
      <td>${escapeHtml(c.name||'')}</td>
      <td>${escapeHtml(c.contact||'')}</td>
      <td>${escapeHtml(c.email||'')}</td>
      <td>${escapeHtml(c.phone||'')}</td>
      <td>${disc}</td>
      <td>${escapeHtml(c.notes||'')}</td>
      <td class="row-actions">
        <button class="ghost" data-edit="${c.id}">Edit</button>
        <button class="ghost" data-del="${c.id}">Delete</button>
      </td>
    </tr>`;
  }).join('');
  custBody.innerHTML = rows || `<tr><td colspan="7" style="color:#9ab">No customers yet. Click <em>Add Customer</em>.</td></tr>`;
  custCount.textContent = `${(DB.customers||[]).length} customers (${rows ? rows.match(/<tr>/g)?.length || 0 : 0} shown)`;
}

function openCustomerDialog(customer=null){
  $('#custDialogTitle').textContent = customer ? 'Edit Customer' : 'New Customer';
  custForm.reset();
  custForm.id.value = customer?.id || '';
  custForm.name.value = customer?.name || '';
  custForm.contact.value = customer?.contact || '';
  custForm.email.value = customer?.email || '';
  custForm.phone.value = customer?.phone || '';
  custForm.discount_type.value = customer?.discount_type || 'none';
  custForm.discount_value.value = customer?.discount_value ?? 0;
  custForm.notes.value = customer?.notes || '';
  custDialog.showModal();
}

async function saveCustomerHandler(){
  const f = new FormData(custForm);
  const existingId = custForm.id.value.trim();
  const isNew = !existingId;
  const customer = {
    id: isNew ? uid() : existingId,
    name: (f.get('name')||'').toString().trim(),
    contact: (f.get('contact')||'').toString().trim(),
    email: (f.get('email')||'').toString().trim(),
    phone: (f.get('phone')||'').toString().trim(),
    discount_type: (f.get('discount_type')||'none').toString(),
    discount_value: Number(f.get('discount_value')||0),
    notes: (f.get('notes')||'').toString(),
    updated_at: nowISO()
  };
  if(!customer.name){ alert('Customer name is required'); return; }
  if(isNew) customer.created_at = nowISO();
  try{
    if(isNew){
      const created = await api.createCustomer(customer);
      DB.customers.unshift(created);
    }else{
      const updated = await api.updateCustomer(customer.id, customer);
      const idx = (DB.customers||[]).findIndex(x=>x.id===customer.id);
      if(idx>=0) DB.customers[idx] = updated; else DB.customers.unshift(updated);
    }
    custDialog.close();
    renderCustomers();
    if (typeof renderReports === 'function') renderReports();
    if (typeof renderCheckouts === 'function') renderCheckouts();
  }catch(err){ console.error('Failed to save customer', err); alert('Failed to save customer.'); }
}

async function handleCustomerActions(e){
  const editId = e.target.getAttribute('data-edit');
  const delId = e.target.getAttribute('data-del');
  if(editId){ const c = byId(DB.customers||[], editId); if(c) openCustomerDialog(c); return; }
  if(delId){
    const c = byId(DB.customers||[], delId);
    if(c && !confirm(`Delete customer “${c.name}”?`)) return;
    try{ await api.deleteCustomer(delId); DB.customers = (DB.customers||[]).filter(x=>x.id!==delId); renderCustomers(); if (typeof renderCheckouts === 'function') renderCheckouts(); }
    catch(err){ console.error('Failed to delete customer', err); alert('Failed to delete customer.'); }
  }
}
