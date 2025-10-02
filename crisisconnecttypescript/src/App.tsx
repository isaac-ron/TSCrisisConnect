import { useCallback, useEffect, useState } from 'react';
import { useSyncOfflineMessages } from './hooks/useSyncOfflineMessages';
import { HomeScreen } from './pages/HomeScreen';
import { ComposeMessage } from './pages/ComposeMessage';
import { Messages } from './pages/Messages';
import { AlertFeed } from './pages/AlertFeed';
import { MapView } from './pages/MapView';
import { BottomNavigation } from './pages/BottomNavigation';
import { FirstResponderDashboard } from './pages/FirstResponderDashboard';
import { LoginPage } from './pages/LoginPage';
import { Shield } from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE_URL, AUTH_STORAGE_KEYS } from './lib/config';
import type { AuthPayload, UserProfile } from './lib/types';

type AppView = 'loading' | 'auth' | 'public' | 'responder';

type Session = {
  token: string;
  user: UserProfile;
};

const roleIsResponder = (role?: string | null) => role?.toLowerCase() === 'first-responder';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'messages' | 'map' | 'settings'>('home');
  const [showCompose, setShowCompose] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<AppView>('loading');
  const [initialAuthTab, setInitialAuthTab] = useState<'community' | 'responder'>('community');

  useSyncOfflineMessages();

  const persistSession = useCallback((payload: Session) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, payload.token);
    localStorage.setItem(AUTH_STORAGE_KEYS.email, payload.user.email);
    localStorage.setItem(AUTH_STORAGE_KEYS.role, payload.user.role ?? 'user');

    if (payload.user.badgeId) {
      localStorage.setItem(AUTH_STORAGE_KEYS.badgeId, payload.user.badgeId);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.badgeId);
    }
  }, []);

  const clearStoredSession = useCallback(() => {
    Object.values(AUTH_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }, []);

  const handleLoginSuccess = useCallback((payload: AuthPayload, nextView: AppView) => {
    const sessionPayload: Session = {
      token: payload.token,
      user: payload.user,
    };

    persistSession(sessionPayload);
    setSession(sessionPayload);
    setView(nextView);
    setShowCompose(false);
    setActiveTab('home');
    setInitialAuthTab(roleIsResponder(payload.user.role) ? 'responder' : 'community');
  }, [persistSession]);

  useEffect(() => {
    const storedRole = localStorage.getItem(AUTH_STORAGE_KEYS.role);
    if (roleIsResponder(storedRole)) {
      setInitialAuthTab('responder');
    }

    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    if (!token) {
      setView('auth');
      return;
    }

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let result: { user?: UserProfile; error?: string } | null = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok || !result?.user) {
          throw new Error(result?.error || 'Unable to validate session');
        }

        const nextView = roleIsResponder(result.user.role) ? 'responder' : 'public';
        handleLoginSuccess({ token, user: result.user }, nextView);
      } catch {
        clearStoredSession();
        setSession(null);
        setView('auth');
      }
    })();
  }, [handleLoginSuccess, clearStoredSession]);

  const handlePublicLogin = async (payload: AuthPayload) => {
    handleLoginSuccess(payload, 'public');
  };

  const handleResponderLogin = async (payload: AuthPayload) => {
    handleLoginSuccess(payload, 'responder');
  };

  const handleGuestExplore = () => {
    clearStoredSession();
    setSession(null);
    setView('public');
    setActiveTab('home');
    setShowCompose(false);
    setInitialAuthTab('community');
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setView('auth');
    setActiveTab('home');
    setShowCompose(false);
    setInitialAuthTab('community');
  };

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
            <div className="text-center space-y-6 w-full max-w-md">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                ⚙️
              </div>
              <h2 className="mb-2">Settings</h2>
              <p className="text-muted-foreground">Manage your CrisisConnect experience</p>

              {session ? (
                <div className="space-y-4 border border-border rounded-xl p-6 text-left">
                  <div>
                    <p className="text-sm uppercase text-muted-foreground mb-1">Signed in as</p>
                    <p className="font-semibold">{session.user.name || session.user.email}</p>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    <p className="text-xs text-muted-foreground mt-2">Role: {session.user.role}</p>
                    {session.user.badgeId ? (
                      <p className="text-xs text-muted-foreground">Badge ID: {session.user.badgeId}</p>
                    ) : null}
                  </div>

                  {roleIsResponder(session.user.role) ? (
                    <Button
                      className="w-full bg-destructive hover:bg-destructive/90"
                      onClick={() => setView('responder')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Open Responder Dashboard
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setInitialAuthTab('responder');
                        setView('auth');
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Become a Responder
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full" onClick={handleLogout}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-dashed border-border rounded-xl p-6 text-left space-y-3">
                    <p className="font-medium">Have an account?</p>
                    <Button
                      className="w-full bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                        setInitialAuthTab('community');
                        setView('auth');
                      }}
                    >
                      Sign in to Sync Activity
                    </Button>
                  </div>

                  <div className="border border-dashed border-border rounded-xl p-6 text-left space-y-3">
                    <p className="font-medium">First responder access</p>
                    <p className="text-sm text-muted-foreground">
                      Verified emergency personnel can access the operational dashboard.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setInitialAuthTab('responder');
                        setView('auth');
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      First Responder Sign In
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Preparing CrisisConnect…</div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <LoginPage
        onPublicLogin={handlePublicLogin}
        onResponderLogin={handleResponderLogin}
        onExploreGuest={handleGuestExplore}
        initialTab={initialAuthTab}
      />
    );
  }

  if (view === 'responder' && session) {
    return (
      <FirstResponderDashboard
        onLogout={handleLogout}
        user={session.user}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pb-16">{renderActiveScreen()}</div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}