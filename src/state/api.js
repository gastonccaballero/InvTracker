export class InvTrackerAPI {
  constructor(baseURL = '/api') { this.baseURL = baseURL; }
  async request(endpoint, options = {}) {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
      ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
  // Settings
  getSettings() { return this.request('/settings'); }
  updateSettings(body){ return this.request('/settings',{ method:'PUT', body:JSON.stringify(body) }); }
  // Inventory
  getInventory(){ return this.request('/inventory'); }
  createInventoryItem(b){ return this.request('/inventory',{ method:'POST', body:JSON.stringify(b) }); }
  updateInventoryItem(id,b){ return this.request(`/inventory/${id}`,{ method:'PUT', body:JSON.stringify(b) }); }
  deleteInventoryItem(id){ return this.request(`/inventory/${id}`,{ method:'DELETE' }); }
  // Events
  getEvents(){ return this.request('/events'); }
  createEvent(b){ return this.request('/events',{ method:'POST', body:JSON.stringify(b) }); }
  updateEvent(id,b){ return this.request(`/events/${id}`,{ method:'PUT', body:JSON.stringify(b) }); }
  deleteEvent(id){ return this.request(`/events/${id}`,{ method:'DELETE' }); }
  // Checkouts
  getCheckouts(){ return this.request('/checkouts'); }
  createCheckout(b){ return this.request('/checkouts',{ method:'POST', body:JSON.stringify(b) }); }
  getCheckoutItems(id){ return this.request(`/checkouts/${id}/items`); }
  processReturns(id, returns){ return this.request(`/checkouts/${id}/returns`,{ method:'POST', body:JSON.stringify({ returns }) }); }
  // Activity/Stats
  getActivity(){ return this.request('/activity'); }
  getStats(){ return this.request('/stats'); }
}
export const api = new InvTrackerAPI();


