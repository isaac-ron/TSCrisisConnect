import { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, ExternalLink, Flame, Droplets, Users, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

export function AlertFeed() {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const toggleAlert = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const alerts = [
    {
      id: '1',
      content: 'Wildfire spreading rapidly in Pine Valley area. Evacuation orders issued for zones A-C.',
      urgency: 'urgent',
      location: 'Pine Valley, CA',
      time: '2 min ago',
      type: 'fire',
      source: 'x',
      details: 'California Department of Forestry reports 500+ acres burned with 0% containment. Red Flag warning in effect. Evacuate immediately if in affected zones.',
    },
    {
      id: '2',
      content: 'Flash flood warning issued for downtown area. Avoid low-lying roads.',
      urgency: 'moderate',
      location: 'Downtown District',
      time: '15 min ago', 
      type: 'flood',
      source: 'x',
      details: 'National Weather Service: 2-4 inches of rain expected in next 2 hours. Multiple streets already experiencing flooding. Emergency shelters open at City Hall and Community Center.',
    },
    {
      id: '3',
      content: 'Peaceful protest gathering at City Park. Road closures on Main St from 2-6 PM.',
      urgency: 'low',
      location: 'City Park',
      time: '1 hour ago',
      type: 'crowd', 
      source: 'x',
      details: 'Organized demonstration for community safety. Police providing traffic management. Alternative routes: Oak Ave or Elm Street.',
    },
    {
      id: '4',
      content: 'Power outage affecting 15,000 residents in North Hills. Cause under investigation.',
      urgency: 'moderate',
      location: 'North Hills',
      time: '2 hours ago',
      type: 'power',
      source: 'x', 
      details: 'Utility company estimates 4-6 hour restoration time. Emergency generator available at North Hills Community Center. Check on elderly neighbors.',
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300'; 
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return '🔴';
      case 'moderate': return '🟡';
      case 'low': return '🟢'; 
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire': return <Flame className="w-4 h-4 text-red-600" />;
      case 'flood': return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'crowd': return <Users className="w-4 h-4 text-purple-600" />;
      case 'power': return <Zap className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2>Crisis Alerts</h2>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Live Feed
          </Badge>
        </div>
      </div>

      {/* Alert feed */}
      <div className="p-4 space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="overflow-hidden">
            <Collapsible
              open={expandedAlerts.has(alert.id)}
              onOpenChange={() => toggleAlert(alert.id)}
            >
              <div className="p-4 space-y-3">
                {/* Alert header */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(alert.type)}
                    <Badge className={getUrgencyColor(alert.urgency)}>
                      {getUrgencyIcon(alert.urgency)} {alert.urgency}
                    </Badge>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                </div>

                {/* Alert content */}
                <p className="leading-relaxed">{alert.content}</p>

                {/* Alert footer */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {alert.location}
                    <span className="text-xs">•</span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-black rounded-sm flex items-center justify-center">
                        <span className="text-white text-xs">𝕏</span>
                      </span>
                      Source
                    </span>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      {expandedAlerts.has(alert.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <p className="text-sm leading-relaxed mb-3">{alert.details}</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="w-3 h-3" />
                    View Full Report
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}