import { getAllMessages, markMessageSynced } from './offlineMessages';
import { API_BASE_URL, AUTH_STORAGE_KEYS } from '../lib/config';

export interface SyncResult {
  synced: number;
  failed: number;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Sends every unsynced offline message to the server. Concurrent callers share
 * one run, so a message is never posted twice (e.g. the `online` event firing
 * while a manual sync is in progress).
 */
export function syncPendingMessages(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  const pending = (await getAllMessages()).filter((m) => !m.synced);
  // Guests can report too; the server attributes unauthenticated reports to an anonymous reporter
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const result: SyncResult = { synced: 0, failed: 0 };

  for (const msg of pending) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          content: msg.content ?? msg.message,
          category: msg.category,
          attachment: msg.attachment,
        }),
      });

      if (response.ok) {
        await markMessageSynced(msg.id);
        result.synced++;
      } else {
        console.error(`[Sync] ❌ Failed to sync message ID ${msg.id}:`, response.status, await response.text());
        result.failed++;
      }
    } catch (error) {
      // Still offline; the message stays pending and is retried next time
      console.error(`[Sync] ❌ Network error syncing message ID ${msg.id}:`, error);
      result.failed++;
    }
  }

  if (result.synced > 0) {
    window.dispatchEvent(new CustomEvent('messages-updated'));
  }
  return result;
}
