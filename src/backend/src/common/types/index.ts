// @version: mongoose ^7.4.0

/**
 * Human Tasks:
 * 1. Ensure MongoDB is configured with geospatial indexes for location-based queries
 * 2. Configure proper validation middleware for these types in respective services
 * 3. Set up proper schema validation in MongoDB for these interfaces
 */

// Requirement: Real-time GPS tracking with 30-second update intervals
// Geographic coordinates type definition
export interface Coordinates {
    latitude: number;
    longitude: number;
}

// Requirement: Real-time GPS tracking - Vehicle location update type
export interface LocationUpdate {
    vehicleId: string;
    coordinates: Coordinates;
    timestamp: Date;
    speed: number;      // Speed in km/h
    heading: number;    // Heading in degrees (0-360)
    accuracy: number;   // GPS accuracy in meters
}

// Requirement: Fleet Management - Vehicle status enumeration
export enum VehicleStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    MAINTENANCE = 'maintenance',
    OUT_OF_SERVICE = 'out_of_service'
}

// Requirement: Fleet Management - Vehicle entity type definition
export interface Vehicle {
    id: string;
    registrationNumber: string;
    type: string;                  // Vehicle type (e.g., truck, van, car)
    status: VehicleStatus;
    lastLocation: Coordinates;
    lastUpdated: Date;
    capacity: number;              // Cargo capacity in cubic meters
}

// Requirement: Route Management - Route status enumeration
export enum RouteStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

// Requirement: Route Management - Route entity type definition
export interface Route {
    id: string;
    vehicleId: string;
    driverId: string;
    deliveries: Delivery[];
    status: RouteStatus;
    startTime: Date;
    endTime: Date;
    optimizationScore: number;     // Route optimization score (0-100)
}

// Requirement: Digital proof of delivery - Delivery status enumeration
export enum DeliveryStatus {
    PENDING = 'pending',
    IN_TRANSIT = 'in_transit',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

// Requirement: Digital proof of delivery - Proof of delivery type definition
export interface ProofOfDelivery {
    signature: string;             // Base64 encoded signature
    photos: string[];             // Array of photo URLs
    notes: string;                // Delivery notes
    timestamp: Date;              // Time of delivery completion
}

// Requirement: Digital proof of delivery - Delivery entity type definition
export interface Delivery {
    id: string;
    routeId: string;
    status: DeliveryStatus;
    location: Coordinates;
    scheduledTime: Date;
    completedTime: Date | null;
    proofOfDelivery: ProofOfDelivery | null;
}