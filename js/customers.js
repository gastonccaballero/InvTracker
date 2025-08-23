// Customers Module

// Icon functions
function getEditIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}

function getDeleteIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/>
    <line x1="14" x2="14" y1="11" y2="17"/>
  </svg>`;
}

// Modal function
function showConfirmModal(message, onConfirm, onCancel = null) {
  // Remove any existing confirmation modal
  const existingModal = document.getElementById('confirmModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modalHTML = `
    <div id="confirmModal" class="confirm-modal">
      <div class="confirm-modal-content">
        <div class="confirm-modal-header">
          <h3>Confirm Action</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${message}</p>
        </div>
        <div class="confirm-modal-actions">
          <button class="btn ghost" id="confirmCancel">Cancel</button>
          <button class="btn warn" id="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = $('#confirmModal');
  const cancelBtn = $('#confirmCancel');
  const deleteBtn = $('#confirmDelete');

  // Handle cancel
  const handleCancel = () => {
    modal.remove();
    if (onCancel) onCancel();
  };

  // Handle confirm
  const handleConfirm = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };

  // Add event listeners
  cancelBtn.onclick = handleCancel;
  deleteBtn.onclick = handleConfirm;

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Focus the delete button for accessibility
  deleteBtn.focus();
}

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
        <button class="btn-icon btn-edit" data-edit="${c.id}" title="Edit">${getEditIcon()}</button>
        <button class="btn-icon btn-delete" data-del="${c.id}" title="Delete">${getDeleteIcon()}</button>
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
    if(c) {
      showConfirmModal(`Are you sure you want to delete customer "${c.name}"?`, async () => {
        try{ 
          await api.deleteCustomer(delId); 
          DB.customers = (DB.customers||[]).filter(x=>x.id!==delId); 
          renderCustomers(); 
          if (typeof renderCheckouts === 'function') renderCheckouts(); 
        }
        catch(err){ 
          console.error('Failed to delete customer', err); 
          alert('Failed to delete customer.'); 
        }
      });
    }
  }
}
