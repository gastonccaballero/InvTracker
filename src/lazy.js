export async function loadTab(id){
  if(id==='tab-inventory'){
    const mod = await import('./features/inventory/view.js');
    return { mount: () => mod.mountInventory?.() };
  }
  if(id==='tab-events'){
    const mod = await import('./features/events/view.js');
    return { mount: () => mod.mountEvents?.() };
  }
  if(id==='tab-checkout'){
    const mod = await import('./features/checkout/builder.js');
    return { mount: () => mod.mountCheckout?.() };
  }
  if(id==='tab-reports'){
    const mod = await import('./features/reports/view.js');
    return { mount: () => mod.mountReports?.() };
  }
  return { mount: ()=>({}) };
}


