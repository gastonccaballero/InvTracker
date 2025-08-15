// API Client for InvTracker
const API_BASE = '/api';

class InvTrackerAPI {
  constructor() {
    this.baseURL = API_BASE;
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
