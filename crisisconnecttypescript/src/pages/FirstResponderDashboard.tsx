import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {Card,CardContent,CardHeader,CardTitle} from "../ui/card";
import { Badge } from "../ui/badge";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import type { UserProfile } from '../lib/types';
import {
  Shield,
  LogOut,
  AlertTriangle,
  MessageSquare,
  Clock,
  MapPin,
  Users,
  Activity,
} from "lucide-react";

interface FirstResponderDashboardProps {
  onLogout: () => void;
  user?: UserProfile;
}

interface Report {
  id: string;
  text: string;
  latitude?: number;
  longitude?: number;
  crisisType?: string;
  severity?: string;
  isCrisis?: boolean;
  createdAt: string;
  userId?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export function FirstResponderDashboard({
  onLogout,
  user,
}: FirstResponderDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const responderName = user?.name || "On Duty Responder";
  const responderBadgeLabel = user?.badgeId ? `Badge: ${user.badgeId}` : undefined;
  const responderEmail = user?.email;

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter crisis reports
  const crisisReports = reports.filter(r => r.isCrisis);
  const criticalReports = crisisReports.filter(r => r.severity === 'Critical');
  const activeAlerts = crisisReports.slice(0, 10); // Most recent crisis reports
  const userMessages = reports.slice(0, 20); // All recent reports

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "moderate":
        return "bg-yellow-500 text-black";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500 text-white";
      case "urgent":
        return "bg-orange-500 text-white";
      case "high":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="text-lg">Emergency Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {responderBadgeLabel ? `${responderBadgeLabel} • ` : ""}
                {responderName}
              </p>
              {responderEmail ? (
                <p className="text-xs text-muted-foreground">{responderEmail}</p>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Alerts
                  </p>
                  <p className="text-2xl font-semibold">{crisisReports.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Critical
                  </p>
                  <p className="text-2xl font-semibold">{criticalReports.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Reports
                  </p>
                  <p className="text-2xl font-semibold">{reports.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    System Status
                  </p>
                  <p className="text-2xl font-semibold text-green-500">
                    Online
                  </p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">
              Crisis Alerts
            </TabsTrigger>
            <TabsTrigger value="messages">
              User Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {criticalReports.length} critical alerts require immediate attention. {crisisReports.length} crisis reports pending review.
              </AlertDescription>
            </Alert>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : activeAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active alerts</p>
                  ) : (
                    activeAlerts.slice(0, 2).map((report) => (
                      <div
                        key={report.id}
                        className="flex items-start justify-between p-3 border border-border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <Badge
                              className={getSeverityColor(
                                report.severity?.toLowerCase() || 'moderate',
                              )}
                            >
                              {report.severity || 'Unknown'}
                            </Badge>
                          </div>
                          <p className="font-medium">
                            {report.crisisType || 'Crisis'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {report.text.substring(0, 80)}...
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getTimeAgo(report.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : userMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages</p>
                  ) : (
                    userMessages.slice(0, 2).map((report) => (
                      <div
                        key={report.id}
                        className="p-3 border border-border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {report.user?.name || 'Anonymous'}
                            </p>
                            {report.isCrisis && (
                              <Badge
                                className={getPriorityColor(
                                  report.severity === 'Critical' ? 'critical' : 
                                  report.severity === 'High' ? 'urgent' : 'high'
                                )}
                              >
                                {report.severity || 'Medium'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {report.latitude && report.longitude && (
                          <p className="text-sm text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                          </p>
                        )}
                        <p className="text-sm">
                          {report.text.substring(0, 100)}{report.text.length > 100 ? '...' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getTimeAgo(report.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-4">
              {loading ? (
                <Card><CardContent className="p-4">Loading alerts...</CardContent></Card>
              ) : activeAlerts.length === 0 ? (
                <Card><CardContent className="p-4">No active crisis alerts</CardContent></Card>
              ) : (
                activeAlerts.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <Badge
                            className={getSeverityColor(
                              report.severity?.toLowerCase() || 'moderate',
                            )}
                          >
                            {report.severity || 'Unknown'}
                          </Badge>
                          <Badge variant="outline">
                            {report.crisisType || 'Crisis'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(report.createdAt)}
                        </div>
                      </div>
                      <h3 className="font-medium mb-2">
                        {report.crisisType || 'Emergency Report'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {report.text}
                      </p>
                      {report.latitude && report.longitude && (
                        <p className="text-sm text-muted-foreground mb-3">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          Location: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          <Users className="w-3 h-3 inline mr-1" />
                          Reported by: {report.user?.name || 'Anonymous'}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            View on Map
                          </Button>
                          <Button
                            size="sm"
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              {loading ? (
                <Card><CardContent className="p-4">Loading messages...</CardContent></Card>
              ) : userMessages.length === 0 ? (
                <Card><CardContent className="p-4">No messages</CardContent></Card>
              ) : (
                userMessages.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {report.user?.name || 'Anonymous User'}
                          </p>
                          {report.isCrisis && (
                            <Badge
                              className={getPriorityColor(
                                report.severity === 'Critical' ? 'critical' :
                                report.severity === 'High' ? 'urgent' : 'high'
                              )}
                            >
                              {report.severity || 'Crisis'}
                            </Badge>
                          )}
                          {report.crisisType && (
                            <Badge variant="outline">
                              {report.crisisType}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(report.createdAt)}
                        </div>
                      </div>
                      {report.latitude && report.longitude && (
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                        </p>
                      )}
                      <p className="text-sm mb-3">
                        {report.text}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Location
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Respond
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}