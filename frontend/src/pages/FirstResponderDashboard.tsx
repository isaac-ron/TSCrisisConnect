import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertTriangle, Camera, ChevronDown, ChevronUp, Clock, LogOut, MapPin, Radio, Shield } from 'lucide-react';
import type { UserProfile } from '../lib/types';
import { crisisTypeLabel } from '../lib/categories';
import { severityBadgeClass, severityColor } from '../lib/severity';
import {
  fetchIncident, fetchIncidents, incidentStatus, reviewIncident, timeAgo,
  type Incident, type IncidentDetail, type ReviewStatus,
} from '../lib/incidents';

interface FirstResponderDashboardProps {
  onLogout: () => void;
  user?: UserProfile;
}

const REFRESH_MS = 30_000;
const isUrgent = (i: Incident) => i.priority === 'High' || i.priority === 'Critical';
const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

// Which review actions make sense from each state
const ACTIONS: Record<ReviewStatus, { status: ReviewStatus; label: string; variant: 'default' | 'outline' | 'destructive' }[]> = {
  pending: [
    { status: 'verified', label: 'Verify', variant: 'default' },
    { status: 'dismissed', label: 'Dismiss', variant: 'outline' },
  ],
  verified: [
    { status: 'resolved', label: 'Mark resolved', variant: 'default' },
    { status: 'pending', label: 'Reopen', variant: 'outline' },
  ],
  dismissed: [{ status: 'pending', label: 'Reopen', variant: 'outline' }],
  resolved: [{ status: 'pending', label: 'Reopen', variant: 'outline' }],
};

function ReportList({ detail }: { detail: IncidentDetail }) {
  return (
    <div className="space-y-2 pt-3 border-t border-border">
      {detail.reports.map((report) => (
        <div key={report.id} className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <p>{report.description}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{timeAgo(report.timestamp)}</span>
            {report.reporter.anonymous ? <span>Anonymous reporter</span> : (
              <span>
                {report.reporter.name} ({report.reporter.email}) · history: {report.reporter.trackRecord.confirmed} confirmed,{' '}
                {report.reporter.trackRecord.dismissed} dismissed
              </span>
            )}
            {report.isCrisis === false && <span className="text-orange-600">model: probably not a crisis</span>}
            {report.imageVerified && <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> photo shows a crisis</span>}
            {report.severity && <span>model priority: {report.severity}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentCard({ incident, onReviewed }: { incident: Incident; onReviewed: (updated: Incident) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = incidentStatus(incident);
  const official = incident.corroboration.officialAlert;

  const toggleReports = async () => {
    setExpanded(!expanded);
    if (!detail) {
      try {
        setDetail(await fetchIncident(incident.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      }
    }
  };

  const review = async (next: ReviewStatus) => {
    setBusy(true);
    setError(null);
    try {
      onReviewed(await reviewIncident(incident.id, next, note));
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: severityColor(incident.priority) }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={severityBadgeClass(incident.priority)}>{incident.priority}</Badge>
          <Badge variant="outline">{crisisTypeLabel(incident.crisisType)}</Badge>
          <Badge className={status.className}>{status.label}</Badge>
          {incident.corroboration.photoEvidence && <Badge variant="outline" className="gap-1"><Camera className="w-3 h-3" /> Photo</Badge>}
          {incident.modelDoubt && (
            <Badge variant="outline" className="gap-1 text-orange-700 border-orange-300">
              <AlertTriangle className="w-3 h-3" /> Model doubts this is a crisis
            </Badge>
          )}
        </div>

        {incident.summary && <p className="text-sm">{incident.summary}</p>}

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {incident.locationName || 'No location'}
            {incident.latitude !== null && incident.longitude !== null && (
              <a className="underline" href={osmLink(incident.latitude, incident.longitude)} target="_blank" rel="noopener noreferrer">map</a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            First {timeAgo(incident.firstReportedAt)} · last {timeAgo(incident.lastReportedAt)} · {incident.reportCount} report
            {incident.reportCount === 1 ? '' : 's'} from {incident.corroboration.independentReporters} independent reporter
            {incident.corroboration.independentReporters === 1 ? '' : 's'}
          </div>
          {official && (
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              {official.url ? <a className="underline" href={official.url} target="_blank" rel="noopener noreferrer">{official.title}</a> : official.title}
            </div>
          )}
          {incident.reviewNote && <p className="text-foreground">Note: {incident.reviewNote}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            maxLength={500}
            className="h-9 max-w-xs"
          />
          {ACTIONS[incident.reviewStatus].map((action) => (
            <Button key={action.status} size="sm" variant={action.variant} disabled={busy} onClick={() => review(action.status)}>
              {action.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={toggleReports}>
            {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Reports
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {expanded && (detail ? <ReportList detail={detail} /> : !error && <p className="text-sm text-muted-foreground">Loading reports…</p>)}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${className}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function FirstResponderDashboard({ onLogout, user }: FirstResponderDashboardProps) {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIncidents(await fetchIncidents(true));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const replace = (updated: Incident) =>
    setIncidents((current) => current?.map((i) => (i.id === updated.id ? updated : i)) ?? current);

  const all = incidents ?? [];
  const byStatus = (...statuses: ReviewStatus[]) => all.filter((i) => statuses.includes(i.reviewStatus));
  const pending = byStatus('pending');
  const tabs = [
    { value: 'review', label: 'Needs review', items: pending },
    { value: 'active', label: 'Active', items: byStatus('verified') },
    { value: 'closed', label: 'Closed', items: byStatus('resolved', 'dismissed') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="text-lg">Incident Review</h1>
              <p className="text-sm text-muted-foreground">
                {user?.badgeId ? `Badge ${user.badgeId} · ` : ''}{user?.name || 'Responder'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Needs review" value={pending.length} />
          <Stat label="Urgent, needs review" value={pending.filter(isUrgent).length} className="text-red-600" />
          <Stat label="Corroborated, needs review" value={pending.filter((i) => i.corroboration.level !== 'single-report').length} />
          <Stat label="Verified and active" value={byStatus('verified').length} className="text-green-600" />
        </div>

        {error && <p className="text-sm text-red-600">Could not refresh incidents: {error}</p>}

        <Tabs defaultValue="review">
          <TabsList className="grid w-full grid-cols-3">
            {tabs.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label} ({t.items.length})</TabsTrigger>)}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="space-y-3 mt-4">
              {!incidents ? <p className="text-sm text-muted-foreground">Loading…</p>
                : t.items.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here.</p>
                  : t.items.map((incident) => <IncidentCard key={incident.id} incident={incident} onReviewed={replace} />)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
