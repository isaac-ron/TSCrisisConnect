import * as React from 'react';
import { useRef, useState } from 'react';
import { saveOfflineMessage } from '../utils/offlineMessages';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, WifiOff, ImagePlus } from 'lucide-react';
import { API_BASE_URL, AUTH_STORAGE_KEYS } from '../lib/config';
import { REPORT_CATEGORIES } from '../lib/categories';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const MAX_MESSAGE_LENGTH = 500;

interface ComposeMessageProps {
  onClose: () => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Invalid file result.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

export function ComposeMessage({ onClose }: ComposeMessageProps) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = async () => {
    if (message.trim() && category) {
      let attachmentData: string | null = null;

      if (attachment) {
        try {
          attachmentData = await readFileAsDataUrl(attachment);
        } catch (error) {
          console.error('❌ [ComposeMessage] Attachment read error:', error);
          setStatus('Could not read the selected image. Please try again.');
          return;
        }
      }

      const msg = {
        content: message,
        category,
        attachment: attachmentData,
      };
      
      console.log('🚀 [ComposeMessage] Starting send process...');
      console.log('📦 [ComposeMessage] Message payload:', msg);
      console.log('📡 [ComposeMessage] Online status:', isOnline);
      console.log('🌐 [ComposeMessage] navigator.onLine:', navigator.onLine);
      
      if (isOnline) {
        try {
          const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
          console.log('🌐 [ComposeMessage] Attempting POST to /reports...');
          console.log('🔑 [ComposeMessage] Auth token:', token ? 'Present' : 'Missing');
          console.log('🌐 [ComposeMessage] API URL:', `${API_BASE_URL}/reports`);
          
          const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(msg),
          });
          
          console.log('📥 [ComposeMessage] Response status:', response.status);
          console.log('📥 [ComposeMessage] Response ok:', response.ok);
          
          if (response.status >= 400 && response.status < 500) {
            // The server rejected the report itself; retrying later won't help
            const result = await response.json().catch(() => null);
            setStatus(result?.error || 'The report could not be accepted.');
            return;
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [ComposeMessage] Server error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('✅ [ComposeMessage] Server response:', result);
          
          await saveOfflineMessage({ ...msg, synced: true });
          setStatus('Message sent successfully.');
          console.log('✅ [ComposeMessage] Message sent and saved to IndexedDB as synced');
        } catch (error) {
          console.error('❌ [ComposeMessage] Fetch error:', error);
          console.error('❌ [ComposeMessage] Error details:', error instanceof Error ? error.message : 'Unknown error');
          await saveOfflineMessage({ ...msg, synced: false });
          setStatus('Could not reach the server. Message saved for later sync.');
          console.log('💾 [ComposeMessage] Message saved to IndexedDB as unsynced');
        }
      } else {
        console.log('📴 [ComposeMessage] Offline mode - saving to IndexedDB...');
        await saveOfflineMessage({ ...msg, synced: false });
        setStatus('No connection. Message saved for later sync.');
        console.log('💾 [ComposeMessage] Message saved to IndexedDB as unsynced');
      }
      window.dispatchEvent(new Event('messages-updated'));
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1200);
    } else {
      console.warn('⚠️ [ComposeMessage] Cannot send - missing message or category');
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.warn('⚠️ [ComposeMessage] Invalid file type selected');
      setStatus('Please choose an image file.');
      event.target.value = '';
      return;
    }

    setStatus(null);
    setAttachment(file);
  };

  React.useEffect(() => {
    if (!attachment) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(attachment);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);


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
              {REPORT_CATEGORIES.map((cat) => {
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
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            {message.length}/{MAX_MESSAGE_LENGTH} characters
          </p>
        </div>

        {/* Image attachment */}
        <div className="space-y-2">
          <label className="text-sm">Attach Photo (optional)</label>
          <div className="flex gap-3">
            <label className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAttachmentChange}
                className="hidden"
              />
              <div className="h-32 border border-dashed border-muted-foreground/40 rounded-md flex flex-col items-center justify-center gap-2 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected attachment" className="h-full w-full object-cover rounded-md" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tap to upload an image</span>
                  </>
                )}
              </div>
            </label>
            {attachment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAttachment(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Remove
              </Button>
            )}
          </div>
          {attachment && (
            <p className="text-xs text-muted-foreground truncate">
              {attachment.name} ({Math.round(attachment.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* Send button */}
        <Button 
          onClick={handleSend}
          disabled={!message.trim() || !category}
          className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          size="lg"
        >
          {isOnline ? 'Send Message' : 'Save for Sync'}
        </Button>
        {status && (
          <div className="mt-2 text-center text-sm text-muted-foreground">{status}</div>
        )}
      </div>

      {/* Offline status banner */}
      {!isOnline && (
        <div className="fixed bottom-16 left-0 right-0 bg-muted border-t border-border p-3 z-50">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              You are offline — message will sync automatically when reconnected.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}