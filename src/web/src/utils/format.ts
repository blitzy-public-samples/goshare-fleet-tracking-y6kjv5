// date-fns version ^2.30.0
import { format, formatDistance } from 'date-fns';
import { DELIVERY_STATUS } from '../constants';
import { Coordinates } from '../types';

// Human Tasks:
// 1. Verify date-fns localization settings match application requirements
// 2. Confirm coordinate precision requirements with mapping team
// 3. Review distance unit preferences with product team
// 4. Validate delivery status display text with UX team

/**
 * Formats geographic coordinates into a human-readable string with 6 decimal precision
 * Implements requirement 1.2: Real-time GPS tracking - Format geographic coordinates for display
 */
export const formatCoordinates = (coordinates: Coordinates): string => {
  if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
    throw new Error('Invalid coordinates provided');
  }

  const { latitude, longitude } = coordinates;
  
  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordinates out of valid range');
  }

  const latDirection = latitude >= 0 ? 'N' : 'S';
  const longDirection = longitude >= 0 ? 'E' : 'W';

  // Format with 6 decimal precision for high accuracy tracking
  const formattedLat = Math.abs(latitude).toFixed(6);
  const formattedLong = Math.abs(longitude).toFixed(6);

  return `${formattedLat}°${latDirection}, ${formattedLong}°${longDirection}`;
};

/**
 * Formats date and time values for consistent display
 * Implements requirement 1.2: Interactive fleet management dashboard - Format vehicle data
 */
export const formatDateTime = (date: Date, formatString: string): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  try {
    // Convert to local timezone and format
    return format(date, formatString);
  } catch (error) {
    throw new Error(`Date formatting failed: ${error.message}`);
  }
};

/**
 * Formats delivery status enum values into human-readable display text
 * Implements requirement 1.2: Digital proof of delivery - Format delivery status
 */
export const formatDeliveryStatus = (status: DELIVERY_STATUS): string => {
  const statusMap: Record<DELIVERY_STATUS, string> = {
    [DELIVERY_STATUS.PENDING]: 'Pending',
    [DELIVERY_STATUS.IN_PROGRESS]: 'In Progress',
    [DELIVERY_STATUS.COMPLETED]: 'Completed',
    [DELIVERY_STATUS.FAILED]: 'Failed'
  };

  const formattedStatus = statusMap[status];
  if (!formattedStatus) {
    throw new Error('Invalid delivery status provided');
  }

  return formattedStatus;
};

/**
 * Formats time durations into human-readable strings
 * Implements requirement 1.2: Interactive fleet management dashboard - Format vehicle data
 */
export const formatDuration = (startTime: Date, endTime: Date): string => {
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
    throw new Error('Invalid date objects provided');
  }

  if (startTime > endTime) {
    throw new Error('Start time cannot be after end time');
  }

  try {
    // Handle edge cases
    const durationMs = endTime.getTime() - startTime.getTime();
    if (durationMs < 60000) { // Less than 1 minute
      return 'Less than a minute';
    }
    if (durationMs > 86400000) { // More than 24 hours
      return formatDistance(startTime, endTime, { addSuffix: false });
    }

    return formatDistance(startTime, endTime, { addSuffix: false });
  } catch (error) {
    throw new Error(`Duration formatting failed: ${error.message}`);
  }
};

/**
 * Formats distance values with appropriate units (km/m)
 * Implements requirement 1.2: Interactive fleet management dashboard - Format vehicle data
 */
export const formatDistance = (meters: number): string => {
  if (typeof meters !== 'number' || meters < 0) {
    throw new Error('Invalid distance value provided');
  }

  // Convert to kilometers if distance is 1000m or greater
  if (meters >= 1000) {
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(1)} km`;
  }

  // Use meters for shorter distances
  return `${Math.round(meters)} m`;
};