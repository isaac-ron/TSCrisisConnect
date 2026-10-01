import { useEffect } from 'react';
import { syncPendingMessages } from '../utils/syncMessages';

export function useSyncOfflineMessages() {
  useEffect(() => {
    const sync = () => {
      void syncPendingMessages();
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, []);
}
