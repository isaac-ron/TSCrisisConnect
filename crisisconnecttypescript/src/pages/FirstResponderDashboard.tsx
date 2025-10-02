import { useState } from "react";
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
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface FirstResponderDashboardProps {
  onLogout: () => void;
  user?: UserProfile;
}

// Mock data for alerts
const mockAlerts = [
  {
    id: "1",
    type: "earthquake",
    severity: "critical",
    location: "Downtown Los Angeles",
    time: "2 minutes ago",
    description:
      "Magnitude 6.2 earthquake detected. Multiple reports of structural damage.",
    status: "active",
    reportCount: 47,
  },
  {
    id: "2",
    type: "fire",
    severity: "high",
    location: "Griffith Park",
    time: "15 minutes ago",
    description:
      "Wildfire spreading rapidly near residential areas.",
    status: "active",
    reportCount: 23,
  },
  {
    id: "3",
    type: "flood",
    severity: "moderate",
    location: "Santa Monica",
    time: "1 hour ago",
    description: "Flash flood warning due to heavy rainfall.",
    status: "monitoring",
    reportCount: 12,
  },
];

// Mock data for user messages
const mockMessages = [
  {
    id: "1",
    sender: "Sarah Chen",
    location: "Downtown LA",
    time: "3 minutes ago",
    message:
      "Building shaking violently, people evacuating to street. Glass broken in lobby.",
    category: "earthquake",
    priority: "urgent",
    status: "unread",
  },
  {
    id: "2",
    sender: "Mike Rodriguez",
    location: "Griffith Park Area",
    time: "8 minutes ago",
    message:
      "Can see flames approaching residential area. Evacuation needed immediately.",
    category: "fire",
    priority: "critical",
    status: "unread",
  },
  {
    id: "3",
    sender: "Lisa Johnson",
    location: "Santa Monica",
    time: "25 minutes ago",
    message:
      "Streets flooding rapidly. Cars stalled. Need rescue assistance.",
    category: "flood",
    priority: "high",
    status: "read",
  },
  {
    id: "4",
    sender: "David Park",
    location: "Beverly Hills",
    time: "1 hour ago",
    message:
      "All clear in our area. No damage reported. Standing by to assist.",
    category: "status",
    priority: "low",
    status: "read",
  },
];

export function FirstResponderDashboard({
  onLogout,
  user,
}: FirstResponderDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const responderName = user?.name || "On Duty Responder";
  const responderBadgeLabel = user?.badgeId ? `Badge: ${user.badgeId}` : undefined;
  const responderEmail = user?.email;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        );
      case "monitoring":
        return (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        );
      case "resolved":
        return (
          <CheckCircle className="w-4 h-4 text-green-500" />
        );
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
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
                  <p className="text-2xl font-semibold">3</p>
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
                    New Messages
                  </p>
                  <p className="text-2xl font-semibold">2</p>
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
                  <p className="text-2xl font-semibold">82</p>
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
                2 critical alerts require immediate attention. 3
                new user messages pending review.
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
                  {mockAlerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(alert.status)}
                          <Badge
                            className={getSeverityColor(
                              alert.severity,
                            )}
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {alert.location}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  ))}
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
                  {mockMessages.slice(0, 2).map((message) => (
                    <div
                      key={message.id}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {message.sender}
                          </p>
                          <Badge
                            className={getPriorityColor(
                              message.priority,
                            )}
                          >
                            {message.priority}
                          </Badge>
                        </div>
                        {message.status === "unread" && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {message.location}
                      </p>
                      <p className="text-sm">
                        {message.message}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-4">
              {mockAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <Badge
                          className={getSeverityColor(
                            alert.severity,
                          )}
                        >
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">
                          {alert.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.time}
                      </div>
                    </div>
                    <h3 className="font-medium mb-2">
                      {alert.location}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <Users className="w-3 h-3 inline mr-1" />
                        {alert.reportCount} reports
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              {mockMessages.map((message) => (
                <Card key={message.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {message.sender}
                        </p>
                        <Badge
                          className={getPriorityColor(
                            message.priority,
                          )}
                        >
                          {message.priority}
                        </Badge>
                        <Badge variant="outline">
                          {message.category}
                        </Badge>
                        {message.status === "unread" && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.time}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {message.location}
                    </p>
                    <p className="text-sm mb-3">
                      {message.message}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Mark as Read
                      </Button>
                      <Button size="sm" variant="outline">
                        Forward
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
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}