import { $, $$, on } from './dom.js';
import { loadTab } from '../lazy.js';

export function initRouter() {
  const tabs = $$('.nav .tab');
  const loaded = new Set();
  on(document, 'click', '.nav .tab', (_e, btn) => {
    tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    $$('section').forEach(s=>s.classList.add('hidden'));
    $('#'+id).classList.remove('hidden');
    if(!loaded.has(id)){
      loaded.add(id);
      loadTab(id).then(m=>{ try{ m.mount?.(); }catch{} });
    }
  });
}


