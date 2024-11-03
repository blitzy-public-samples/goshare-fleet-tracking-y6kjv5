import { Coordinates } from '../types';
import { DELIVERY_STATUS, ROUTE_STATUS } from '../constants';

/**
 * Validates geographic coordinates for location tracking
 * Implements requirement: Real-time GPS tracking
 */
export const isValidCoordinates = (coordinates: Coordinates): boolean => {
  if (!coordinates || typeof coordinates !== 'object') {
    return false;
  }

  const { latitude, longitude } = coordinates;

  // Validate latitude is between -90 and 90 degrees
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return false;
  }

  // Validate longitude is between -180 and 180 degrees
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return false;
  }

  return true;
};

/**
 * Validates phone numbers using E.164 format
 * Example: +1234567890, +442071234567
 * Implements requirement: Data validation and integrity
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // E.164 format regex: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Validates email addresses using RFC 5322 standard
 * Implements requirement: Data validation and integrity
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Validates delivery status against allowed enum values
 * Implements requirement: Digital proof of delivery
 */
export const isValidDeliveryStatus = (status: string): boolean => {
  if (!status || typeof status !== 'string') {
    return false;
  }

  // Check if status is a valid DELIVERY_STATUS enum value
  return Object.values(DELIVERY_STATUS).includes(status as DELIVERY_STATUS);
};

/**
 * Validates route status against allowed enum values
 * Implements requirement: Data validation and integrity
 */
export const isValidRouteStatus = (status: string): boolean => {
  if (!status || typeof status !== 'string') {
    return false;
  }

  // Check if status is a valid ROUTE_STATUS enum value
  return Object.values(ROUTE_STATUS).includes(status as ROUTE_STATUS);
};

/**
 * Validates presence and non-emptiness of required fields in form data
 * Implements requirement: Data validation and integrity
 */
export const validateRequiredFields = (
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: { _error: 'Invalid data object provided' }
    };
  }

  if (!Array.isArray(requiredFields)) {
    return {
      valid: false,
      errors: { _error: 'Invalid required fields array provided' }
    };
  }

  requiredFields.forEach(field => {
    // Check if field exists and is not empty
    if (!data.hasOwnProperty(field)) {
      errors[field] = `${field} is required`;
    } else if (
      data[field] === null ||
      data[field] === undefined ||
      (typeof data[field] === 'string' && data[field].trim() === '') ||
      (Array.isArray(data[field]) && data[field].length === 0)
    ) {
      errors[field] = `${field} cannot be empty`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};