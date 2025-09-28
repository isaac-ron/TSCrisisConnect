import { openDB } from 'idb';

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

export async function saveOfflineMessage(message: any) {
  const db = await getDB();
  // If message already has synced property, use it; otherwise default to false
  const synced = typeof message.synced === 'boolean' ? message.synced : false;
  await db.add(STORE_NAME, { ...message, synced, createdAt: new Date().toISOString() });
}

export async function getAllMessages() {
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
