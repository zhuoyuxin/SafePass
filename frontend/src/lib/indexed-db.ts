import type { EncryptedVaultEnvelope } from "../types";

const DB_NAME = "password-vault-db";
const STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "latest-envelope";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveLocalEnvelope = async (
  envelope: EncryptedVaultEnvelope
): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(envelope, SNAPSHOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const loadLocalEnvelope = async (): Promise<EncryptedVaultEnvelope | null> => {
  const db = await openDb();
  const value = await new Promise<EncryptedVaultEnvelope | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    request.onsuccess = () =>
      resolve((request.result as EncryptedVaultEnvelope | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
};

