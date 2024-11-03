// Human Tasks:
// 1. Configure error monitoring service integration (e.g., Sentry) in production
// 2. Set up error alerting thresholds in monitoring system
// 3. Review and adjust error state transition thresholds based on system load
// 4. Configure error log retention policy in log aggregation service
// 5. Set up automated error report generation for weekly review

// express v4.18.2 - Express middleware types
import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
// Import logger for structured error logging
import logger from '../utils/logger';
// Import HTTP status codes and error messages
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';

// Requirement A.1.2: Error state management interface
interface ErrorState {
  current: 'Normal' | 'Warning' | 'Critical' | 'Recovery' | 'Emergency';
  timestamp: Date;
  count: number;
  severity: string;
}

// Standardized error response interface
interface ErrorResponse {
  status: number;
  message: string;
  code: string;
  correlationId: string;
  details: object | null;
  stack?: string;
}

// Error state tracking with initial state
let currentErrorState: ErrorState = {
  current: 'Normal',
  timestamp: new Date(),
  count: 0,
  severity: 'low'
};

/**
 * Formats error details into a standardized response structure
 * @param error Error object to format
 * @returns Formatted error response
 */
const formatErrorResponse = (error: any): ErrorResponse => {
  const correlationId = error.correlationId || `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Sanitize sensitive information from error details
  const sanitizedDetails = error.details ? {
    ...error.details,
    password: undefined,
    token: undefined,
    credentials: undefined
  } : null;

  return {
    status: error.status || HTTP_STATUS.INTERNAL_SERVER,
    message: error.message || ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    code: error.code || 'INTERNAL_ERROR',
    correlationId,
    details: sanitizedDetails,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * Determines appropriate HTTP status code based on error type
 * @param error Error object to analyze
 * @returns HTTP status code
 */
const determineHttpStatus = (error: any): number => {
  if (error.name === 'ValidationError') return HTTP_STATUS.BAD_REQUEST;
  if (error.name === 'UnauthorizedError') return HTTP_STATUS.UNAUTHORIZED;
  if (error.name === 'ForbiddenError') return HTTP_STATUS.FORBIDDEN;
  if (error.name === 'NotFoundError') return HTTP_STATUS.NOT_FOUND;
  return error.status || HTTP_STATUS.INTERNAL_SERVER;
};

/**
 * Tracks and manages error state transitions based on error frequency and severity
 * @param error Error object to analyze
 * @returns Current error state
 */
const trackErrorState = (error: any): string => {
  const now = new Date();
  const timeDiff = now.getTime() - currentErrorState.timestamp.getTime();
  
  // Reset error count if more than 5 minutes have passed
  if (timeDiff > 300000) {
    currentErrorState.count = 0;
  }

  currentErrorState.count++;
  currentErrorState.timestamp = now;

  // Determine severity based on error type and status
  const severity = error.status >= 500 ? 'high' : 
                  error.status >= 400 ? 'medium' : 'low';
  currentErrorState.severity = severity;

  // Implement state transition logic based on error patterns
  if (currentErrorState.count > 100 && severity === 'high') {
    currentErrorState.current = 'Emergency';
  } else if (currentErrorState.count > 50 && severity === 'high') {
    currentErrorState.current = 'Critical';
  } else if (currentErrorState.count > 20 || severity === 'high') {
    currentErrorState.current = 'Warning';
  } else if (currentErrorState.current !== 'Normal' && currentErrorState.count < 5) {
    currentErrorState.current = 'Recovery';
  } else if (currentErrorState.count < 5) {
    currentErrorState.current = 'Normal';
  }

  return currentErrorState.current;
};

/**
 * Global error handling middleware for standardized error processing
 */
const errorHandler: ErrorRequestHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  // Track error state transition
  const errorState = trackErrorState(error);
  
  // Determine HTTP status code
  const statusCode = determineHttpStatus(error);
  
  // Format error response
  const errorResponse = formatErrorResponse(error);

  // Log error with appropriate severity
  const logMetadata = {
    correlationId: errorResponse.correlationId,
    path: req.path,
    method: req.method,
    errorState,
    statusCode,
    stack: error.stack
  };

  if (statusCode >= 500) {
    logger.error(error.message, logMetadata);
  } else if (statusCode >= 400) {
    logger.warn(error.message, logMetadata);
  } else {
    logger.info(error.message, logMetadata);
  }

  // Update system health metrics for monitoring thresholds
  if (errorState === 'Critical' || errorState === 'Emergency') {
    // Trigger alerts for critical error thresholds
    logger.error('Critical error threshold exceeded', {
      errorState,
      errorCount: currentErrorState.count,
      severity: currentErrorState.severity
    });
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Export error handler middleware as default
export default errorHandler;