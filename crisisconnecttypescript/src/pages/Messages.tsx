import { useState, useEffect } from 'react';
import { getAllMessages } from '../utils/offlineMessages';
import { syncPendingMessages } from '../utils/syncMessages';
import { getCategory } from '../lib/categories';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, Clock, RefreshCw } from 'lucide-react';

export function Messages() {
  const [activeTab, setActiveTab] = useState('sent');

  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load messages from IndexedDB
  useEffect(() => {
    const loadMessages = async () => {
      const all = await getAllMessages();
      setSentMessages(all.filter((m) => m.synced));
      setPendingMessages(all.filter((m) => !m.synced));
    };
    loadMessages();
    // Listen for online event and custom event to refresh after sync or new message
    window.addEventListener('online', loadMessages);
    window.addEventListener('messages-updated', loadMessages);
    return () => {
      window.removeEventListener('online', loadMessages);
      window.removeEventListener('messages-updated', loadMessages);
    };
  }, []);

  const manualSync = async () => {
    setSyncing(true);
    try {
      const { synced, failed } = await syncPendingMessages();

      // Reload messages
      const all = await getAllMessages();
      setSentMessages(all.filter((m) => m.synced));
      setPendingMessages(all.filter((m) => !m.synced));

      // Show result to user
      if (synced === 0 && failed === 0) {
        alert('No pending messages to sync');
      } else if (failed === 0) {
        alert(`✅ Successfully synced ${synced} message(s)`);
      } else if (synced > 0) {
        alert(`⚠️ Synced ${synced} message(s), ${failed} failed`);
      } else {
        alert(`❌ Failed to sync messages. Check console for details.`);
      }
    } catch (error) {
      console.error('[Manual Sync] Unexpected error:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const MessageCard = ({ message }: { message: any }) => {
    const category = getCategory(message.category);
    const Icon = category.icon;
      return (
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${category.color}`} />
              <Badge variant="outline">
                {category.label}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed">{message.content || message.message}</p>
          </div>
          <div className="flex items-center gap-1">
            {message.synced ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Clock className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {message.timestamp ? message.timestamp : message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
          </span>
          <Badge variant={message.synced ? "secondary" : "outline"}>
            {message.synced ? 'Sent' : 'Pending sync'}
          </Badge>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-4">
        <h2>Messages</h2>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sent">Sent ({sentMessages.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingMessages.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sent" className="mt-4 space-y-3">
            {sentMessages.length > 0 ? (
              sentMessages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sent messages</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingMessages.length > 0 ? (
              <>
                <div className="flex justify-end mb-2">
                  <Button 
                    onClick={manualSync} 
                    disabled={syncing}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Retry Sync'}
                  </Button>
                </div>
                {pendingMessages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No pending messages</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}