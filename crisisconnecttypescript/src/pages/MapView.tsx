import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Locate, Layers, Flame, Droplets, Users, Zap, TreePine, Cross } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../lib/config';

interface Report {
  id: number;
  description: string;
  location: string;
  extractedLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  crisisType: string | null;
  severity: string | null;
  confidence: number | null;
  createdAt: string;
}

export function MapView() {
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`);
      const data = await response.json();
      console.log('📍 Fetched reports:', data);
      setReports(data);
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform reports to alert format for the map
  const alertsWithLocations = reports
    .filter(report => report.latitude !== null && report.longitude !== null)
    .map(report => ({
      id: report.id.toString(),
      type: report.crisisType || 'Unknown Crisis',
      urgency: report.severity || 'Medium',
      description: report.description,
      location: {
        lat: report.latitude!,
        lng: report.longitude!,
        address: report.extractedLocation || report.location || 'Unknown Location'
      },
      timestamp: report.createdAt,
      alertType: report.crisisType?.toLowerCase() || 'unknown',
    }));

  
 

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
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading crisis reports...</p>
            </div>
          </div>
        ) : (
          <LeafletMap
            alerts={alertsWithLocations}
            center={alertsWithLocations.length > 0 ? [alertsWithLocations[0].location.lat, alertsWithLocations[0].location.lng] : [0, 20]}
            zoom={alertsWithLocations.length > 0 ? 10 : 3}
          />
        )}
      </div>

      {/* Report Count */}
      {!loading && (
        <div className="px-4 py-2 bg-muted">
          <p className="text-sm text-muted-foreground">
            📍 Showing {alertsWithLocations.length} crisis report{alertsWithLocations.length !== 1 ? 's' : ''} with location data
          </p>
        </div>
      )}

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