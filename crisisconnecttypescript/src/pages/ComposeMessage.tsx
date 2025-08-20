import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, WifiOff, Heart, Home, AlertTriangle } from 'lucide-react';

interface ComposeMessageProps {
  onClose: () => void;
}

export function ComposeMessage({ onClose }: ComposeMessageProps) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  const handleSend = () => {
    if (message.trim() && category) {
      // Simulate saving message for sync
      onClose();
    }
  };

  const categories = [
    { value: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-red-600' },
    { value: 'shelter', label: 'Need Shelter', icon: Home, color: 'text-blue-600' },
    { value: 'threat', label: 'Safety Threat', icon: AlertTriangle, color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2>Emergency Message</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Category selection */}
        <div className="space-y-2">
          <label className="text-sm">Message Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select emergency type" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                      {cat.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Message input */}
        <div className="space-y-2">
          <label className="text-sm">Emergency Message</label>
          <Textarea
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="Describe your emergency situation and location..."
            className="min-h-32 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {message.length}/500 characters
          </p>
        </div>

        {/* Send button */}
        <Button 
          onClick={handleSend}
          disabled={!message.trim() || !category}
          className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          size="lg"
        >
          Save for Sync
        </Button>
      </div>

      {/* Offline status banner */}
      <div className="fixed bottom-16 left-0 right-0 bg-muted border-t border-border p-3">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            You are offline — message will sync automatically
          </span>
        </div>
      </div>
    </div>
  );
}