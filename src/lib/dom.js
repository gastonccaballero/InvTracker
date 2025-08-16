export const $  = (sel, el=document) => el.querySelector(sel);
export const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
export function on(el, evt, selector, handler){
  el.addEventListener(evt, e=>{
    const t = e.target.closest(selector);
    if(t && el.contains(t)) handler(e, t);
  });
}
export const escapeHtml = (s='') => s.toString()
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
export const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
export const nowISO = () => new Date().toISOString();
export const fmtMoney = (n=0, sym='$') => sym + Number(n||0).toFixed(2);


