import { $ } from '../../lib/dom.js';
import { DB } from '../../state/store.js';
import { updateSettings } from '../../state/actions.js';

export function mountSettings(){
  const dlg = $('#settingsDialog');
  const form = $('#settingsForm');
  const btnOpen = $('#btnSettings');
  const btnSave = $('#btnSaveSettings');

  btnOpen?.addEventListener('click', ()=> dlg.showModal());
  dlg?.addEventListener('click', e => { if (e.target?.hasAttribute?.('data-close')) dlg.close(); });

  // Pre-fill using server field names
  const s = DB.settings || {};
  form.biz_name.value = s.business_name || '';
  form.biz_phone.value = s.business_phone || '';
  form.biz_address.value = s.business_address || '';
  form.biz_email.value = s.business_email || '';
  form.logo.value = s.business_logo || '';
  form.currency.value = s.currency_symbol || '$';
  form.tax.value = s.tax_rate ?? 0;

  btnSave?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const next = {
      business_name: data.biz_name||'',
      business_phone: data.biz_phone||'',
      business_address: data.biz_address||'',
      business_email: data.biz_email||'',
      business_logo: data.logo||'',
      currency_symbol: data.currency || '$',
      tax_rate: Number(data.tax||0)
    };
    try {
      await updateSettings(next);
      dlg.close();
    } catch (err) { console.error('Failed to save settings', err); }
  });
}


