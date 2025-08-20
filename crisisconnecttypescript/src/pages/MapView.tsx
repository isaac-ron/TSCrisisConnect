import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MapPin, Locate, Layers, Flame, Droplets, Users, Zap, AlertCircle } from 'lucide-react';

export function MapView() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [showMyLocation, setShowMyLocation] = useState(true);

  // Mock alert data with coordinates
  const alertsWithLocations = [
    {
      id: '1',
      content: 'Wildfire spreading rapidly in Pine Valley area. Evacuation orders issued.',
      urgency: 'urgent',
      location: 'Pine Valley, CA',
      time: '2 min ago',
      type: 'fire',
      lat: 37.7749,
      lng: -122.4194,
      details: 'California Department of Forestry reports 500+ acres burned with 0% containment.',
    },
    {
      id: '2',
      content: 'Flash flood warning issued for downtown area.',
      urgency: 'moderate',
      location: 'Downtown District',
      time: '15 min ago',
      type: 'flood',
      lat: 37.7849,
      lng: -122.4094,
      details: 'National Weather Service: 2-4 inches of rain expected in next 2 hours.',
    },
    {
      id: '3',
      content: 'Peaceful protest gathering at City Park.',
      urgency: 'low',
      location: 'City Park',
      time: '1 hour ago',
      type: 'crowd',
      lat: 37.7649,
      lng: -122.4294,
      details: 'Organized demonstration for community safety. Police providing traffic management.',
    },
    {
      id: '4',
      content: 'Power outage affecting 15,000 residents in North Hills.',
      urgency: 'moderate',
      location: 'North Hills',
      time: '2 hours ago',
      type: 'power',
      lat: 37.7949,
      lng: -122.3994,
      details: 'Utility company estimates 4-6 hour restoration time.',
    },
  ];

  const getMarkerColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-600';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire': return <Flame className="w-3 h-3 text-white" />;
      case 'flood': return <Droplets className="w-3 h-3 text-white" />;
      case 'crowd': return <Users className="w-3 h-3 text-white" />;
      case 'power': return <Zap className="w-3 h-3 text-white" />;
      default: return <AlertCircle className="w-3 h-3 text-white" />;
    }
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const selectedAlertData = alertsWithLocations.find(alert => alert.id === selectedAlert);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Crisis Map</h2>
          <div className="flex gap-2">
            <Button
              variant={showMyLocation ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMyLocation(!showMyLocation)}
            >
              <Locate className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        {/* Simulated Map Background */}
        <div className="h-96 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
          {/* Grid pattern to simulate map */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-8 grid-rows-8 h-full">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="border border-gray-300"></div>
              ))}
            </div>
          </div>

          {/* Alert Markers */}
          {alertsWithLocations.map((alert, index) => (
            <button
              key={alert.id}
              onClick={() => setSelectedAlert(alert.id === selectedAlert ? null : alert.id)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full ${getMarkerColor(alert.urgency)} flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${
                selectedAlert === alert.id ? 'ring-2 ring-white ring-offset-2' : ''
              }`}
              style={{
                left: `${20 + (index * 15)}%`,
                top: `${30 + (index * 10)}%`,
              }}
            >
              {getTypeIcon(alert.type)}
            </button>
          ))}

          {/* User Location Marker */}
          {showMyLocation && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full ring-4 ring-primary/30"
              style={{ left: '50%', top: '60%' }}
            >
              <div className="absolute inset-0 bg-primary rounded-full animate-ping"></div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
              +
            </Button>
            <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
              −
            </Button>
          </div>
        </div>

        {/* Alert Details Card */}
        {selectedAlertData && (
          <Card className="m-4 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedAlertData.type)}
                <Badge className={getUrgencyBadgeColor(selectedAlertData.urgency)}>
                  {selectedAlertData.urgency}
                </Badge>
              </div>
              <div className="flex-1 text-right">
                <span className="text-xs text-muted-foreground">{selectedAlertData.time}</span>
              </div>
            </div>

            <p className="font-medium leading-relaxed">{selectedAlertData.content}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{selectedAlertData.details}</p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {selectedAlertData.location}
              </div>
              <Button variant="outline" size="sm">
                Get Directions
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Legend */}
      <div className="p-4">
        <Card className="p-4">
          <h3 className="font-medium mb-3">Alert Types</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                <Flame className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Fire Emergency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <Droplets className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Flood Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                <Users className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Crowd Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded-full flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Power Outage</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <h4 className="font-medium mb-2">Urgency Levels</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-sm">Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Low</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}