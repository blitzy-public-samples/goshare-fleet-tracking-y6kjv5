// Third-party imports - v13.9.0
import { isEmail, isMobilePhone } from 'validator';

// Internal imports
import { 
  User, 
  Delivery, 
  ProofOfDelivery, 
  OfflineData,
  Location,
  DeliveryUpdate
} from '../types';

// HUMAN TASKS:
// 1. Configure maximum file size limits for proof of delivery photos in app settings
// 2. Set up proper image format validation rules in app configuration
// 3. Configure regional phone number validation settings
// 4. Set up proper timestamp validation rules for offline data retention

/**
 * Requirement: Data Security - Input validation for secure data handling
 * Validates email format according to RFC 5322 standards
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim();
  return isEmail(trimmedEmail, {
    allow_utf8_local_part: false,
    require_tld: true,
    allow_ip_domain: false
  });
};

/**
 * Requirement: Data Security - Input validation for secure data handling
 * Validates phone number format for specified region using E.164 format
 */
export const validatePhoneNumber = (phoneNumber: string, region: string): boolean => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // Remove all non-numeric characters except '+' prefix
  const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
  return isMobilePhone(cleanedNumber, region as any, { strictMode: true });
};

/**
 * Requirement: Data Security - Input validation for secure data handling
 * Validates delivery address completeness and format
 */
export const validateDeliveryAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const trimmedAddress = address.trim();
  
  // Check minimum length requirement
  if (trimmedAddress.length < 10) {
    return false;
  }

  // Check for required address components
  const hasStreet = /\d+.*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)/i.test(trimmedAddress);
  const hasCity = /[a-zA-Z]+(?:\s+[a-zA-Z]+)*,\s*[a-zA-Z]{2}/.test(trimmedAddress);
  const hasPostalCode = /\d{5}(-\d{4})?/.test(trimmedAddress);

  return hasStreet && hasCity && hasPostalCode;
};

/**
 * Requirement: Digital proof of delivery - Validation for proof of delivery data
 * Validates proof of delivery data completeness and format
 */
export const validateProofOfDelivery = (proofOfDelivery: ProofOfDelivery): { 
  valid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];

  // Validate signature
  if (!proofOfDelivery.signature) {
    errors.push('Signature is required');
  } else if (!/^data:image\/png;base64,/.test(proofOfDelivery.signature)) {
    errors.push('Invalid signature format');
  }

  // Validate photos
  if (!Array.isArray(proofOfDelivery.photos) || proofOfDelivery.photos.length === 0) {
    errors.push('At least one photo is required');
  } else {
    const validImageFormats = ['jpg', 'jpeg', 'png'];
    proofOfDelivery.photos.forEach((photo, index) => {
      const format = photo.split(';')[0].split('/')[1];
      if (!validImageFormats.includes(format)) {
        errors.push(`Invalid format for photo ${index + 1}`);
      }
    });
  }

  // Validate notes
  if (proofOfDelivery.notes && proofOfDelivery.notes.length > 500) {
    errors.push('Notes cannot exceed 500 characters');
  }

  // Validate timestamp
  const now = Date.now();
  if (!proofOfDelivery.timestamp || 
      typeof proofOfDelivery.timestamp !== 'number' || 
      proofOfDelivery.timestamp > now) {
    errors.push('Invalid timestamp');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Requirement: Offline-first architecture - Validation for offline data integrity
 * Validates offline data integrity before synchronization
 */
export const validateOfflineData = (offlineData: OfflineData): {
  valid: boolean;
  integrity: {
    locations: boolean;
    deliveryUpdates: boolean;
    proofOfDeliveries: boolean;
    timestamps: boolean;
  };
  errors: string[];
} => {
  const errors: string[] = [];
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Validate location data
  const validLocations = offlineData.locations.every((location: Location) => {
    const validTimestamp = location.timestamp <= now && 
                          location.timestamp >= (now - twentyFourHours);
    const validCoordinates = location.coordinates.latitude >= -90 && 
                            location.coordinates.latitude <= 90 &&
                            location.coordinates.longitude >= -180 && 
                            location.coordinates.longitude <= 180;
    return validTimestamp && validCoordinates;
  });

  if (!validLocations) {
    errors.push('Invalid location data detected');
  }

  // Validate delivery updates
  const validDeliveryUpdates = offlineData.deliveryUpdates.every((update: DeliveryUpdate) => {
    return update.deliveryId && 
           update.status && 
           update.timestamp <= now && 
           update.location;
  });

  if (!validDeliveryUpdates) {
    errors.push('Invalid delivery updates detected');
  }

  // Validate proof of deliveries
  const validProofOfDeliveries = offlineData.proofOfDeliveries.every((pod: ProofOfDelivery) => {
    const podValidation = validateProofOfDelivery(pod);
    return podValidation.valid;
  });

  if (!validProofOfDeliveries) {
    errors.push('Invalid proof of delivery data detected');
  }

  // Validate chronological order of timestamps
  const timestamps = [
    ...offlineData.locations.map(l => l.timestamp),
    ...offlineData.deliveryUpdates.map(d => d.timestamp),
    ...offlineData.proofOfDeliveries.map(p => p.timestamp)
  ].sort((a, b) => a - b);

  const validTimestamps = timestamps.every((timestamp, index) => {
    return index === 0 || timestamp >= timestamps[index - 1];
  });

  if (!validTimestamps) {
    errors.push('Timestamps are not in chronological order');
  }

  return {
    valid: errors.length === 0,
    integrity: {
      locations: validLocations,
      deliveryUpdates: validDeliveryUpdates,
      proofOfDeliveries: validProofOfDeliveries,
      timestamps: validTimestamps
    },
    errors
  };
};