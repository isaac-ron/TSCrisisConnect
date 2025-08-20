import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, Heart, Home, AlertTriangle } from 'lucide-react';

export function Messages() {
  const [activeTab, setActiveTab] = useState('sent');

  const sentMessages = [
    {
      id: '1',
      content: 'Need medical assistance at 123 Main St. Person unconscious.',
      category: 'medical',
      timestamp: '2 hours ago',
      synced: true,
    },
    {
      id: '2', 
      content: 'Building collapsed on Oak Avenue. Multiple people trapped.',
      category: 'threat',
      timestamp: '5 hours ago',
      synced: true,
    },
  ];

  const pendingMessages = [
    {
      id: '3',
      content: 'Lost shelter after flood. Need safe place to stay with family of 4.',
      category: 'shelter', 
      timestamp: '1 min ago',
      synced: false,
    },
    {
      id: '4',
      content: 'Road blocked by fallen trees on Highway 101. Cannot pass.',
      category: 'threat',
      timestamp: '5 min ago', 
      synced: false,
    },
  ];

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
          <p className="text-sm leading-relaxed">{message.content}</p>
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
        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
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
              pendingMessages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))
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