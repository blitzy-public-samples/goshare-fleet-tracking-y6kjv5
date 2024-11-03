/**
 * Human Tasks:
 * 1. Ensure @turf/turf package is installed with correct version (^6.5.0)
 * 2. Verify MongoDB geospatial indexes are set up for efficient spatial queries
 * 3. Configure proper error monitoring for geospatial calculation failures
 */

// @version: @turf/turf ^6.5.0
import * as turf from '@turf/turf';
import { Coordinates } from '../../common/types';
import { LOCATION_CONSTANTS } from '../../common/constants';

// Earth's radius in meters for Haversine formula calculations
const EARTH_RADIUS = 6371000; // meters

/**
 * Requirement: Real-time GPS tracking
 * Calculates the distance between two geographic coordinates using the Haversine formula
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    if (!validateCoordinates(point1) || !validateCoordinates(point2)) {
        throw new Error('Invalid coordinates provided for distance calculation');
    }

    const lat1 = toRadians(point1.latitude);
    const lat2 = toRadians(point2.latitude);
    const deltaLat = toRadians(point2.latitude - point1.latitude);
    const deltaLon = toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS * c;
};

/**
 * Requirement: Geofencing
 * Checks if a geographic point lies within a polygon defined by an array of coordinates
 */
export const isPointInPolygon = (point: Coordinates, polygonVertices: Coordinates[]): boolean => {
    if (!validateCoordinates(point) || !polygonVertices.every(validateCoordinates)) {
        throw new Error('Invalid coordinates provided for polygon containment check');
    }

    if (polygonVertices.length < 3) {
        throw new Error('Polygon must have at least 3 vertices');
    }

    // Convert point to GeoJSON format
    const pointGeoJSON = turf.point([point.longitude, point.latitude]);

    // Convert polygon vertices to GeoJSON format
    const polygonCoords = [...polygonVertices, polygonVertices[0]].map(vertex => [
        vertex.longitude,
        vertex.latitude
    ]);
    const polygonGeoJSON = turf.polygon([polygonCoords]);

    return turf.booleanPointInPolygon(pointGeoJSON, polygonGeoJSON);
};

/**
 * Requirement: Location Processing
 * Validates geographic coordinates to ensure they are within valid ranges
 */
export const validateCoordinates = (coordinates: Coordinates): boolean => {
    if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
        return false;
    }

    const { latitude, longitude } = coordinates;

    // Check for NaN values
    if (isNaN(latitude) || isNaN(longitude)) {
        return false;
    }

    // Validate latitude range (-90 to 90 degrees)
    if (latitude < -90 || latitude > 90) {
        return false;
    }

    // Validate longitude range (-180 to 180 degrees)
    if (longitude < -180 || longitude > 180) {
        return false;
    }

    return true;
};

/**
 * Requirement: Location Processing
 * Calculates a bounding box around a center point with specified radius
 */
export const calculateBoundingBox = (center: Coordinates, radiusInMeters: number): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
} => {
    if (!validateCoordinates(center)) {
        throw new Error('Invalid center coordinates provided for bounding box calculation');
    }

    if (radiusInMeters <= 0) {
        throw new Error('Radius must be greater than 0');
    }

    // Create a point feature from the center coordinates
    const centerPoint = turf.point([center.longitude, center.latitude]);
    
    // Create a circular buffer around the point
    const buffer = turf.buffer(centerPoint, radiusInMeters / 1000, { units: 'kilometers' });
    
    // Get the bounding box of the buffer
    const bbox = turf.bbox(buffer);

    return {
        minLng: bbox[0],
        minLat: bbox[1],
        maxLng: bbox[2],
        maxLat: bbox[3]
    };
};

/**
 * Requirement: Real-time GPS tracking
 * Calculates the heading/bearing between two points in degrees
 */
export const calculateHeading = (start: Coordinates, end: Coordinates): number => {
    if (!validateCoordinates(start) || !validateCoordinates(end)) {
        throw new Error('Invalid coordinates provided for heading calculation');
    }

    // Use turf.js bearing calculation
    const startPoint = turf.point([start.longitude, start.latitude]);
    const endPoint = turf.point([end.longitude, end.latitude]);
    
    // Calculate bearing and normalize to 0-360 range
    let bearing = turf.bearing(startPoint, endPoint);
    bearing = (bearing + 360) % 360;

    return bearing;
};

/**
 * Helper function to convert degrees to radians
 */
const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
};

// Export constants for external use
export const GEO_CONSTANTS = {
    EARTH_RADIUS,
    UPDATE_INTERVAL: LOCATION_CONSTANTS.UPDATE_INTERVAL,
    LOCATION_CACHE_TTL: LOCATION_CONSTANTS.LOCATION_CACHE_TTL
};