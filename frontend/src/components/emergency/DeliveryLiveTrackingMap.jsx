import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import './DeliveryMaps.css';

const createIcon = (label, color) =>
  L.divIcon({
    className: 'delivery-map-icon',
    html: `<div class="delivery-map-marker" style="--marker-color:${color}"><span>${label}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

const ambulanceIcon = createIcon('A', '#f59e0b');
const destinationIcon = createIcon('B', '#ef4444');
const sourceIcon = createIcon('S', '#0ea5a4');

function normalizePoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return [Number(point[0]), Number(point[1])];
  }

  if (point && typeof point === 'object') {
    const latitude = Number(point.latitude ?? point.lat);
    const longitude = Number(point.longitude ?? point.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [latitude, longitude];
    }
  }

  return null;
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [34, 34] });
  }, [map, points]);

  return null;
}

function formatMinutes(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  return `${Math.round(Number(value))} mins`;
}

export default function DeliveryLiveTrackingMap({ session }) {
  const routeCoordinates = useMemo(() => {
    if (Array.isArray(session?.route_coordinates) && session.route_coordinates.length >= 2) {
      return session.route_coordinates.map((point) => normalizePoint(point)).filter(Boolean);
    }

    const sourceLocation = normalizePoint(session?.from?.location);
    const destinationLocation = normalizePoint(session?.to?.location);
    return sourceLocation && destinationLocation ? [sourceLocation, destinationLocation] : [];
  }, [session]);

  const currentLocation = normalizePoint(session?.current_location) || normalizePoint(session?.from?.location) || routeCoordinates[0];
  const center = currentLocation || routeCoordinates[0] || [17.7231, 83.3012];
  const status = String(session?.status || 'IN_TRANSIT').toUpperCase();
  const statusLabel = status === 'DELIVERED' ? 'Delivered' : 'In Transit';

  return (
    <div className="delivery-map-shell live-shell">
      <div className="delivery-map-copy">
        <div>
          <span className="map-eyebrow">Live Tracking Map</span>
          <h3>Active ambulance session</h3>
          <p>Updated from websocket GPS events or simulation updates during transit.</p>
        </div>
        <div className="delivery-map-metrics">
          <div className="delivery-metric accent">
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <div className="delivery-metric">
            <span>Remaining</span>
            <strong>{session?.distance_remaining ?? '--'} km</strong>
          </div>
          <div className="delivery-metric">
            <span>Live ETA</span>
            <strong>{formatMinutes(session?.eta)}</strong>
          </div>
          <div className="delivery-metric accent">
            <span>Arrival At</span>
            <strong>{session?.estimated_arrival_at ? new Date(session.estimated_arrival_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</strong>
          </div>
          <div className="delivery-metric">
            <span>Traffic</span>
            <strong>{session?.traffic || 'Unknown'}</strong>
          </div>
        </div>
      </div>

      <div className="delivery-map-frame">
        <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="delivery-leaflet-map">
          <FitBounds points={routeCoordinates.length >= 2 ? routeCoordinates : [center, session?.to?.location || center]} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {session?.from?.location && (
            <Marker position={session.from.location} icon={sourceIcon}>
              <Popup>
                <strong>{session.from.hospitalName || 'Source hospital'}</strong>
                <div>Dispatch origin</div>
              </Popup>
            </Marker>
          )}
          {session?.to?.location && (
            <Marker position={session.to.location} icon={destinationIcon}>
              <Popup>
                <strong>{session.to.hospitalName || 'Destination hospital'}</strong>
                <div>Receiving hospital</div>
              </Popup>
            </Marker>
          )}
          {currentLocation && (
            <Marker position={currentLocation} icon={ambulanceIcon}>
              <Popup>
                <strong>Ambulance</strong>
                <div>{statusLabel}</div>
                <div>Live ETA: {formatMinutes(session?.eta)}</div>
              </Popup>
            </Marker>
          )}
          {routeCoordinates.length >= 2 && (
            <Polyline positions={routeCoordinates} pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.92 }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
