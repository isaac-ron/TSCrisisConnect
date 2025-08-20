import { useState } from 'react';
import { HomeScreen } from './pages/HomeScreen';
import { ComposeMessage } from './pages/ComposeMessage';
import { Messages } from './pages/Messages';
import { AlertFeed } from './pages/AlertFeed';
import { MapView } from './pages/MapView';
import { BottomNavigation } from './pages/BottomNavigation';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'messages' | 'map' | 'settings'>('home');
  const [showCompose, setShowCompose] = useState(false);

  const renderActiveScreen = () => {
    if (showCompose) {
      return <ComposeMessage onClose={() => setShowCompose(false)} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onCompose={() => setShowCompose(true)} onViewAlerts={() => setActiveTab('alerts')} />;
      case 'alerts':
        return <AlertFeed />;
      case 'messages':
        return <Messages />;
      case 'map':
        return <MapView />;
      case 'settings':
        return <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h2 className="mb-2 font-medium">Settings</h2>
            <p className="text-muted-foreground">Settings panel coming soon</p>
          </div>
        </div>;
      default:
        return <HomeScreen onCompose={() => setShowCompose(true)} onViewAlerts={() => setActiveTab('alerts')} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-16">
        {renderActiveScreen()}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}