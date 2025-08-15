// Events Management Module

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
                <button class="ghost" data-evted="${e.id}">Edit</button>
                <button class="ghost" data-evtdel="${e.id}">Delete</button>
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
        if (ev && confirm('Delete this event?')) {
            const success = await deleteEvent(del);
            if (success) {
                renderEvents();
                if (typeof renderCheckouts === 'function') renderCheckouts();
                if (typeof renderReports === 'function') renderReports();
            } else {
                alert('Failed to delete event. Please try again.');
            }
        }
    }
}
