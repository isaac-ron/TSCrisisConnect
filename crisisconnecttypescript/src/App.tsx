import { useState } from 'react';
import { useSyncOfflineMessages } from './hooks/useSyncOfflineMessages';
import { HomeScreen } from './pages/HomeScreen';
import { ComposeMessage } from './pages/ComposeMessage';
import { Messages } from './pages/Messages';
import { AlertFeed } from './pages/AlertFeed';
import { MapView } from './pages/MapView';
import { BottomNavigation } from './pages/BottomNavigation';
import { FirstResponderLogin } from './pages/FirstResponderLogin';
import { FirstResponderDashboard } from './pages/FirstResponderDashboard';
import { Shield } from 'lucide-react';
import { Button } from './ui/button';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'messages' | 'map' | 'settings'>('home');
  const [showCompose, setShowCompose] = useState(false);
  const [userType, setUserType] = useState<'public' | 'responder_login' | 'responder_dashboard'>('public');
  const [isResponderAuthenticated, setIsResponderAuthenticated] = useState(false);

  // Sync offline messages using custom hook
  useSyncOfflineMessages();

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
        return (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                ⚙️
              </div>
              <h2 className="mb-2">Settings</h2>
              <p className="text-muted-foreground">Settings panel coming soon</p>
              
              {/* First Responder Access */}
              <div className="pt-8 border-t border-border">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="mb-2">Emergency Personnel</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Access the first responder dashboard
                    </p>
                  </div>
                  <Button 
                    onClick={() => setUserType('responder_login')}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    First Responder Access
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle different user types and authentication states
  if (userType === 'responder_login') {
    return (
      <FirstResponderLogin 
        onLogin={() => {
          setIsResponderAuthenticated(true);
          setUserType('responder_dashboard');
        }}
        onBackToPublic={() => setUserType('public')}
      />
    );
  }

  if (userType === 'responder_dashboard' && isResponderAuthenticated) {
    return (
      <FirstResponderDashboard 
        onLogout={() => {
          setIsResponderAuthenticated(false);
          setUserType('public');
        }}
      />
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="pb-16">
        {renderActiveScreen()}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}