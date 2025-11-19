import { useEffect } from 'react';
import { getAllMessages, markMessageSynced } from '../utils/offlineMessages';
import { API_BASE_URL } from '../lib/config';

export function useSyncOfflineMessages() {
  useEffect(() => {
    const syncMessages = async () => {
      const messages = await getAllMessages();
      const token = localStorage.getItem('token');
      
      if (!token) {
        // User not logged in, skip sync
        return;
      }

      for (const msg of messages) {
        if (!msg.synced) {
          try {
            console.log(`[Sync] Attempting to sync message ID ${msg.id}...`);
            const response = await fetch(`${API_BASE_URL}/reports`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(msg),
            });

            if (response.ok) {
              console.log(`[Sync] ✅ Message ID ${msg.id} synced successfully`);
              await markMessageSynced(msg.id);
              // Dispatch custom event to refresh messages list
              window.dispatchEvent(new CustomEvent('messages-updated'));
            } else {
              const errorText = await response.text();
              console.error(`[Sync] ❌ Failed to sync message ID ${msg.id}:`, response.status, errorText);
            }
          } catch (error) {
            console.error(`[Sync] ❌ Network error syncing message ID ${msg.id}:`, error);
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
