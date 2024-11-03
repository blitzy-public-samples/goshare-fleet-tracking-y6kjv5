/**
 * HUMAN TASKS:
 * 1. Verify that the LatLng type from @react-native-maps matches the expected structure
 * 2. Ensure proper configuration of offline storage limits in the app's configuration
 * 3. Configure proper image compression settings for proof of delivery photos
 * 4. Set up proper SSL pinning for API communication
 */

// Third-party imports
import { LatLng } from '@react-native-maps'; // v1.7.1

// Internal imports
import { AUTH_ENDPOINTS } from '../constants/api';
import { STORAGE_KEYS } from '../constants/config';

// Requirement: Type definitions for React Native driver applications with offline-first architecture
export interface User {
  id: string;
  email: string;
  name: string;
}

// Requirement: Type definitions for React Native driver applications with offline-first architecture
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Requirement: Types for location tracking and sensor data with 30-second update intervals
export interface Location {
  coordinates: LatLng;
  timestamp: number;
  accuracy: number;
  speed: number;
}

// Requirement: Types for proof of delivery data structures including signature capture and photo upload
export interface ProofOfDelivery {
  signature: string;
  photos: string[];
  notes: string;
  timestamp: number;
}

// Requirement: Types for delivery management
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

// Requirement: Types for delivery management and status tracking
export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Requirement: Types for proof of delivery data structures including signature capture and photo upload
export interface Delivery {
  id: string;
  status: DeliveryStatus;
  address: string;
  customer: Customer;
  proofOfDelivery: ProofOfDelivery | null;
}

// Requirement: Types for delivery route management
export enum RouteStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Requirement: Types for delivery route management and tracking
export interface Route {
  id: string;
  deliveries: Delivery[];
  status: RouteStatus;
  startTime: number;
  endTime: number;
}

// Requirement: Types for offline data storage and synchronization
export interface DeliveryUpdate {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: number;
  location: Location;
}

// Requirement: Types for offline data handling
export interface OfflineData {
  locations: Location[];
  deliveryUpdates: DeliveryUpdate[];
  proofOfDeliveries: ProofOfDelivery[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Location Update Types
export interface LocationUpdate {
  vehicleId: string;
  location: Location;
  timestamp: number;
}

export interface BatchLocationUpdate {
  vehicleId: string;
  locations: Location[];
}

// Proof of Delivery Types
export interface ProofOfDeliverySubmission {
  deliveryId: string;
  proof: ProofOfDelivery;
  location: Location;
}

// Route Management Types
export interface RouteAssignment {
  routeId: string;
  driverId: string;
  vehicleId: string;
  startTime: number;
}

// Offline Sync Types
export interface SyncRequest {
  lastSyncTimestamp: number;
  offlineData: OfflineData;
}

export interface SyncResponse {
  success: boolean;
  timestamp: number;
  updates: {
    routes: Route[];
    deliveries: Delivery[];
  };
}

// Storage Key Types
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// API Endpoint Types
export type AuthEndpoint = typeof AUTH_ENDPOINTS[keyof typeof AUTH_ENDPOINTS];

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Geofencing Types
export interface Geofence {
  id: string;
  coordinates: LatLng[];
  radius: number;
  name: string;
}

// Navigation Types
export interface NavigationRoute {
  origin: LatLng;
  destination: LatLng;
  waypoints: LatLng[];
  optimized: boolean;
}