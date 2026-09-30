import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Locate } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { API_BASE_URL } from '../lib/config';
import { getCategory } from '../lib/categories';
import { SEVERITY_LEVELS, severityColor } from '../lib/severity';

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
  category: string | null;
  timestamp: string;
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
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }
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
      type: report.crisisType || (report.category ? getCategory(report.category).label : 'Unknown Crisis'),
      urgency: report.severity || 'Medium',
      description: report.description,
      location: {
        lat: report.latitude!,
        lng: report.longitude!,
        address: report.extractedLocation || report.location || 'Unknown Location'
      },
      timestamp: report.timestamp,
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
              aria-label={showMyLocation ? 'Hide my location' : 'Show my location'}
              aria-pressed={showMyLocation}
            >
              <Locate className="w-4 h-4" />
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
            showMyLocation={showMyLocation}
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
          <h3 className="font-medium mb-3">Severity</h3>
          <div className="grid grid-cols-2 gap-3">
            {SEVERITY_LEVELS.map((level) => (
              <div key={level} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: severityColor(level) }}
                />
                <span className="text-sm">{level}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}