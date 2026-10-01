import { openDB } from 'idb';

/** A report as stored in IndexedDB until it reaches the server. */
export interface OfflineMessage {
  id: number;
  content?: string;
  /** Text field used by older versions of the app */
  message?: string;
  category: string;
  attachment?: string | null;
  synced: boolean;
  createdAt: string;
}

type NewOfflineMessage = Omit<OfflineMessage, 'id' | 'createdAt'>;

const DB_NAME = 'crisisconnect';
const STORE_NAME = 'messages';

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveOfflineMessage(message: NewOfflineMessage) {
  const db = await getDB();
  await db.add(STORE_NAME, { ...message, createdAt: new Date().toISOString() });
}

export async function getAllMessages(): Promise<OfflineMessage[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function markMessageSynced(id: number) {
  const db = await getDB();
  const msg = await db.get(STORE_NAME, id);
  if (msg) {
    msg.synced = true;
    await db.put(STORE_NAME, msg);
  }
}

export async function clearSyncedMessages() {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  for (const msg of all) {
    if (msg.synced) await db.delete(STORE_NAME, msg.id);
  }
}
