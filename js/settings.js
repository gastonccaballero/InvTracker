// Settings Management Module

// Global references
const settingsDlg = $('#settingsDialog');
const settingsForm = $('#settingsForm');

// Initialize settings functionality
function initSettings() {
    $('#btnSettings').onclick = openSettingsDialog;
    $('#btnSaveSettings').onclick = saveSettingsHandler;
    settingsDlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => settingsDlg.close());
}

// Open settings dialog
function openSettingsDialog() {
    const s = DB.settings || {};
    settingsForm.biz_name.value = s.business_name || '';
    settingsForm.biz_phone.value = s.business_phone || '';
    settingsForm.biz_address.value = s.business_address || '';
    settingsForm.biz_email.value = s.business_email || '';
    settingsForm.logo.value = s.business_logo || '';
    settingsForm.currency.value = s.currency_symbol || '$';
    settingsForm.tax.value = s.tax_rate || 0;
    settingsDlg.showModal();
}

// Save settings handler
async function saveSettingsHandler() {
    const settings = {
        currency_symbol: settingsForm.currency.value || '$',
        tax_rate: Number(settingsForm.tax.value || 0),
        business_name: settingsForm.biz_name.value || 'Your Company',
        business_phone: settingsForm.biz_phone.value || '',
        business_address: settingsForm.biz_address.value || '',
        business_email: settingsForm.biz_email.value || '',
        business_logo: settingsForm.logo.value || ''
    };
    
    const success = await saveSettings(settings);
    if (success) {
        settingsDlg.close();
        if (typeof renderReports === 'function') renderReports();
    } else {
        alert('Failed to save settings. Please try again.');
    }
}
