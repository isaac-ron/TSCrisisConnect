import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface FirstResponderLoginProps {
  onLogin: () => void;
  onBackToPublic: () => void;
}

export function FirstResponderLogin({ onLogin, onBackToPublic }: FirstResponderLoginProps) {
  const [badgeId, setBadgeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate authentication
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (badgeId === 'FR001' && password === 'emergency123') {
      onLogin();
    } else {
      setError('Invalid badge ID or password. Please check your credentials.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-destructive-foreground" />
          </div>
          <div className="space-y-2">
            <h1>First Responder Access</h1>
            <p className="text-muted-foreground">
              Secure access to emergency communications dashboard
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="badgeId">Badge ID</label>
                <Input
                  id="badgeId"
                  type="text"
                  placeholder="Enter your badge ID"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-destructive hover:bg-destructive/90"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Access Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm">Demo Credentials:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Badge ID: <span className="font-mono">FR001</span></p>
                <p>Password: <span className="font-mono">emergency123</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Public App */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={onBackToPublic}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Public App
          </Button>
        </div>
      </div>
    </div>
  );
}