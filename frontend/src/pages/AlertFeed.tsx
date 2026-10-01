import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, Camera, Clock, ExternalLink, Info, MapPin, Radio } from 'lucide-react';
import { crisisTypeLabel } from '../lib/categories';
import { SEVERITY_LEVELS, normalizeSeverity, severityBadgeClass, severityColor } from '../lib/severity';
import { Button } from '../ui/button';
import {
  fetchIncidents, fetchOfficialAlerts, incidentStatus, OFFICIAL_SOURCE_LABELS, timeAgo,
  type Incident, type OfficialAlert,
} from '../lib/incidents';

const REFRESH_MS = 30_000;
// Most severe first; SEVERITY_LEVELS is ordered Critical -> Low
const severityRank = (s: string) => {
  const i = SEVERITY_LEVELS.indexOf(normalizeSeverity(s) as (typeof SEVERITY_LEVELS)[number]);
  return i === -1 ? SEVERITY_LEVELS.length : i;
};

function IncidentCard({ incident }: { incident: Incident }) {
  const status = incidentStatus(incident);
  const official = incident.corroboration.officialAlert;
  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: severityColor(incident.priority) }}>
      <CardHeader className="pb-2">
        <div className="flex gap-2 flex-wrap items-center">
          <Badge className={severityBadgeClass(incident.priority)}>{incident.priority}</Badge>
          <Badge variant="outline">{crisisTypeLabel(incident.crisisType)}</Badge>
          <Badge className={status.className}>{status.label}</Badge>
          {incident.corroboration.photoEvidence && (
            <Badge variant="outline" className="gap-1"><Camera className="w-3 h-3" /> Photo</Badge>
          )}
        </div>
        {incident.summary && <CardTitle className="text-base font-medium leading-snug pt-2">{incident.summary}</CardTitle>}
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          {incident.locationName || 'Location not specified'}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          Last report {timeAgo(incident.lastReportedAt)}
          {incident.reportCount > 1 && ` · ${incident.reportCount} reports`}
        </div>
        {official && (
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 flex-shrink-0" />
            {official.url ? (
              <a href={official.url} target="_blank" rel="noopener noreferrer" className="underline">{official.title}</a>
            ) : official.title}
          </div>
        )}
        {incident.reviewNote && <p className="pt-1 text-foreground">Responder note: {incident.reviewNote}</p>}
      </CardContent>
    </Card>
  );
}

function OfficialAlertCard({ alert }: { alert: OfficialAlert }) {
  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: severityColor(alert.severity) }}>
      <CardContent className="p-4 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <Badge className={severityBadgeClass(alert.severity)}>{alert.severity}</Badge>
          <Badge variant="outline">{crisisTypeLabel(alert.crisisType)}</Badge>
          <Badge variant="secondary">{OFFICIAL_SOURCE_LABELS[alert.source]}</Badge>
        </div>
        <p className="font-medium">{alert.title}</p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{timeAgo(alert.eventTime)}</span>
          {alert.url && (
            <a href={alert.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
              Source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Info className="w-10 h-10 text-blue-500 mb-3" />
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

export function AlertFeed() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [official, setOfficial] = useState<OfficialAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Low-severity official alerts (small quakes, GDACS "green" wildfires) are numerous; hide them by default
  const [showLowOfficial, setShowLowOfficial] = useState(false);

  const load = useCallback(async () => {
    try {
      const [incidentData, officialData] = await Promise.all([fetchIncidents(), fetchOfficialAlerts()]);
      setIncidents(incidentData);
      setOfficial(officialData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const sortedOfficial = official && [...official].sort((a, b) =>
    severityRank(a.severity) - severityRank(b.severity) || b.eventTime.localeCompare(a.eventTime));
  const lowCount = official?.filter((a) => normalizeSeverity(a.severity) === 'Low').length ?? 0;
  const visibleOfficial = sortedOfficial?.filter((a) => showLowOfficial || normalizeSeverity(a.severity) !== 'Low');

  if (error && !incidents) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load alerts</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Live Alerts</h1>
      <p className="text-sm text-muted-foreground">
        Community reports are grouped into incidents. A report is unverified until other people report the same thing,
        it matches an official alert, or responders confirm it.
      </p>
      <Tabs defaultValue="community">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="community">Community ({incidents?.length ?? '…'})</TabsTrigger>
          <TabsTrigger value="official">Official ({visibleOfficial?.length ?? '…'})</TabsTrigger>
        </TabsList>
        <TabsContent value="community" className="mt-4 space-y-3">
          {!incidents ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)
            : incidents.length === 0 ? <EmptyState title="No active incidents" text="New community reports will appear here." />
              : incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
        </TabsContent>
        <TabsContent value="official" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Earthquakes from USGS and disaster alerts from GDACS, past 7 days, most severe first.
          </p>
          {!visibleOfficial ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)
            : visibleOfficial.length === 0 && lowCount === 0 ? <EmptyState title="No official alerts" text="The official feeds are empty or unavailable." />
              : visibleOfficial.map((alert) => <OfficialAlertCard key={alert.id} alert={alert} />)}
          {lowCount > 0 && (
            <Button variant="outline" className="w-full" onClick={() => setShowLowOfficial(!showLowOfficial)}>
              {showLowOfficial ? 'Hide' : 'Show'} {lowCount} low-severity alert{lowCount === 1 ? '' : 's'}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
