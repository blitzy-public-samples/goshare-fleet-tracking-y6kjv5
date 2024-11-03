// date-fns version ^2.30.0
import { format, isValid, parseISO } from 'date-fns';
import { LOCATION_UPDATE_INTERVAL } from '../constants';

// Human Tasks:
// 1. Verify date format strings match UI design requirements
// 2. Confirm timezone handling requirements with product team
// 3. Review analytics date range requirements with stakeholders

/**
 * Formats a date object or ISO string into a localized datetime string
 * Requirement 1.2: Real-time GPS tracking - Format timestamps for location updates
 */
export const formatDateTime = (date: Date | string, formatString: string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Formats delivery times in 24-hour format
 * Requirement 1.2: Digital proof of delivery - Handle delivery completion timestamps
 */
export const formatDeliveryTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return '--:--';
    }
    
    return format(dateObj, 'HH:mm');
  } catch (error) {
    console.error('Error formatting delivery time:', error);
    return '--:--';
  }
};

/**
 * Validates if a location tracking timestamp is within acceptable range
 * Requirement 1.2: Real-time GPS tracking - Validate 30-second GPS location updates
 */
export const isValidTrackingTimestamp = (timestamp: Date | string): boolean => {
  try {
    const dateObj = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    
    if (!isValid(dateObj)) {
      return false;
    }
    
    const now = Date.now();
    const timestampMs = dateObj.getTime();
    const difference = Math.abs(now - timestampMs);
    
    return difference <= LOCATION_UPDATE_INTERVAL;
  } catch (error) {
    console.error('Error validating tracking timestamp:', error);
    return false;
  }
};

/**
 * Generates start and end dates for analytics reports
 * Requirement 1.2: Analytics and reporting - Date range formatting for analytics
 */
export const getDateRangeForAnalytics = (range: string): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  let startDate = new Date();
  
  try {
    switch (range.toLowerCase()) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        throw new Error('Invalid date range specified');
    }
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Error generating date range:', error);
    // Return last 24 hours as default range
    return {
      startDate: new Date(Date.now() - 86400000),
      endDate
    };
  }
};

/**
 * Parses ISO date strings from API responses into native Date objects
 * Requirement 1.2: Real-time GPS tracking - Handle API timestamp responses
 */
export const parseAPIDateResponse = (dateString: string): Date => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Invalid date string provided');
    }
    
    const parsedDate = parseISO(dateString);
    
    if (!isValid(parsedDate)) {
      throw new Error('Invalid ISO date format');
    }
    
    return parsedDate;
  } catch (error) {
    console.error('Error parsing API date:', error);
    throw error;
  }
};