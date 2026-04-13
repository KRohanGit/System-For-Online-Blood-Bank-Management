import React, { useEffect } from 'react';
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

const sourceIcon = createIcon('A', '#0ea5a4');
const destinationIcon = createIcon('B', '#ef4444');

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
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

function formatMinutes(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  return `${Math.round(Number(value))} mins`;
}

export default function DeliveryPlanningMap({ sourceHospital, targetHospital, estimate }) {
  const sourceLocation = normalizePoint(sourceHospital?.location);
  const targetLocation = normalizePoint(targetHospital?.location);
  const routeCoordinates = Array.isArray(estimate?.route_coordinates) && estimate.route_coordinates.length >= 2
    ? estimate.route_coordinates
    : sourceLocation && targetLocation
      ? [sourceLocation, targetLocation]
      : [];

  const center = routeCoordinates[0] || sourceLocation || targetLocation || [17.7231, 83.3012];

  return (
    <div className="delivery-map-shell planning-shell">
      <div className="delivery-map-copy">
        <div>
          <span className="map-eyebrow">View Details Map</span>
          <h3>Static planning route</h3>
          <p>Use this before acceptance to compare route distance, base ETA, and ML ETA.</p>
        </div>
        <div className="delivery-map-metrics">
          <div className="delivery-metric">
            <span>Distance</span>
            <strong>{estimate?.distance_km ?? '--'} km</strong>
          </div>
          <div className="delivery-metric">
            <span>Base ETA</span>
            <strong>{formatMinutes(estimate?.base_eta)}</strong>
          </div>
          <div className="delivery-metric accent">
            <span>ML ETA</span>
            <strong>{formatMinutes(estimate?.ml_eta)}</strong>
          </div>
          <div className="delivery-metric">
            <span>Arrival At</span>
            <strong>{estimate?.estimated_arrival_at ? new Date(estimate.estimated_arrival_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</strong>
          </div>
          <div className="delivery-metric">
            <span>Traffic</span>
            <strong>{estimate?.traffic || 'Unknown'}</strong>
          </div>
        </div>
      </div>

      <div className="delivery-map-frame">
        <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="delivery-leaflet-map">
          <FitBounds points={routeCoordinates} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {sourceLocation && (
            <Marker position={sourceLocation} icon={sourceIcon}>
              <Popup>
                <strong>{sourceHospital?.hospitalName || 'Source hospital'}</strong>
                <div>Planning origin</div>
              </Popup>
            </Marker>
          )}
          {targetLocation && (
            <Marker position={targetLocation} icon={destinationIcon}>
              <Popup>
                <strong>{targetHospital?.hospitalName || 'Destination hospital'}</strong>
                <div>Route destination</div>
              </Popup>
            </Marker>
          )}
          {routeCoordinates.length >= 2 && (
            <Polyline positions={routeCoordinates} pathOptions={{ color: '#0ea5a4', weight: 4, opacity: 0.9 }} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
