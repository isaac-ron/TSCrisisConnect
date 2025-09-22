import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Alert {
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
}

interface LeafletMapProps {
  alerts: Alert[];
  center?: [number, number];
  zoom?: number;
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
        console.log('Geolocation error:', error);
        // Default to a central location if geolocation fails
        const defaultPosition: [number, number] = [40.7128, -74.0060]; // New York City
        setPosition(defaultPosition);
        map.setView(defaultPosition, 10);
      }
    );
  }, [map]);

  const userIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'user-location-marker'
  });

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
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

// Create custom icons for different alert types
const createAlertIcon = (urgency: string) => {
  const getColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const color = getColor(urgency);
  
  return new L.DivIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
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

export default function LeafletMap({ alerts, center = [0, 20], zoom = 3 }: LeafletMapProps) {
  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationMarker />
        
        {alerts.map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.location.lat, alert.location.lng]}
            icon={createAlertIcon(alert.urgency)}
          >
            <Popup>
              <div className="text-sm space-y-2">
                <div className="font-semibold text-base">{alert.type}</div>
                <div className="text-gray-600">{alert.description}</div>
                <div className="text-xs text-gray-500">
                  <div>📍 {alert.location.address}</div>
                  <div>🕒 {new Date(alert.timestamp).toLocaleString()}</div>
                  <div className={`inline-block px-2 py-1 rounded text-white text-xs mt-1 ${
                    alert.urgency === 'High' ? 'bg-red-500' :
                    alert.urgency === 'Medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}>
                    {alert.urgency} Priority
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
