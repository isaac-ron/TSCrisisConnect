import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Clock, MapPin, Info } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { FirstResponderCard } from '../ui/first-responder-card';
import { API_BASE_URL } from '../lib/config';
import { crisisTypeLabel } from '../lib/categories';
import { severityBadgeClass, severityColor } from '../lib/severity';

// Define the structure of a report to match the backend data
interface FirstResponder {
  id: number;
  name: string;
  department: string;
  phoneNumber: string;
  badgeNumber: string;
}

interface Report {
  // Community reports and social-media alerts share one feed; ids are only unique per source
  key: string;
  source: 'community' | 'social';
  id: number;
  description: string;
  location: string | null;
  status: string;
  timestamp: string;
  severity: string | null;
  extractedLocation: string | null;
  crisisType: string | null;
  confidence: number | null;
  category?: string | null;
  assignedResponder?: FirstResponder | null;
}

// Helper function to format how long ago a report was made
const timeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

export function AlertFeed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch reports from the backend API
  const fetchReports = async () => {
    try {
      const [reportsResponse, socialResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/reports`),
        fetch(`${API_BASE_URL}/social/social-alerts`),
      ]);
      if (!reportsResponse.ok || !socialResponse.ok) {
        throw new Error(`Failed to fetch: ${(reportsResponse.ok ? socialResponse : reportsResponse).statusText}`);
      }
      const community: Omit<Report, 'key' | 'source'>[] = await reportsResponse.json();
      const social: Omit<Report, 'key' | 'source'>[] = await socialResponse.json();
      const data: Report[] = [
        ...community.map((r) => ({ ...r, source: 'community' as const, key: `community-${r.id}` })),
        ...social.map((r) => ({ ...r, source: 'social' as const, key: `social-${r.id}` })),
      ];
      // Sort reports to show the newest ones first
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports when the component first loads and then poll for new data
  useEffect(() => {
    fetchReports(); // Initial fetch
    const intervalId = setInterval(fetchReports, 10000); // Refresh every 10 seconds

    // Clean up the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []);

  // Show loading skeletons while data is being fetched
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold">Live Alert Feed</h1>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex items-center pt-2">
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show an error message if the fetch request fails
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Alerts</h2>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-muted-foreground mt-2">Please check the server connection and try again.</p>
      </div>
    );
  }

  // Show a message if there are no reports
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Info className="w-12 h-12 text-blue-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Alerts</h2>
        <p className="text-muted-foreground">The alert feed is currently empty. New reports will appear here as they are submitted.</p>
      </div>
    );
  }

  // Render the list of fetched reports
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">Live Alert Feed</h1>
      {reports.map((report) => (
        <Card key={report.key} className="overflow-hidden border-l-4" style={{
          borderLeftColor: severityColor(report.severity)
        }}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold leading-tight mb-2">{report.description}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={severityBadgeClass(report.severity)}>
                    {report.severity || 'Unknown'}
                  </Badge>
                  {(report.crisisType || report.category) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {crisisTypeLabel(report.crisisType, report.category)}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {report.source === 'community' ? 'Community report' : 'Social media'}
                  </Badge>
                  {report.confidence && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      {Math.round(report.confidence * 100)}% confidence
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{report.extractedLocation || report.location || 'Not specified'}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Reported {timeSince(new Date(report.timestamp))}</span>
              </div>
              
              {/* First Responder Contact Card */}
              {report.assignedResponder && (
                <div className="mt-4">
                  <FirstResponderCard responder={report.assignedResponder} compact />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}