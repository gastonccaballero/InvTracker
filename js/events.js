// Events Management Module

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

// Global references
const evtBody = $('#evtBody');
const evtCount = $('#evtCount');
const evtSearch = $('#evtSearch');
const evtDialog = $('#evtDialog');
const evtForm = $('#evtForm');

// Initialize events functionality
function initEvents() {
    // Set up event listeners
    evtSearch.oninput = renderEvents;
    $('#btnAddEvent').onclick = () => openEventDialog();
    evtDialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => evtDialog.close());
    $('#btnSaveEvent').onclick = saveEventHandler;
    evtBody.addEventListener('click', handleEventActions);
    
    // Initial render
    renderEvents();
}

// Render events table
function renderEvents() {
    const q = (evtSearch.value || '').toLowerCase();
    const rows = DB.events.filter(e => ([e.name, e.client, e.location].join(' ').toLowerCase().includes(q)))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map(e => `<tr>
            <td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.client || '')}</td>
            <td>${escapeHtml(e.date || '')}</td>
            <td>${escapeHtml(e.location || '')}</td>
            <td><span class="badge">${escapeHtml(e.status || 'planned')}</span></td>
            <td>${escapeHtml(e.contact || '')}</td>
            <td class="row-actions">
                <button class="btn-icon btn-edit" data-evted="${e.id}" title="Edit">${getEditIcon()}</button>
                <button class="btn-icon btn-delete" data-evtdel="${e.id}" title="Delete">${getDeleteIcon()}</button>
            </td>
        </tr>`).join('');
    
    evtBody.innerHTML = rows || `<tr><td colspan="7" style="color:#9ab">No events. Click <em>Add Event</em>.</td></tr>`;
    evtCount.textContent = `${DB.events.length} events (${rows ? rows.match(/<tr>/g)?.length || 0 : 0} shown)`;
    
    // refresh event dropdowns
    if (typeof fillEventSelects === 'function') fillEventSelects();
}

// Open event dialog
function openEventDialog(ev = null) {
    $('#evtDialogTitle').textContent = ev ? 'Edit Event' : 'New Event';
    evtForm.reset();
    
    if (ev) {
        evtForm.id.value = ev.id || '';
        evtForm.name.value = ev.name || '';
        evtForm.client.value = ev.client || '';
        evtForm.date.value = ev.date || '';
        evtForm.location.value = ev.location || '';
        evtForm.contact.value = ev.contact || '';
        evtForm.status.value = ev.status || 'planned';
        evtForm.notes.value = ev.notes || '';
    } else {
        evtForm.id.value = '';
    }
    
    evtDialog.showModal();
}

// Save event handler
async function saveEventHandler() {
    const f = new FormData(evtForm);
    const ev = {
        id: evtForm.id.value || uid(),
        name: (f.get('name') || '').toString().trim(),
        client: (f.get('client') || '').toString().trim(),
        date: (f.get('date') || '').toString(),
        location: (f.get('location') || '').toString().trim(),
        contact: (f.get('contact') || '').toString().trim(),
        notes: (f.get('notes') || '').toString(),
        status: (f.get('status') || 'planned').toString(),
        updated_at: nowISO()
    };
    
    const success = await saveEvent(ev);
    if (success) {
        evtDialog.close();
        renderEvents();
        if (typeof renderCheckouts === 'function') renderCheckouts();
        if (typeof renderReports === 'function') renderReports();
    } else {
        alert('Failed to save event. Please try again.');
    }
}

// Handle event actions (edit/delete)
async function handleEventActions(e) {
    const ed = e.target.getAttribute('data-evted');
    const del = e.target.getAttribute('data-evtdel');
    
    if (ed) {
        const ev = byId(DB.events, ed);
        if (ev) openEventDialog(ev);
    }
    
    if (del) {
        const ev = byId(DB.events, del);
        if (ev) {
            showConfirmModal(`Are you sure you want to delete "${ev.name}"?`, async () => {
                const success = await deleteEvent(del);
                if (success) {
                    renderEvents();
                    if (typeof renderCheckouts === 'function') renderCheckouts();
                    if (typeof renderReports === 'function') renderReports();
                } else {
                    alert('Failed to delete event. Please try again.');
                }
            });
        }
    }
}
