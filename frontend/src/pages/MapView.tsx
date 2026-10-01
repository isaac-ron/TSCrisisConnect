import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Locate, Radio } from 'lucide-react';
import LeafletMap, { type MapAlert } from '../components/LeafletMap';
import { crisisTypeLabel } from '../lib/categories';
import { SEVERITY_LEVELS, severityColor } from '../lib/severity';
import {
  fetchIncidents, fetchOfficialAlerts, incidentStatus, OFFICIAL_SOURCE_LABELS,
  type Incident, type OfficialAlert,
} from '../lib/incidents';

const located = <T extends { latitude: number | null; longitude: number | null }>(items: T[]) =>
  items.filter((i): i is T & { latitude: number; longitude: number } => i.latitude !== null && i.longitude !== null);

function incidentMarker(incident: Incident & { latitude: number; longitude: number }): MapAlert {
  return {
    id: `incident-${incident.id}`,
    type: crisisTypeLabel(incident.crisisType),
    urgency: incident.priority,
    description: incident.summary ?? '',
    location: { lat: incident.latitude, lng: incident.longitude, address: incident.locationName ?? 'Unknown location' },
    timestamp: incident.lastReportedAt,
    statusLabel: incidentStatus(incident).label,
  };
}

function officialMarker(alert: OfficialAlert & { latitude: number; longitude: number }): MapAlert {
  return {
    id: `official-${alert.id}`,
    type: `${OFFICIAL_SOURCE_LABELS[alert.source]}: ${crisisTypeLabel(alert.crisisType)}`,
    urgency: alert.severity,
    description: alert.title,
    location: { lat: alert.latitude, lng: alert.longitude, address: alert.title },
    timestamp: alert.eventTime,
    shape: 'square',
    statusLabel: 'Official alert',
    link: alert.url ? { href: alert.url, label: 'Source' } : undefined,
  };
}

export function MapView() {
  const [showMyLocation, setShowMyLocation] = useState(true);
  const [showOfficial, setShowOfficial] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [official, setOfficial] = useState<OfficialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIncidents(), fetchOfficialAlerts()])
      .then(([incidentData, officialData]) => {
        setIncidents(incidentData);
        setOfficial(officialData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load map data'))
      .finally(() => setLoading(false));
  }, []);

  const incidentMarkers = located(incidents).map(incidentMarker);
  const officialMarkers = showOfficial ? located(official).map(officialMarker) : [];
  const first = incidentMarkers[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Crisis Map</h2>
          <div className="flex gap-2">
            <Button
              variant={showOfficial ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOfficial(!showOfficial)}
              aria-label={showOfficial ? 'Hide official alerts' : 'Show official alerts'}
              aria-pressed={showOfficial}
            >
              <Radio className="w-4 h-4" />
            </Button>
            <Button
              variant={showMyLocation ? 'default' : 'outline'}
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

      <div className="relative h-96">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Loading incidents…</p>
          </div>
        ) : (
          <LeafletMap
            alerts={[...officialMarkers, ...incidentMarkers]}
            center={first ? [first.location.lat, first.location.lng] : [0, 20]}
            zoom={first ? 10 : 3}
            showMyLocation={showMyLocation}
          />
        )}
      </div>

      {!loading && (
        <div className="px-4 py-2 bg-muted">
          <p className="text-sm text-muted-foreground">
            {error ? `Could not load map data: ${error}` : (
              <>
                {incidentMarkers.length} incident{incidentMarkers.length === 1 ? '' : 's'} with a location
                {showOfficial && ` · ${officialMarkers.length} official alerts`}
              </>
            )}
          </p>
        </div>
      )}

      <div className="p-4">
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-medium mb-3">Priority</h3>
            <div className="grid grid-cols-2 gap-3">
              {SEVERITY_LEVELS.map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: severityColor(level) }} />
                  <span className="text-sm">{level}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-gray-400 inline-block" /> Community incident</span>
            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-sm bg-gray-400 inline-block" /> Official alert</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
