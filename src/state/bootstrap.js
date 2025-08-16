import { api } from './api.js';
import { DB } from './store.js';

export async function bootstrap(){
  const [settings, inventory, events, checkouts, activity] = await Promise.all([
    api.getSettings(), api.getInventory(), api.getEvents(), api.getCheckouts(), api.getActivity()
  ]);
  DB.settings = settings || {};
  DB.inventory = inventory || [];
  DB.events = events || [];
  DB.checkouts = checkouts || [];
  DB.activity = activity || [];
}


