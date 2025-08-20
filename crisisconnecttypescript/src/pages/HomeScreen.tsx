import { Button } from '../ui/button';
import { AlertCircle, Wifi, WifiOff, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import logo from '../assets/crisisconnect-high-resolution-logo-transparent.png';
interface HomeScreenProps {
  onCompose: () => void;
  onViewAlerts: () => void;
}

export function HomeScreen({ onCompose, onViewAlerts }: HomeScreenProps) {
  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header with app branding */}
      <div className="text-center pt-8 pb-12">
        <div className="flex items-center justify-center mb-4">
          <img src={logo} alt="CrisisConnect Logo" className="w-100 h-24" />
        </div>
        <h1 className="text-3xl mb-3">AI-Powered Alerts. Real People. Real Safety.</h1>
        <p className="text-muted-foreground px-4 leading-relaxed">
          Stay informed, share updates, and support each other — even when networks go down.
        </p>
      </div>

      {/* Connection status */}
      <div className="mb-8 flex justify-center">
        <Badge variant="secondary" className="px-3 py-1">
          <WifiOff className="w-3 h-3 mr-2" />
          Offline Mode Active
        </Badge>
      </div>

      {/* Main action buttons */}
      <div className="flex-1 flex flex-col gap-4 max-w-sm mx-auto w-full">
        <Button 
          onClick={onCompose}
          size="lg"
          className="h-16 text-white flex items-center gap-3 bg-[hsl(0,100%,53%)] hover:bg-[hsl(0,100%,40%)]"
        >
          <AlertCircle className="w-6 h-6" />
          Send Emergency Message
        </Button>

        <Button 
          onClick={onViewAlerts}
          size="lg"
          variant="outline"
          className="h-16 border-2 flex items-center gap-3"
        >
          <Wifi className="w-6 h-6" />
          View Live Alerts
        </Button>
      </div>

      {/* Bottom illustration area */}
      <div className="mt-12 text-center">
        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto opacity-60">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Offline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Instant</span>
          </div>
        </div>
      </div>
    </div>
  );
}