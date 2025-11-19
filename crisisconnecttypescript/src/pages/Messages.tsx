import { useState, useEffect } from 'react';
import { getAllMessages, markMessageSynced } from '../utils/offlineMessages';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, Clock, Heart, Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';

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
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to sync messages');
        return;
      }

      const messages = await getAllMessages();
      const unsynced = messages.filter((m) => !m.synced);

      for (const msg of unsynced) {
        try {
          console.log(`[Manual Sync] Syncing message ${msg.id}...`);
          const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(msg),
          });

          if (response.ok) {
            await markMessageSynced(msg.id);
            console.log(`[Manual Sync] ✅ Synced message ${msg.id}`);
          } else {
            const errorText = await response.text();
            console.error(`[Manual Sync] ❌ Failed: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.error(`[Manual Sync] ❌ Error:`, error);
        }
      }

      // Reload messages
      const all = await getAllMessages();
      setSentMessages(all.filter((m) => m.synced));
      setPendingMessages(all.filter((m) => !m.synced));
    } finally {
      setSyncing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return <Heart className="w-4 h-4 text-red-600" />;
      case 'shelter': return <Home className="w-4 h-4 text-blue-600" />;
      case 'threat': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medical': return 'bg-red-100 text-red-800 border-red-200';
      case 'shelter': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'threat': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const MessageCard = ({ message }: { message: any }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getCategoryIcon(message.category)}
            <Badge variant="outline" className={getCategoryColor(message.category)}>
              {message.category}
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