/**
 * IndexedDB layer for Solo Books - primary local storage.
 * No Firestore/backend calls except login. Backup to online is explicit (Backup page).
 */
const DB_NAME = 'SoloBooksDB';
// NOTE:
// IndexedDB version numbers are not allowed to go backwards.
// If a user previously ran a build that created the DB with a higher version
// and we now open with a lower version, the browser throws:
// "The requested version (x) is less than the existing version (y)".
//
// We keep a minimum expected version, but we will open with the existing
// version when available to avoid downgrades.
const DB_VERSION = 1;
const STORE_NAME = 'businessData';

let dbInstance = null;

async function getExistingDbVersion() {
  // `indexedDB.databases()` is supported in modern Chromium/Edge.
  // If unavailable, we'll just fall back to opening without specifying a version.
  try {
    if (typeof indexedDB.databases !== 'function') return null;
    const dbs = await indexedDB.databases();
    const found = dbs.find(d => d && d.name === DB_NAME);
    return found ? found.version : null;
  } catch (_) {
    return null;
  }
}

async function openDB() {
  if (dbInstance) return dbInstance;

  const existingVersion = await getExistingDbVersion();
  const initialVersion =
    typeof existingVersion === 'number' ? Math.max(DB_VERSION, existingVersion) : null;

  const openWith = (versionOrNull) =>
    new Promise((resolve, reject) => {
      const request =
        versionOrNull != null ? indexedDB.open(DB_NAME, versionOrNull) : indexedDB.open(DB_NAME);

      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create the store if it doesn't exist yet.
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

  // 1) Open with existing/current version (avoid downgrades).
  // 2) If objectStore is missing, force an upgrade by bumping version by +1
  //    so `onupgradeneeded` runs and we can create it.
  try {
    const db = await openWith(initialVersion);
    if (db.objectStoreNames.contains(STORE_NAME)) {
      dbInstance = db;
      return dbInstance;
    }

    // Store missing: force upgrade.
    db.close();
    const forcedVersion =
      typeof existingVersion === 'number' ? existingVersion + 1 : DB_VERSION + 1;
    const dbAfterUpgrade = await openWith(forcedVersion);
    if (!dbAfterUpgrade.objectStoreNames.contains(STORE_NAME)) {
      throw new Error(
        `IndexedDB opened but '${STORE_NAME}' store is still missing after upgrade.`
      );
    }
    dbInstance = dbAfterUpgrade;
    return dbInstance;
  } catch (err) {
    // If we can't upgrade (e.g., version downgrade), advise the user to clear IndexedDB.
    throw new Error(
      `${err?.message || err}\n` +
        `If this persists, clear your browser's IndexedDB for this app and try restoring again.`
    );
  }
}

/**
 * Get stored data for a user (all businesses). Returns null if not found.
 * @param {string} userId - Firebase Auth UID
 */
export async function getLocalData(userId) {
  if (!userId) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save all business data for a user to IndexedDB.
 * @param {string} userId - Firebase Auth UID
 * @param {Object} businessData - { [businessId]: { id, name, ..., data: { parties, items, ... } } }
 */
export async function setLocalData(userId, businessData) {
  if (!userId) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ userId, data: businessData, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear local data for a user (e.g. on logout).
 */
export async function clearLocalData(userId) {
  if (!userId) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export default { getLocalData, setLocalData, clearLocalData, openDB };
