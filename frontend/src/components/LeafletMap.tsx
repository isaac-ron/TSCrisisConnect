import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Bundled locally (rather than from a CDN) so markers still render offline
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { severityBadgeClass, severityColor } from '../lib/severity';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface MapAlert {
  id: string;
  type: string;
  urgency: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: string;
  /** Circles for community incidents, squares for official alerts */
  shape?: 'circle' | 'square';
  statusLabel?: string;
  link?: { href: string; label: string };
}

interface LeafletMapProps {
  alerts: MapAlert[];
  center?: [number, number];
  zoom?: number;
  showMyLocation?: boolean;
}

// Component to handle user location
function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPosition: [number, number] = [latitude, longitude];
        setPosition(newPosition);
        map.flyTo(newPosition, 13);
      },
      (error) => {
        // Without a real position, show no marker rather than a made-up one
        console.log('Geolocation error:', error);
      }
    );
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="text-sm">
          <strong>Your Location</strong>
          <br />
          Lat: {position[0].toFixed(4)}
          <br />
          Lng: {position[1].toFixed(4)}
        </div>
      </Popup>
    </Marker>
  );
}

// Marker colored by severity
const createAlertIcon = (urgency: string, shape: MapAlert['shape'] = 'circle') => {
  return new L.DivIcon({
    html: `
      <div style="
        background-color: ${severityColor(urgency)};
        width: 20px;
        height: 20px;
        border-radius: ${shape === 'square' ? '3px' : '50%'};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: `alert-marker alert-${urgency.toLowerCase()}`
  });
};

export default function LeafletMap({ alerts, center = [0, 20], zoom = 3, showMyLocation = true }: LeafletMapProps) {
  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showMyLocation && <LocationMarker />}

        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.location.lat, alert.location.lng]}
            icon={createAlertIcon(alert.urgency, alert.shape)}
          >
            <Popup>
              <div className="text-sm space-y-2">
                <div className="font-semibold text-base">{alert.type}</div>
                {alert.statusLabel && <div className="text-xs font-medium">{alert.statusLabel}</div>}
                <div className="text-gray-600">{alert.description}</div>
                <div className="text-xs text-gray-500">
                  <div>📍 {alert.location.address}</div>
                  <div>🕒 {new Date(alert.timestamp).toLocaleString()}</div>
                  <div className={`inline-block px-2 py-1 rounded text-xs mt-1 ${severityBadgeClass(alert.urgency)}`}>
                    {alert.urgency} Priority
                  </div>
                  {alert.link && (
                    <div className="mt-1">
                      <a href={alert.link.href} target="_blank" rel="noopener noreferrer">{alert.link.label}</a>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
