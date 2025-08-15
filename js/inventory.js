// Inventory Management Module

// Global references
const invBody = $('#invBody');
const invCount = $('#invCount');
const invSearch = $('#invSearch');
const invFilterCategory = $('#invFilterCategory');
const invFilterLow = $('#invFilterLow');
const invDialog = $('#invDialog');
const invForm = $('#invForm');

// Initialize inventory functionality
function initInventory() {
    // Set up event listeners
    invSearch.oninput = invFilterCategory.oninput = invFilterLow.oninput = renderInventory;
    $('#btnAddItem').onclick = () => openItemDialog();
    invDialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => invDialog.close());
    $('#btnSaveItem').onclick = saveInventoryItemHandler;
    invBody.addEventListener('click', handleInventoryActions);
    
    // Image upload functionality
    setupImageUpload();
    
    // Initial render
    renderInventory();
}

// Render inventory table
function renderInventory() {
    // Get category filter options
    const cats = inventoryCategories();
    invFilterCategory.innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option>${escapeHtml(c)}</option>`).join('');
    
    // Filter items
    const q = (invSearch.value || '').toLowerCase();
    const cat = invFilterCategory.value || '';
    const low = invFilterLow.value;
    
    const rows = DB.inventory.filter(i => {
        const matches = [i.sku, i.name, i.category].join(' ').toLowerCase().includes(q);
        const catOk = !cat || (i.category || '') === cat;
        const lowOk = !low || (low === 'low' ? (i.qty_available <= (i.safety_stock || 0)) : (i.qty_available > (i.safety_stock || 0)));
        return matches && catOk && lowOk;
    }).map(i => {
        const lowCls = i.qty_available <= (i.safety_stock || 0) ? 'low' : 'good';
        const tags = (i.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        const imageCell = i.image_path ? 
            `<img src="${escapeHtml(i.image_path)}" alt="${escapeHtml(i.name)}" class="inventory-image" onerror="this.style.display='none'">` : 
            '<div style="width:40px;height:40px;background:#1b2330;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#a7b0bf;font-size:12px;">📦</div>';
        
        return `<tr>
            <td>${imageCell}</td>
            <td><small class="mono">${escapeHtml(i.sku)}</small></td>
            <td>${escapeHtml(i.name)}</td>
            <td>${escapeHtml(i.category || '')}</td>
            <td>${escapeHtml(i.location || '')}</td>
            <td>${escapeHtml(i.unit || '')}</td>
            <td><span class="badge ${lowCls}">${i.qty_available}</span> / ${i.qty_total}</td>
            <td>${fmtMoney(i.price, DB.settings.currency_symbol || DB.settings.currencySymbol || '$')}</td>
            <td>${i.safety_stock || 0}</td>
            <td>${tags}</td>
            <td class="row-actions">
                <button class="ghost" data-edit="${i.id}">Edit</button>
                <button class="ghost" data-del="${i.id}">Delete</button>
            </td>
        </tr>`;
    }).join('');
    
    invBody.innerHTML = rows || `<tr><td colspan="10" style="color:#9ab">No items yet. Click <em>Add Item</em>.</td></tr>`;
    invCount.textContent = `${DB.inventory.length} items (${rows ? rows.match(/<tr>/g)?.length || 0 : 0} shown)`;
}

// Get inventory categories
function inventoryCategories() {
    return Array.from(new Set(DB.inventory.map(i => i.category).filter(Boolean))).sort();
}

// Open item dialog
function openItemDialog(item = null) {
    $('#invDialogTitle').textContent = item ? 'Edit Item' : 'New Item';
    
    // Reset image preview
    const previewImg = $('#previewImg');
    const uploadPlaceholder = $('#uploadPlaceholder');
    previewImg.style.display = 'none';
    uploadPlaceholder.style.display = 'flex';
    $('#btnRemoveImage').style.display = 'none';
    
    if (item) {
        // Editing existing item
        invForm.reset();
        invForm.id.value = item.id || '';
        invForm.sku.value = item.sku || '';
        invForm.name.value = item.name || '';
        invForm.category.value = item.category || '';
        invForm.location.value = item.location || '';
        invForm.unit.value = item.unit || '';
        invForm.safety_stock.value = item.safety_stock ?? 0;
        invForm.qty_total.value = item.qty_total ?? 0;
        invForm.qty_available.value = item.qty_available ?? (item.qty_total ?? 0);
        invForm.cost.value = item.cost ?? 0;
        invForm.price.value = item.price ?? 0;
        invForm.tags.value = (item.tags || []).join(', ');
        invForm.notes.value = item.notes || '';
        invForm.image_path.value = item.image_path || '';
        
        // Show existing image if available
        if (item.image_path) {
            previewImg.src = item.image_path;
            previewImg.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            $('#btnRemoveImage').style.display = 'inline-block';
        }
    } else {
        // Creating new item
        invForm.reset();
        // Explicitly clear the ID field for new items
        invForm.id.value = '';
        invForm.image_path.value = '';
        
        // Force clear the ID field again after a short delay to ensure it's empty
        setTimeout(() => {
            invForm.id.value = '';
        }, 10);
    }
    
    invDialog.showModal();
}

// Save inventory item handler
async function saveInventoryItemHandler() {
    const f = new FormData(invForm);
    
    // Generate ID for new items, use existing ID for updates
    const existingId = invForm.id.value.trim();
    const isNewItem = !existingId || existingId === '';
    
    let it = {
        id: isNewItem ? uid() : existingId,
        sku: (f.get('sku') || '').toString().trim(),
        name: (f.get('name') || '').toString().trim(),
        category: (f.get('category') || '').toString().trim(),
        location: (f.get('location') || '').toString().trim(),
        unit: (f.get('unit') || '').toString().trim(),
        safety_stock: Number(f.get('safety_stock') || 0),
        qty_total: Number(f.get('qty_total') || 0),
        qty_available: Number(f.get('qty_available') || (f.get('qty_total') || 0)),
        cost: Number(f.get('cost') || 0),
        price: Number(f.get('price') || 0),
        tags: (f.get('tags') || '').toString().split(',').map(t => t.trim()).filter(Boolean),
        notes: (f.get('notes') || '').toString(),
        image_path: (f.get('image_path') || '').toString().trim(),
        archived: false,
        updated_at: nowISO(),
    };
    
    // Check if updating existing item
    const idx = idxById(DB.inventory, it.id);
    if (idx >= 0) {
        // adjust qty_total vs available if needed
        const prev = DB.inventory[idx];
        if (it.qty_total < (prev.qty_total - prev.qty_available)) {
            alert('Total qty cannot be less than currently out on checkout.');
            return;
        }
    } else {
        it.created_at = nowISO();
    }
    
    const success = await saveInventoryItem(it);
    if (success) {
        invDialog.close();
        renderInventory();
        if (typeof refreshCOInventorySearch === 'function') refreshCOInventorySearch();
        if (typeof renderReports === 'function') renderReports();
    } else {
        alert('Failed to save item. Please try again.');
    }
}

// Handle inventory actions (edit/delete)
async function handleInventoryActions(e) {
    const editId = e.target.getAttribute('data-edit');
    const delId = e.target.getAttribute('data-del');
    
    if (editId) {
        const item = byId(DB.inventory, editId);
        if (item) openItemDialog(item);
    }
    
    if (delId) {
        const item = byId(DB.inventory, delId);
        if (item) {
            const outOnOrders = outQtyForItem(item.id);
            if (outOnOrders > 0 && !confirm(`This item has ${outOnOrders} out on checkouts. Delete anyway?`)) return;
            
            const success = await deleteInventoryItem(delId);
            if (success) {
                renderInventory();
                if (typeof refreshCOInventorySearch === 'function') refreshCOInventorySearch();
                if (typeof renderReports === 'function') renderReports();
            } else {
                alert('Failed to delete item. Please try again.');
            }
        }
    }
}

// Calculate out quantity for item
function outQtyForItem(itemId) {
    let out = 0;
    for (const co of DB.checkouts) {
        for (const l of co.items) {
            if (l.item_id === itemId) out += l.qty;
        }
        for (const r of (co.returns || [])) {
            if (r.item_id === itemId) out -= r.qty;
        }
    }
    return out;
}

// Image upload functionality
function setupImageUpload() {
    const imageUpload = $('#imageUpload');
    const btnUploadImage = $('#btnUploadImage');
    const btnRemoveImage = $('#btnRemoveImage');
    const imagePreview = $('#imagePreview');
    const previewImg = $('#previewImg');
    const uploadPlaceholder = $('#uploadPlaceholder');
    
    // Click to upload
    imagePreview.onclick = () => imageUpload.click();
    btnUploadImage.onclick = () => imageUpload.click();
    
    // File selection
    imageUpload.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Image file size must be less than 5MB.');
            return;
        }
        
        // Show loading state
        btnUploadImage.textContent = 'Uploading...';
        btnUploadImage.disabled = true;
        
        try {
            // Upload image
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update form and preview
                invForm.image_path.value = result.path;
                previewImg.src = result.path;
                previewImg.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
                btnRemoveImage.style.display = 'inline-block';
                
                console.log('Image uploaded successfully:', result.path);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            btnUploadImage.textContent = 'Upload Image';
            btnUploadImage.disabled = false;
        }
    };
    
    // Remove image
    btnRemoveImage.onclick = () => {
        invForm.image_path.value = '';
        previewImg.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        btnRemoveImage.style.display = 'none';
        imageUpload.value = '';
    };
}
