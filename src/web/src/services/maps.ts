// @types/google.maps version ^3.53.4
import { Coordinates, Vehicle, Route, MapConfig } from '../types';
import { apiClient } from '../config/api';

// Human Tasks:
// 1. Ensure Google Maps API key is configured in environment variables (REACT_APP_GOOGLE_MAPS_API_KEY)
// 2. Verify SSL certificates for secure map tile loading
// 3. Configure proper CORS settings for map assets
// 4. Review real-time tracking interval with infrastructure team
// 5. Set up monitoring for Google Maps API usage and quotas

// Constants for map configuration and styling
const DEFAULT_MAP_CONFIG: MapConfig = {
  center: { latitude: 0, longitude: 0 },
  zoom: 12,
  mapTypeId: google.maps.MapTypeId.ROADMAP
};

const VEHICLE_MARKER_ICONS = {
  active: '/assets/icons/vehicle-active.png',
  inactive: '/assets/icons/vehicle-inactive.png'
};

const UPDATE_INTERVAL = 30000; // 30 seconds for real-time updates

const GEOFENCE_STYLES = {
  strokeColor: '#FF0000',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#FF0000',
  fillOpacity: 0.35
};

// Map marker collections
const vehicleMarkers: Map<string, google.maps.Marker> = new Map();
const routePolylines: Map<string, google.maps.Polyline> = new Map();
const geofences: Map<string, google.maps.Circle> = new Map();

/**
 * Initializes a new Google Maps instance with default configuration and event listeners
 * Implements requirement: Interactive mapping using Google Maps Platform
 */
export const initializeMap = (
  container: HTMLElement,
  config: Partial<MapConfig> = {}
): google.maps.Map => {
  if (!container) {
    throw new Error('Map container element is required');
  }

  // Merge provided config with defaults
  const mapConfig = {
    ...DEFAULT_MAP_CONFIG,
    ...config,
    center: new google.maps.LatLng(
      config.center?.latitude || DEFAULT_MAP_CONFIG.center.latitude,
      config.center?.longitude || DEFAULT_MAP_CONFIG.center.longitude
    )
  };

  // Initialize map instance
  const map = new google.maps.Map(container, {
    zoom: mapConfig.zoom,
    center: mapConfig.center,
    mapTypeId: mapConfig.mapTypeId,
    fullscreenControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    zoomControl: true
  });

  // Set up map event listeners
  map.addListener('idle', () => {
    // Store map bounds for viewport management
    const bounds = map.getBounds()?.toJSON();
    if (bounds) {
      localStorage.setItem('lastMapBounds', JSON.stringify(bounds));
    }
  });

  return map;
};

/**
 * Updates or creates a vehicle marker on the map with real-time location
 * Implements requirement: Real-time GPS tracking
 */
export const updateVehicleMarker = (
  map: google.maps.Map,
  vehicle: Vehicle
): google.maps.Marker => {
  let marker = vehicleMarkers.get(vehicle.id);

  const position = new google.maps.LatLng(
    vehicle.currentLocation.latitude,
    vehicle.currentLocation.longitude
  );

  if (!marker) {
    // Create new marker if none exists
    marker = new google.maps.Marker({
      position,
      map,
      icon: {
        url: vehicle.status === 'active' 
          ? VEHICLE_MARKER_ICONS.active 
          : VEHICLE_MARKER_ICONS.inactive,
        scaledSize: new google.maps.Size(32, 32)
      },
      title: vehicle.registrationNumber
    });

    // Create info window for vehicle details
    const infoWindow = new google.maps.InfoWindow();
    marker.addListener('click', () => {
      infoWindow.setContent(`
        <div class="vehicle-info">
          <h3>Vehicle ${vehicle.registrationNumber}</h3>
          <p>Status: ${vehicle.status}</p>
          <p>Last Update: ${new Date(vehicle.lastUpdate).toLocaleString()}</p>
        </div>
      `);
      infoWindow.open(map, marker);
    });

    vehicleMarkers.set(vehicle.id, marker);
  } else {
    // Update existing marker
    marker.setPosition(position);
    marker.setIcon({
      url: vehicle.status === 'active' 
        ? VEHICLE_MARKER_ICONS.active 
        : VEHICLE_MARKER_ICONS.inactive,
      scaledSize: new google.maps.Size(32, 32)
    });
  }

  return marker;
};

/**
 * Draws a route polyline on the map with delivery waypoints
 * Implements requirement: Interactive mapping using Google Maps Platform
 */
export const drawRoute = (
  map: google.maps.Map,
  route: Route
): google.maps.Polyline => {
  // Remove existing route if present
  const existingRoute = routePolylines.get(route.id);
  if (existingRoute) {
    existingRoute.setMap(null);
  }

  // Create path from delivery coordinates
  const path = route.deliveries.map(delivery => 
    new google.maps.LatLng(
      delivery.coordinates.latitude,
      delivery.coordinates.longitude
    )
  );

  // Create new polyline
  const polyline = new google.maps.Polyline({
    path,
    geodesic: true,
    strokeColor: route.status === 'active' ? '#4CAF50' : '#9E9E9E',
    strokeOpacity: 1.0,
    strokeWeight: 3,
    map
  });

  // Add delivery markers
  route.deliveries.forEach((delivery, index) => {
    const deliveryMarker = new google.maps.Marker({
      position: new google.maps.LatLng(
        delivery.coordinates.latitude,
        delivery.coordinates.longitude
      ),
      map,
      label: `${index + 1}`,
      title: `Delivery ${delivery.id}`
    });

    // Add info window for delivery details
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="delivery-info">
          <h3>Delivery Stop ${index + 1}</h3>
          <p>Status: ${delivery.status}</p>
          <p>Scheduled: ${new Date(delivery.scheduledTime).toLocaleString()}</p>
        </div>
      `
    });

    deliveryMarker.addListener('click', () => {
      infoWindow.open(map, deliveryMarker);
    });
  });

  routePolylines.set(route.id, polyline);
  return polyline;
};

/**
 * Creates a circular or polygonal geofence on the map
 * Implements requirement: Geofencing and zone management
 */
export const createGeofence = (
  map: google.maps.Map,
  center: Coordinates,
  radius: number
): google.maps.Circle => {
  const geofence = new google.maps.Circle({
    strokeColor: GEOFENCE_STYLES.strokeColor,
    strokeOpacity: GEOFENCE_STYLES.strokeOpacity,
    strokeWeight: GEOFENCE_STYLES.strokeWeight,
    fillColor: GEOFENCE_STYLES.fillColor,
    fillOpacity: GEOFENCE_STYLES.fillOpacity,
    map,
    center: new google.maps.LatLng(center.latitude, center.longitude),
    radius: radius,
    editable: true,
    draggable: true
  });

  // Set up geofence event listeners
  geofence.addListener('radius_changed', () => {
    const newRadius = geofence.getRadius();
    // Notify backend of geofence update
    apiClient.put(`/api/geofences/${geofence.get('id')}`, {
      radius: newRadius
    });
  });

  geofence.addListener('center_changed', () => {
    const newCenter = geofence.getCenter()?.toJSON();
    if (newCenter) {
      // Notify backend of geofence update
      apiClient.put(`/api/geofences/${geofence.get('id')}`, {
        center: newCenter
      });
    }
  });

  return geofence;
};