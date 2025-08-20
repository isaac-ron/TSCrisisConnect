import { Button } from '../ui/button';
import { Home, Radio, MessageSquare, Map, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'home' | 'alerts' | 'messages' | 'map' | 'settings';
  onTabChange: (tab: 'home' | 'alerts' | 'messages' | 'map' | 'settings') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'alerts' as const, icon: Radio, label: 'Alerts' },
    { id: 'map' as const, icon: Map, label: 'Map' },
    { id: 'messages' as const, icon: MessageSquare, label: 'Messages' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => onTabChange(tab.id)}
              className={`h-16 flex-col gap-1 rounded-none border-none ${
                isActive 
                  ? 'text-primary bg-primary/5' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}