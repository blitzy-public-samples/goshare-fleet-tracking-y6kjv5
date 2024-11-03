// jest version ^29.0.0
// jest-localstorage-mock version ^2.4.26
import {
  formatDateTime,
  formatDeliveryTime,
  isValidTrackingTimestamp,
  getDateRangeForAnalytics,
  parseAPIDateResponse
} from '../../src/utils/date';
import {
  formatCoordinates,
  formatDeliveryStatus,
  formatDuration,
  formatDistance
} from '../../src/utils/format';
import { storage } from '../../src/utils/storage';
import {
  isValidCoordinates,
  isValidPhoneNumber,
  isValidEmail,
  isValidDeliveryStatus,
  isValidRouteStatus,
  validateRequiredFields
} from '../../src/utils/validation';
import { DELIVERY_STATUS, ROUTE_STATUS, LOCATION_UPDATE_INTERVAL } from '../../src/constants';

// Human Tasks:
// 1. Verify test coverage meets minimum requirements (>90%)
// 2. Confirm error message text with UX team
// 3. Review test data with product team for realistic scenarios
// 4. Validate timezone test cases with international team

describe('Date Utils', () => {
  // Test suite for date utility functions
  // Requirement: Data validation and integrity - Test date formatting functions
  
  describe('formatDateTime', () => {
    it('should format date object correctly', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      expect(formatDateTime(date, 'yyyy-MM-dd HH:mm:ss')).toBe('2023-01-01 12:00:00');
    });

    it('should format ISO string correctly', () => {
      expect(formatDateTime('2023-01-01T12:00:00Z', 'yyyy-MM-dd')).toBe('2023-01-01');
    });

    it('should handle invalid dates', () => {
      expect(formatDateTime('invalid-date', 'yyyy-MM-dd')).toBe('');
    });
  });

  describe('formatDeliveryTime', () => {
    it('should format time in 24-hour format', () => {
      const date = new Date('2023-01-01T15:30:00Z');
      expect(formatDeliveryTime(date)).toBe('15:30');
    });

    it('should return placeholder for invalid time', () => {
      expect(formatDeliveryTime('invalid-time')).toBe('--:--');
    });
  });

  describe('isValidTrackingTimestamp', () => {
    it('should validate timestamps within interval', () => {
      const now = new Date();
      expect(isValidTrackingTimestamp(now)).toBe(true);
    });

    it('should reject timestamps outside interval', () => {
      const oldDate = new Date(Date.now() - LOCATION_UPDATE_INTERVAL * 2);
      expect(isValidTrackingTimestamp(oldDate)).toBe(false);
    });
  });

  describe('getDateRangeForAnalytics', () => {
    it('should generate correct day range', () => {
      const { startDate, endDate } = getDateRangeForAnalytics('day');
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(endDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should generate correct week range', () => {
      const { startDate, endDate } = getDateRangeForAnalytics('week');
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should handle invalid ranges', () => {
      const { startDate, endDate } = getDateRangeForAnalytics('invalid');
      expect(endDate.getTime() - startDate.getTime()).toBe(86400000); // 24 hours
    });
  });

  describe('parseAPIDateResponse', () => {
    it('should parse valid ISO dates', () => {
      const result = parseAPIDateResponse('2023-01-01T12:00:00Z');
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('should throw error for invalid dates', () => {
      expect(() => parseAPIDateResponse('invalid-date')).toThrow();
    });
  });
});

describe('Format Utils', () => {
  // Test suite for formatting utility functions
  // Requirement: Real-time GPS tracking - Test coordinate formatting
  
  describe('formatCoordinates', () => {
    it('should format valid coordinates', () => {
      expect(formatCoordinates({ latitude: 51.5074, longitude: -0.1278 }))
        .toBe('51.507400°N, 0.127800°W');
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => formatCoordinates({ latitude: 91, longitude: 0 }))
        .toThrow('Coordinates out of valid range');
    });
  });

  describe('formatDeliveryStatus', () => {
    it('should format valid delivery status', () => {
      expect(formatDeliveryStatus(DELIVERY_STATUS.IN_PROGRESS)).toBe('In Progress');
    });

    it('should throw error for invalid status', () => {
      expect(() => formatDeliveryStatus('INVALID' as DELIVERY_STATUS))
        .toThrow('Invalid delivery status provided');
    });
  });

  describe('formatDuration', () => {
    it('should format duration between dates', () => {
      const start = new Date('2023-01-01T12:00:00Z');
      const end = new Date('2023-01-01T13:30:00Z');
      expect(formatDuration(start, end)).toBe('1 hour 30 minutes');
    });

    it('should handle short durations', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 30000); // 30 seconds
      expect(formatDuration(start, end)).toBe('Less than a minute');
    });
  });

  describe('formatDistance', () => {
    it('should format distances in meters', () => {
      expect(formatDistance(850)).toBe('850 m');
    });

    it('should format distances in kilometers', () => {
      expect(formatDistance(1500)).toBe('1.5 km');
    });

    it('should throw error for negative distances', () => {
      expect(() => formatDistance(-100)).toThrow('Invalid distance value provided');
    });
  });
});

describe('Storage Utils', () => {
  // Test suite for browser storage operations
  // Requirement: Offline operation support - Test storage functions
  
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store data in localStorage', () => {
      const testData = { id: 1, name: 'Test' };
      storage.setItem('test', testData);
      expect(localStorage.getItem('test')).toBe(JSON.stringify(testData));
    });

    it('should store data in sessionStorage', () => {
      const testData = { id: 1, name: 'Test' };
      storage.setItem('test', testData, true);
      expect(sessionStorage.getItem('test')).toBe(JSON.stringify(testData));
    });
  });

  describe('getItem', () => {
    it('should retrieve data from localStorage', () => {
      const testData = { id: 1, name: 'Test' };
      localStorage.setItem('test', JSON.stringify(testData));
      expect(storage.getItem('test')).toEqual(testData);
    });

    it('should return null for non-existent items', () => {
      expect(storage.getItem('non-existent')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item from storage', () => {
      localStorage.setItem('test', 'value');
      storage.removeItem('test');
      expect(localStorage.getItem('test')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all storage', () => {
      localStorage.setItem('test1', 'value1');
      localStorage.setItem('test2', 'value2');
      storage.clear();
      expect(localStorage.length).toBe(0);
    });
  });
});

describe('Validation Utils', () => {
  // Test suite for validation utility functions
  // Requirement: Data validation and integrity - Test validation functions
  
  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidCoordinates({ latitude: 'invalid', longitude: 0 } as any)).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate E.164 phone numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+442071234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('1234567890')).toBe(false);
      expect(isValidPhoneNumber('+invalid')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidDeliveryStatus', () => {
    it('should validate correct delivery statuses', () => {
      expect(isValidDeliveryStatus(DELIVERY_STATUS.PENDING)).toBe(true);
      expect(isValidDeliveryStatus(DELIVERY_STATUS.COMPLETED)).toBe(true);
    });

    it('should reject invalid delivery statuses', () => {
      expect(isValidDeliveryStatus('INVALID_STATUS')).toBe(false);
      expect(isValidDeliveryStatus('')).toBe(false);
    });
  });

  describe('isValidRouteStatus', () => {
    it('should validate correct route statuses', () => {
      Object.values(ROUTE_STATUS).forEach(status => {
        expect(isValidRouteStatus(status)).toBe(true);
      });
    });

    it('should reject invalid route statuses', () => {
      expect(isValidRouteStatus('INVALID_STATUS')).toBe(false);
      expect(isValidRouteStatus('')).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should validate presence of required fields', () => {
      const data = { name: 'Test', email: 'test@example.com', phone: '' };
      const result = validateRequiredFields(data, ['name', 'email']);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should collect errors for missing fields', () => {
      const data = { name: '', email: null };
      const result = validateRequiredFields(data, ['name', 'email', 'phone']);
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(3);
    });

    it('should handle invalid input data', () => {
      const result = validateRequiredFields(null as any, ['name']);
      expect(result.valid).toBe(false);
      expect(result.errors._error).toBe('Invalid data object provided');
    });
  });
});