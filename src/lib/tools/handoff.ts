/**
 * Pasa las fotos de "Fotos con logo" a "Video" sin volver a subirlas.
 *
 * Las páginas son distintas, así que las fotos se dejan un momento en
 * IndexedDB (acepta archivos) y se borran apenas la otra página las lee.
 * Si el navegador no lo permite (modo privado, etc.), el usuario simplemente
 * vuelve a subir las fotos.
 */

const DB = "rhl-tools";
const STORE = "handoff";
const KEY = "photos";
/** Un traspaso más viejo que esto ya no corresponde a lo que el usuario está haciendo. */
const MAX_AGE_MS = 10 * 60 * 1000;

interface Handoff {
  files: File[];
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export async function saveHandoff(files: File[]): Promise<boolean> {
  try {
    const value: Handoff = { files, createdAt: Date.now() };
    await run("readwrite", (s) => s.put(value, KEY));
    return true;
  } catch {
    return false;
  }
}

/** Lee y borra el traspaso. */
export async function takeHandoff(): Promise<File[] | null> {
  try {
    const value = await run<Handoff | undefined>("readonly", (s) => s.get(KEY));
    await run("readwrite", (s) => s.delete(KEY));
    if (!value || Date.now() - value.createdAt > MAX_AGE_MS) return null;
    return value.files;
  } catch {
    return null;
  }
}
