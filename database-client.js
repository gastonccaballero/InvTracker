// Database Client for InvTracker - Replaces localStorage functionality

// Global data storage
let DB = {
  settings: {},
  inventory: [],
  events: [],
  checkouts: [],
  activity: []
};

// Utility functions
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function byId(arr, id) { return arr.find(x => x.id === id); }
function idxById(arr, id) { return arr.findIndex(x => x.id === id); }
function fmtMoney(n, sym) { return (sym || '$') + Number(n || 0).toFixed(2); }
function escapeHtml(s) { return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// API Client
class InvTrackerAPI {
  constructor() {
    this.baseURL = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Inventory
  async getInventory() {
    return this.request('/inventory');
  }

  async createInventoryItem(item) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  async updateInventoryItem(id, item) {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
  }

  async deleteInventoryItem(id) {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE'
    });
  }

  // Events
  async getEvents() {
    return this.request('/events');
  }

  async createEvent(event) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }

  async updateEvent(id, event) {
    return this.request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event)
    });
  }

  async deleteEvent(id) {
    return this.request(`/events/${id}`, {
      method: 'DELETE'
    });
  }

  // Checkouts
  async getCheckouts() {
    return this.request('/checkouts');
  }

  async createCheckout(checkout) {
    return this.request('/checkouts', {
      method: 'POST',
      body: JSON.stringify(checkout)
    });
  }

  async getCheckoutItems(checkoutId) {
    return this.request(`/checkouts/${checkoutId}/items`);
  }

  async processReturns(checkoutId, returns) {
    return this.request(`/checkouts/${checkoutId}/returns`, {
      method: 'POST',
      body: JSON.stringify({ returns })
    });
  }

  // Activity
  async getActivity() {
    return this.request('/activity');
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }
}

// Global API instance
const api = new InvTrackerAPI();

// Database loading functions
async function loadData() {
  try {
    console.log('Loading data from database...');
    
    // Load all data in parallel
    const [settings, inventory, events, checkouts, activity] = await Promise.all([
      api.getSettings(),
      api.getInventory(),
      api.getEvents(),
      api.getCheckouts(),
      api.getActivity()
    ]);

    // Update global DB object
    DB.settings = settings || {};
    DB.inventory = inventory || [];
    DB.events = events || [];
    DB.checkouts = checkouts || [];
    DB.activity = activity || [];

    console.log('Data loaded successfully:', {
      settings: DB.settings,
      inventory: DB.inventory.length,
      events: DB.events.length,
      checkouts: DB.checkouts.length,
      activity: DB.activity.length
    });

    return true;
  } catch (error) {
    console.error('Failed to load data:', error);
    return false;
  }
}

// Save functions (now async)
async function saveSettings(settings) {
  try {
    const updated = await api.updateSettings(settings);
    DB.settings = updated;
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

async function saveInventoryItem(item) {
  try {
    if (item.id && byId(DB.inventory, item.id)) {
      // Update existing item
      const updated = await api.updateInventoryItem(item.id, item);
      const idx = idxById(DB.inventory, item.id);
      DB.inventory[idx] = updated;
    } else {
      // Create new item
      const newItem = await api.createInventoryItem(item);
      DB.inventory.unshift(newItem);
    }
    return true;
  } catch (error) {
    console.error('Failed to save inventory item:', error);
    return false;
  }
}

async function deleteInventoryItem(id) {
  try {
    await api.deleteInventoryItem(id);
    DB.inventory = DB.inventory.filter(item => item.id !== id);
    return true;
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    return false;
  }
}

async function saveEvent(event) {
  try {
    if (event.id && byId(DB.events, event.id)) {
      // Update existing event
      const updated = await api.updateEvent(event.id, event);
      const idx = idxById(DB.events, event.id);
      DB.events[idx] = updated;
    } else {
      // Create new event
      const newEvent = await api.createEvent(event);
      DB.events.unshift(newEvent);
    }
    return true;
  } catch (error) {
    console.error('Failed to save event:', error);
    return false;
  }
}

async function deleteEvent(id) {
  try {
    await api.deleteEvent(id);
    DB.events = DB.events.filter(event => event.id !== id);
    return true;
  } catch (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
}

async function saveCheckout(checkout) {
  try {
    const newCheckout = await api.createCheckout(checkout);
    DB.checkouts.unshift(newCheckout);
    return true;
  } catch (error) {
    console.error('Failed to save checkout:', error);
    return false;
  }
}

async function processReturns(checkoutId, returns) {
  try {
    const result = await api.processReturns(checkoutId, returns);
    // Reload checkouts to get updated data
    DB.checkouts = await api.getCheckouts();
    return result;
  } catch (error) {
    console.error('Failed to process returns:', error);
    return false;
  }
}

async function refreshData() {
  await loadData();
  // Trigger UI updates
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof renderEvents === 'function') renderEvents();
  if (typeof renderCheckouts === 'function') renderCheckouts();
  if (typeof renderReports === 'function') renderReports();
}

// Initialize data loading when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing InvTracker with database...');
  const success = await loadData();
  if (success) {
    console.log('✅ InvTracker initialized with database connection');
    // Trigger a custom event to notify that data is loaded
    window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: { success: true } }));
  } else {
    console.error('❌ Failed to initialize with database');
    window.dispatchEvent(new CustomEvent('databaseLoaded', { detail: { success: false } }));
  }
});
