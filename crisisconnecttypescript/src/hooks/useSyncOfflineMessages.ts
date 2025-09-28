import { useEffect } from 'react';
import { getAllMessages, markMessageSynced } from '../utils/offlineMessages';

export function useSyncOfflineMessages() {
  useEffect(() => {
    const syncMessages = async () => {
      const messages = await getAllMessages();
      for (const msg of messages) {
        if (!msg.synced) {
          try {
            await fetch('/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg),
            });
            await markMessageSynced(msg.id);
          } catch {
            // Still offline or server error; will retry next time
          }
        }
      }
    };

    window.addEventListener('online', syncMessages);
    syncMessages();
    return () => window.removeEventListener('online', syncMessages);
  }, []);
}
