// Almacenamiento local en IndexedDB. Todo queda en el dispositivo.
const DB_NAME = 'agugu';
const DB_VERSION = 1;

let dbPromise;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('growth')) {
        const g = db.createObjectStore('growth', { keyPath: 'id' });
        g.createIndex('date', 'date');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; }, reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// Perfil
export const getProfile = () => tx('kv', 'readonly', (s) => promisify(s.get('profile')));
export const saveProfile = (p) => tx('kv', 'readwrite', (s) => promisify(s.put(p, 'profile')));

// Momentos
export const listEntries = async () => {
  const all = await tx('entries', 'readonly', (s) => promisify(s.getAll()));
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
};
export const getEntry = (id) => tx('entries', 'readonly', (s) => promisify(s.get(id)));
export const saveEntry = (e) => tx('entries', 'readwrite', (s) => promisify(s.put(e)));
export const deleteEntry = (id) => tx('entries', 'readwrite', (s) => promisify(s.delete(id)));

// Crecimiento
export const listGrowth = async () => {
  const all = await tx('growth', 'readonly', (s) => promisify(s.getAll()));
  return all.sort((a, b) => a.date.localeCompare(b.date));
};
export const saveGrowth = (g) => tx('growth', 'readwrite', (s) => promisify(s.put(g)));
export const deleteGrowth = (id) => tx('growth', 'readwrite', (s) => promisify(s.delete(id)));

// Copia de seguridad
export async function clearAll() {
  await tx('kv', 'readwrite', (s) => promisify(s.clear()));
  await tx('entries', 'readwrite', (s) => promisify(s.clear()));
  await tx('growth', 'readwrite', (s) => promisify(s.clear()));
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* sin soporte */ }
  return false;
}
