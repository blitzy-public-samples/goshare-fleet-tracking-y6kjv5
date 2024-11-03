// @types/google.maps version ^3.53.4
import '@types/google.maps';

// Human Tasks:
// 1. Verify Google Maps API key is configured in environment variables
// 2. Confirm socket.io event names match backend implementation
// 3. Review API endpoint paths match backend routes
// 4. Validate performance thresholds with infrastructure team

// API Version
export const API_VERSION = 'v1';

// Location Update Interval (30 seconds) - Requirement 1.2: Real-time GPS tracking
export const LOCATION_UPDATE_INTERVAL = 30000;

// Map Default Settings - Requirement 1.2: Interactive fleet management dashboard
export const MAP_DEFAULT_ZOOM = 12;
export const MAP_DEFAULT_CENTER = { lat: 0, lng: 0 };

// System Timeouts - Requirement 1.2: Performance Requirements
export const MAX_OFFLINE_DURATION = 86400000; // 24 hours in milliseconds
export const API_TIMEOUT = 5000; // 5 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const CACHE_DURATION = 300000; // 5 minutes

// Vehicle Status Enum - Requirement 1.2: Interactive fleet management dashboard
export enum VEHICLE_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE'
}

// Driver Status Enum - Requirement 1.2: Interactive fleet management dashboard
export enum DRIVER_STATUS {
  AVAILABLE = 'AVAILABLE',
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY'
}

// Delivery Status Enum - Requirement 1.2: Route optimization and planning
export enum DELIVERY_STATUS {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Route Status Enum - Requirement 1.2: Route optimization and planning
export enum ROUTE_STATUS {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Map Settings Object - Requirement 1.2: Interactive fleet management dashboard
export const MAP_SETTINGS = {
  DEFAULT_ZOOM: MAP_DEFAULT_ZOOM,
  DEFAULT_CENTER: MAP_DEFAULT_CENTER,
  UPDATE_INTERVAL: LOCATION_UPDATE_INTERVAL
} as const;

// Socket Events - Requirement 1.2: Real-time GPS tracking
export const SOCKET_EVENTS = {
  LOCATION_UPDATE: 'vehicle:location:update',
  DELIVERY_STATUS_CHANGE: 'delivery:status:change',
  ROUTE_UPDATE: 'route:update'
} as const;

// API Endpoints - Requirement 1.2: Interactive fleet management dashboard
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh'
  },
  FLEET: {
    BASE: '/fleet',
    VEHICLES: '/fleet/vehicles',
    DRIVERS: '/fleet/drivers'
  },
  ROUTE: {
    BASE: '/routes',
    OPTIMIZE: '/routes/optimize',
    ACTIVE: '/routes/active'
  },
  DELIVERY: {
    BASE: '/deliveries',
    STATUS: '/deliveries/status',
    PROOF: '/deliveries/proof'
  }
} as const;

// Performance Thresholds - Requirement 1.2: Performance Requirements
export const PERFORMANCE_THRESHOLDS = {
  MAX_RESPONSE_TIME: 2000, // 2 seconds
  MAX_DATA_LATENCY: 5000 // 5 seconds
} as const;