// Modal utilities
import { $ } from './dom.js';

// Create and show a confirmation modal
export function showConfirmModal(message, onConfirm, onCancel = null) {
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

