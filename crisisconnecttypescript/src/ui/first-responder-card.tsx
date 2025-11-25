import { Phone, Shield, Mail } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface FirstResponder {
  id: number;
  name: string;
  department: string;
  phoneNumber: string;
  badgeNumber?: string;
  email?: string;
}

interface FirstResponderCardProps {
  responder: FirstResponder;
  compact?: boolean;
}

export function FirstResponderCard({ responder, compact = false }: FirstResponderCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${responder.phoneNumber}`;
  };

  const handleEmail = () => {
    if (responder.email) {
      window.location.href = `mailto:${responder.email}`;
    }
  };

  if (compact) {
    return (
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-sm text-blue-900">
                {responder.name}
              </p>
              <p className="text-xs text-blue-700">
                {responder.department}
                {responder.badgeNumber && ` • Badge ${responder.badgeNumber}`}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleCall}
          >
            <Phone className="w-4 h-4 mr-1" />
            Call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-blue-100 rounded-full">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{responder.name}</h3>
          <p className="text-sm text-muted-foreground mb-1">{responder.department}</p>
          {responder.badgeNumber && (
            <p className="text-xs text-muted-foreground">Badge: {responder.badgeNumber}</p>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call {responder.phoneNumber}
            </Button>
            {responder.email && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleEmail}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
