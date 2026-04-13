const Redis = require('ioredis');
const mlService = require('./ml/mlService');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || '';
const CACHE_TTL_SECONDS = Number(process.env.DELIVERY_ESTIMATE_CACHE_TTL || 600);
const DELIVERY_SPEED_KMH = Number(process.env.DELIVERY_SPEED_KMH || 42);

let redisClient = null;
const memoryCache = new Map();

function getRedisClient() {
  if (redisClient || !process.env.REDIS_URL) {
    return redisClient;
  }

  redisClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000
  });

  redisClient.on('error', (error) => {
    console.warn('Redis delivery cache error:', error.message);
  });

  return redisClient;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCoordinatePair(input) {
  if (!input) {
    throw new Error('Coordinate pair is required');
  }

  if (typeof input === 'string') {
    const parts = input.split(',').map((value) => Number(value.trim()));
    if (parts.length !== 2 || parts.some((value) => !Number.isFinite(value))) {
      throw new Error('Invalid coordinate string. Expected "lat,lng"');
    }
    return { latitude: parts[0], longitude: parts[1] };
  }

  if (Array.isArray(input)) {
    if (input.length !== 2) {
      throw new Error('Invalid coordinate array. Expected [lat, lng]');
    }
    return {
      latitude: Number(input[0]),
      longitude: Number(input[1])
    };
  }

  if (typeof input === 'object') {
    const latitude = Number(input.latitude ?? input.lat ?? input.y);
    const longitude = Number(input.longitude ?? input.lng ?? input.lon ?? input.x);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Invalid coordinate object');
    }
    return { latitude, longitude };
  }

  throw new Error('Unsupported coordinate format');
}

function haversineKm(from, to) {
  const R = 6371;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trafficMultiplierFromContext({ hourOfDay, dayOfWeek, weatherScore }) {
  let multiplier = 1.05;
  const peakHours = (hourOfDay >= 7 && hourOfDay <= 10) || (hourOfDay >= 17 && hourOfDay <= 20);

  if (peakHours) multiplier += 0.22;
  if ([0, 6].includes(dayOfWeek)) multiplier -= 0.04;
  if (weatherScore !== null && weatherScore !== undefined) {
    const normalizedWeather = Math.max(0, Math.min(1, Number(weatherScore)));
    multiplier += (1 - normalizedWeather) * 0.16;
  }

  return Number(Math.max(1.0, multiplier).toFixed(2));
}

function classifyTraffic(durationMinutes, durationInTrafficMinutes) {
  const safeDuration = Math.max(durationMinutes, 1);
  const ratio = durationInTrafficMinutes / safeDuration;

  if (ratio < 1.2) return 'Low';
  if (ratio < 1.5) return 'Moderate';
  return 'High';
}

function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;

    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = (result & 1) ? ~(result >> 1) : (result >> 1);
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = (result & 1) ? ~(result >> 1) : (result >> 1);
    longitude += deltaLongitude;

    coordinates.push([
      Number((latitude / 1e5).toFixed(6)),
      Number((longitude / 1e5).toFixed(6))
    ]);
  }

  return coordinates;
}

async function cacheGet(cacheKey) {
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error.message);
    }
  }

  const localEntry = memoryCache.get(cacheKey);
  if (localEntry && localEntry.expiresAt > Date.now()) {
    return localEntry.value;
  }

  if (localEntry) {
    memoryCache.delete(cacheKey);
  }

  return null;
}

async function cacheSet(cacheKey, value) {
  const client = getRedisClient();
  if (client) {
    try {
      await client.set(cacheKey, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
      return;
    } catch (error) {
      console.warn('Redis cache write failed:', error.message);
    }
  }

  memoryCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000
  });
}

async function fetchGoogleDirections(from, to) {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    origin: `${from.latitude},${from.longitude}`,
    destination: `${to.latitude},${to.longitude}`,
    mode: 'driving',
    departure_time: 'now',
    traffic_model: 'best_guess',
    alternatives: 'false',
    units: 'metric',
    key: GOOGLE_MAPS_API_KEY
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  const leg = route?.legs?.[0];

  if (!route || !leg || data.status !== 'OK') {
    return null;
  }

  const distanceKm = Number((toNumber(leg.distance?.value, 0) / 1000).toFixed(2));
  const baseDurationMinutes = toNumber(leg.duration?.value, 0) / 60;
  const trafficDurationMinutes = toNumber(leg.duration_in_traffic?.value, leg.duration?.value || 0) / 60;

  return {
    provider: 'google-maps',
    distanceKm,
    baseDurationMinutes: Number(baseDurationMinutes.toFixed(1)),
    trafficDurationMinutes: Number((trafficDurationMinutes || baseDurationMinutes).toFixed(1)),
    routeName: route.summary ? `via ${route.summary}` : 'via Google Maps route',
    routeCoordinates: decodePolyline(route.overview_polyline?.points),
    routePolyline: route.overview_polyline?.points || ''
  };
}

async function fetchMapboxDirections(from, to) {
  if (!MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  url.searchParams.set('overview', 'full');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route) {
    return null;
  }

  const distanceKm = Number((toNumber(route.distance, 0) / 1000).toFixed(2));
  const baseDurationMinutes = toNumber(route.duration, 0) / 60;
  const trafficDurationMinutes = baseDurationMinutes * 1.12;

  return {
    provider: 'mapbox',
    distanceKm,
    baseDurationMinutes: Number(baseDurationMinutes.toFixed(1)),
    trafficDurationMinutes: Number(trafficDurationMinutes.toFixed(1)),
    routeName: 'via Mapbox route',
    routeCoordinates: Array.isArray(route.geometry?.coordinates)
      ? route.geometry.coordinates.map(([lng, lat]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))])
      : [],
    routePolyline: route.geometry?.coordinates ? JSON.stringify(route.geometry.coordinates) : ''
  };
}

function buildFallbackRoute(from, to, priorityLevel, weatherScore) {
  const distanceKm = haversineKm(from, to);
  const now = new Date();
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  const trafficMultiplier = trafficMultiplierFromContext({ hourOfDay, dayOfWeek, weatherScore });
  const freeFlowSpeed = priorityLevel === 'CRITICAL' ? 48 : DELIVERY_SPEED_KMH;
  const baseDurationMinutes = Number(((distanceKm / Math.max(freeFlowSpeed, 1)) * 60).toFixed(1));
  const trafficDurationMinutes = Number((baseDurationMinutes * trafficMultiplier).toFixed(1));

  return {
    provider: 'haversine',
    distanceKm: Number(distanceKm.toFixed(2)),
    baseDurationMinutes,
    trafficDurationMinutes,
    routeName: 'via direct route',
    routeCoordinates: [
      [Number(from.latitude.toFixed(6)), Number(from.longitude.toFixed(6))],
      [Number(to.latitude.toFixed(6)), Number(to.longitude.toFixed(6))]
    ],
    routePolyline: '',
    hourOfDay,
    dayOfWeek,
    trafficMultiplier
  };
}

async function getRouteIntelligence(from, to, priorityLevel, weatherScore) {
  const googleRoute = await fetchGoogleDirections(from, to);
  if (googleRoute) {
    return googleRoute;
  }

  const mapboxRoute = await fetchMapboxDirections(from, to);
  if (mapboxRoute) {
    return mapboxRoute;
  }

  return buildFallbackRoute(from, to, priorityLevel, weatherScore);
}

function calculateFinalEta(baseEtaMinutes, mlEtaMinutes, trafficLevel, priorityLevel) {
  const weighted = (0.7 * baseEtaMinutes) + (0.3 * mlEtaMinutes);
  let finalEta = trafficLevel === 'High' ? mlEtaMinutes : weighted;

  if (priorityLevel === 'CRITICAL') {
    finalEta *= 0.9;
  }

  return Number(Math.max(1, finalEta).toFixed(1));
}

async function getDeliveryEstimate({ from, to, priority = 'HIGH', weatherScore = null, emergencyPriority = false }) {
  const source = parseCoordinatePair(from);
  const destination = parseCoordinatePair(to);
  const priorityLevel = String(priority || 'HIGH').toUpperCase();
  const normalizedPriority = emergencyPriority || priorityLevel === 'CRITICAL' ? 'CRITICAL' : priorityLevel;
  const cacheKey = [
    'delivery-estimate',
    source.latitude.toFixed(5),
    source.longitude.toFixed(5),
    destination.latitude.toFixed(5),
    destination.longitude.toFixed(5),
    normalizedPriority,
    weatherScore === null || weatherScore === undefined ? 'na' : Number(weatherScore).toFixed(2)
  ].join(':');

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const routeIntelligence = await getRouteIntelligence(source, destination, normalizedPriority, weatherScore);
  const baseEtaMinutes = routeIntelligence.trafficDurationMinutes || routeIntelligence.baseDurationMinutes;
  const durationMinutes = routeIntelligence.baseDurationMinutes || baseEtaMinutes;
  const trafficRatio = Number((baseEtaMinutes / Math.max(durationMinutes, 1)).toFixed(2));
  const traffic = classifyTraffic(durationMinutes, baseEtaMinutes);
  const routeComplexityScore = Number(Math.max(0.1, Math.min(1, (
    (routeIntelligence.routeCoordinates?.length || 2) / 18 +
    Math.max(0, trafficRatio - 1) * 0.18 +
    (normalizedPriority === 'CRITICAL' ? 0.08 : 0)
  ))).toFixed(2));
  const historicalDelayFactor = Number(Math.max(0.9, Math.min(2.0, (
    1 + Math.max(0, trafficRatio - 1) * 0.42 +
    (traffic === 'High' ? 0.18 : traffic === 'Moderate' ? 0.08 : 0)
  ))).toFixed(2));

  const mlPayload = {
    distance_km: routeIntelligence.distanceKm,
    base_eta_minutes: baseEtaMinutes,
    hour_of_day: routeIntelligence.hourOfDay ?? new Date().getHours(),
    day_of_week: routeIntelligence.dayOfWeek ?? new Date().getDay(),
    traffic_ratio: trafficRatio,
    weather_score: weatherScore === null || weatherScore === undefined ? 0.5 : Number(weatherScore),
    priority_flag: normalizedPriority === 'CRITICAL' ? 1 : 0,
    route_complexity_score: routeComplexityScore,
    historical_delay_factor: historicalDelayFactor
  };

  let mlEtaMinutes = baseEtaMinutes;
  let mlConfidence = 0.72;
  try {
    const mlResponse = await mlService.callMLService('/delivery-eta/predict', 'POST', mlPayload, 2);
    mlEtaMinutes = Number(
      mlResponse?.ml_eta_minutes
      ?? mlResponse?.predicted_eta_minutes
      ?? mlResponse?.prediction
      ?? baseEtaMinutes
    );
    mlConfidence = Number(mlResponse?.confidence ?? 0.72);
  } catch (error) {
    console.warn('Delivery ETA ML service unavailable, using fallback prediction:', error.message);
    mlEtaMinutes = Number((baseEtaMinutes * (1 + (trafficRatio - 1) * 0.55)).toFixed(1));
  }

  const finalEtaMinutes = calculateFinalEta(baseEtaMinutes, mlEtaMinutes, traffic, normalizedPriority);
  const result = {
    distance_km: Number(routeIntelligence.distanceKm.toFixed(2)),
    base_eta: Number(baseEtaMinutes.toFixed(1)),
    ml_eta: Number(mlEtaMinutes.toFixed(1)),
    final_eta: finalEtaMinutes,
    traffic,
    route: routeIntelligence.routeName,
    estimated_arrival_at: new Date(Date.now() + finalEtaMinutes * 60000).toISOString(),
    route_coordinates: routeIntelligence.routeCoordinates || [],
    route_polyline: routeIntelligence.routePolyline || '',
    traffic_ratio: trafficRatio,
    provider: routeIntelligence.provider,
    confidence: Number(mlConfidence.toFixed(2))
  };

  await cacheSet(cacheKey, result);
  return { ...result, cacheHit: false };
}

async function estimateHospitalDelivery(sourceCoords, hospitalCoords, options = {}) {
  return getDeliveryEstimate({
    from: sourceCoords,
    to: hospitalCoords,
    priority: options.priority || 'HIGH',
    weatherScore: options.weatherScore ?? null,
    emergencyPriority: !!options.emergencyPriority
  });
}

module.exports = {
  getDeliveryEstimate,
  estimateHospitalDelivery,
  parseCoordinatePair,
  haversineKm,
  classifyTraffic
};
