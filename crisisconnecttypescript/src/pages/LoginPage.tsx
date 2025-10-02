import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, User, Eye, EyeOff, HeartPulse, Radio, Sparkles, Lock } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';

import type { AuthPayload } from '../lib/types';

interface LoginPageProps {
  onPublicLogin: (payload: AuthPayload) => Promise<void> | void;
  onResponderLogin: (payload: AuthPayload) => Promise<void> | void;
  onExploreGuest?: () => void;
  initialTab?: 'community' | 'responder';
}

export function LoginPage({ onPublicLogin, onResponderLogin, onExploreGuest, initialTab = 'community' }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<'community' | 'responder'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Community member state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [communityError, setCommunityError] = useState('');
  const [communityLoading, setCommunityLoading] = useState(false);

  // First responder state
  const [badgeId, setBadgeId] = useState('');
  const [responderPassword, setResponderPassword] = useState('');
  const [showResponderPassword, setShowResponderPassword] = useState(false);
  const [responderError, setResponderError] = useState('');
  const [responderLoading, setResponderLoading] = useState(false);

  const handleCommunityLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCommunityError('');
    setCommunityLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to sign in. Please try again.');
      }

      if (!result.token || !result.user) {
        throw new Error('Unexpected response from server.');
      }

      await onPublicLogin(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setCommunityError(message);
    } finally {
      setCommunityLoading(false);
    }
  };

  const handleResponderLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResponderError('');
    setResponderLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/responder-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeId: badgeId.trim().toUpperCase(),
          password: responderPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to verify credentials.');
      }

      if (!result.token || !result.user) {
        throw new Error('Unexpected response from server.');
      }

      await onResponderLogin(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setResponderError(message);
    } finally {
      setResponderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 text-center space-y-3">
          <div className="flex items-center justify-center gap-3 text-destructive">
            <Shield className="w-6 h-6" />
            <span className="text-sm font-medium tracking-widest uppercase">CrisisConnect</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold">Choose your mission pathway</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Community members can report emergencies and receive alerts. First responders access mission-critical dashboards to coordinate relief operations.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'community' | 'responder')} className="grid md:grid-cols-[1fr_1.2fr] gap-8">
          <Card className="bg-muted/40 border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-widest text-muted-foreground">
                <Sparkles className="w-4 h-4" /> What you get
              </CardTitle>
              <CardDescription className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-destructive/10 text-destructive p-2">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Community Member Experience</h3>
                    <p className="text-sm text-muted-foreground">Submit emergency updates even offline, follow live alerts, explore safety maps, and coordinate with neighbors.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 text-primary p-2">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">First Responder Command Center</h3>
                    <p className="text-sm text-muted-foreground">Access the operational dashboard with triage queues, situational intelligence, and team coordination tools.</p>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button variant={activeTab === 'community' ? 'default' : 'outline'} onClick={() => setActiveTab('community')} className="justify-start gap-3">
                  <User className="w-4 h-4" />
                  Community Member login
                </Button>
                <Button variant={activeTab === 'responder' ? 'default' : 'outline'} onClick={() => setActiveTab('responder')} className="justify-start gap-3">
                  <Shield className="w-4 h-4" />
                  First Responder login
                </Button>
                {onExploreGuest && (
                  <Button variant="ghost" onClick={onExploreGuest} className="justify-start gap-3 text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    Explore without signing in
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-destructive" />
                {activeTab === 'community' ? 'Community Member Login' : 'First Responder Login'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'community' ? 'Sign in to send emergency messages, track alerts, and sync offline activity.' : 'Secure access for verified emergency personnel.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="hidden" />
              <TabsContent value="community" className="mt-0">
                <form className="space-y-4" onSubmit={handleCommunityLogin}>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  {communityError && (
                    <Alert variant="destructive">
                      <AlertDescription>{communityError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={communityLoading}>
                    {communityLoading ? 'Signing in…' : 'Sign in as Community Member'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="responder" className="mt-0">
                <form className="space-y-4" onSubmit={handleResponderLogin}>
                  <div className="space-y-2">
                    <label htmlFor="badgeId" className="text-sm font-medium">Badge ID</label>
                    <Input
                      id="badgeId"
                      type="text"
                      placeholder="FR001"
                      value={badgeId}
                      onChange={(event) => setBadgeId(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="responderPassword" className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Input
                        id="responderPassword"
                        type={showResponderPassword ? 'text' : 'password'}
                        placeholder="emergency123"
                        value={responderPassword}
                        onChange={(event) => setResponderPassword(event.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowResponderPassword(!showResponderPassword)}
                      >
                        {showResponderPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {responderError && (
                    <Alert variant="destructive">
                      <AlertDescription>{responderError}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={responderLoading}>
                    {responderLoading ? 'Verifying…' : 'Enter First Responder Dashboard'}
                  </Button>

                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Demo credentials</p>
                    <p>Badge ID: <span className="font-mono">FR001</span></p>
                    <p>Password: <span className="font-mono">emergency123</span></p>
                  </div>
                </form>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}