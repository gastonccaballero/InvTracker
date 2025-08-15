import { api } from './api.js';
import { DB, byId, idxById } from './store.js';

// Settings
export async function updateSettings(settings){
  const updated = await api.updateSettings(settings);
  DB.settings = updated;
  return updated;
}

// Inventory
export async function upsertInventory(item){
  if (item.id && byId(DB.inventory, item.id)) {
    const updated = await api.updateInventoryItem(item.id, item);
    DB.inventory[idxById(DB.inventory, item.id)] = updated;
    return updated;
  } else {
    const created = await api.createInventoryItem(item);
    DB.inventory.unshift(created);
    return created;
  }
}
export async function removeInventory(id){
  await api.deleteInventoryItem(id);
  DB.inventory = DB.inventory.filter(i=>i.id!==id);
}

// Events
export async function upsertEvent(evt){
  if (evt.id && byId(DB.events, evt.id)) {
    const updated = await api.updateEvent(evt.id, evt);
    DB.events[idxById(DB.events, evt.id)] = updated;
    return updated;
  } else {
    const created = await api.createEvent(evt);
    DB.events.unshift(created);
    return created;
  }
}
export async function removeEvent(id){
  await api.deleteEvent(id);
  DB.events = DB.events.filter(e=>e.id!==id);
}

// Checkouts / Returns
export async function createCheckout(payload){
  const co = await api.createCheckout(payload);
  DB.checkouts.unshift(co);
  return co;
}
export async function submitReturns(checkoutId, returns){
  const res = await api.processReturns(checkoutId, returns);
  DB.checkouts = await api.getCheckouts(); // refresh to server truth
  return res;
}


