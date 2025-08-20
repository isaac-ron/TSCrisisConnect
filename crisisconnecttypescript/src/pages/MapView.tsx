import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Locate, Layers, Flame, Droplets, Users, Zap, TreePine, Cross } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

export function MapView() {
  const [showMyLocation, setShowMyLocation] = useState(true);

  // Mock alert data with coordinates - formatted for Leaflet component
  const alertsWithLocations = [
    {
      id: '1',
      type: 'Wildfire Emergency',
      urgency: 'High',
      description: 'Wildfire spreading rapidly in Pine Valley area. Evacuation orders issued. California Department of Forestry reports 500+ acres burned with 0% containment.',
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: 'Pine Valley, CA'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
      alertType: 'fire',
    },
    {
      id: '2',
      type: 'Flash Flood Warning',
      urgency: 'Medium',
      description: 'Flash flood warning issued for downtown area. National Weather Service: 2-4 inches of rain expected in next 2 hours.',
      location: {
        lat: 37.7849,
        lng: -122.4094,
        address: 'Downtown District'
      },
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
      alertType: 'flood',
    },
    {
      id: '3',
      type: 'Peaceful Gathering',
      urgency: 'Low',
      description: 'Peaceful protest gathering at City Park. Organized demonstration for community safety. Police providing traffic management.',
      location: {
        lat: 37.7649,
        lng: -122.4294,
        address: 'City Park'
      },
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      alertType: 'crowd',
    },
    {
      id: '4',
      type: 'Power Outage',
      urgency: 'Medium',
      description: 'Power outage affecting 15,000 residents in North Hills. Utility company estimates 4-6 hour restoration time.',
      location: {
        lat: 37.7949,
        lng: -122.3994,
        address: 'North Hills'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      alertType: 'power',
    },
    {
      id: '5',
      type: 'Flash Flood Alert',
      urgency: 'High',
      description: 'Heavy rains causing flash floods in Kibera slums. Residents advised to move to higher ground immediately. Emergency shelters being opened.',
      location: {
        lat: -1.3133,
        lng: 36.7950,
        address: 'Kibera, Nairobi, Kenya'
      },
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      alertType: 'flood',
    },
    {
      id: '6',
      type: 'Wildlife Conflict',
      urgency: 'Medium',
      description: 'Elephants spotted in farming areas near Maasai Mara. Kenya Wildlife Service teams deployed. Farmers advised to stay indoors and secure crops.',
      location: {
        lat: -1.5061,
        lng: 35.1432,
        address: 'Maasai Mara, Narok County, Kenya'
      },
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      alertType: 'wildlife',
    },
    {
      id: '7',
      type: 'Medical Emergency',
      urgency: 'High',
      description: 'Cholera outbreak reported in Eastleigh district. 25 confirmed cases. Water sources being tested. Vaccination campaign initiated by Ministry of Health.',
      location: {
        lat: -1.2701,
        lng: 36.8419,
        address: 'Eastleigh, Nairobi, Kenya'
      },
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      alertType: 'medical',
    },
  ];

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
      <div className="relative h-96">
        <LeafletMap
          alerts={alertsWithLocations}
          center={[0, 20]} // Global view to show both US and Kenya
          zoom={3}
        />
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
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-700 rounded-full flex items-center justify-center">
                <TreePine className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Wildlife Conflict</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Cross className="w-2 h-2 text-white" />
              </div>
              <span className="text-sm">Medical Emergency</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <h4 className="font-medium mb-2">Urgency Levels</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-sm">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Medium</span>
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