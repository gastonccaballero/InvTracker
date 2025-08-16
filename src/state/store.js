// In-memory cache mirroring server data
export const DB = { settings:{}, inventory:[], events:[], checkouts:[], activity:[] };
export const byId = (arr, id) => arr.find(x=>x.id===id);
export const idxById = (arr, id) => arr.findIndex(x=>x.id===id);


