// Human Tasks:
// 1. Create 'logs' directory in project root with appropriate write permissions
// 2. Configure log rotation cleanup in production environment
// 3. Set up log aggregation service integration for production
// 4. Review and adjust log retention policy based on storage capacity
// 5. Configure log shipping to centralized logging system

// winston v3.10.0 - Core logging functionality
import winston from 'winston';
// winston-daily-rotate-file v4.7.1 - Log rotation support
import DailyRotateFile from 'winston-daily-rotate-file';
// Node.js process module - built-in
import { env } from 'process';
// Import environment configuration
import { APP_CONSTANTS } from '../constants/index';

// Requirement A.1.1: System Health Monitoring Thresholds - Define log levels for different severity states
const LOG_LEVELS = {
  error: 0, // Critical system errors requiring immediate attention
  warn: 1,  // Warning conditions
  info: 2,  // Normal operational messages
  http: 3,  // HTTP request logging
  debug: 4  // Detailed debug information
};

// Requirement A.1.3: System Logs - Configure log rotation with 90-day retention
const DEFAULT_LOG_CONFIG = {
  maxSize: '20m',
  maxFiles: '90d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  dirname: 'logs'
};

/**
 * Formats log messages with consistent structure including timestamp and metadata
 * @param info Winston log entry object
 * @returns Formatted log message string
 */
const formatLogMessage = (info: winston.LogEntry): string => {
  const { timestamp, level, message, ...metadata } = info;

  // Requirement A.1.2: Error Handling States - Include detailed error information
  const formattedMessage = {
    timestamp: timestamp || new Date().toISOString(),
    service: 'fleet-tracking-system',
    environment: APP_CONSTANTS.NODE_ENV,
    level,
    message,
    correlationId: metadata.correlationId || 'no-correlation-id',
    ...(metadata.stack && { stack: metadata.stack }),
    ...(Object.keys(metadata).length > 0 && { metadata })
  };

  return JSON.stringify(formattedMessage);
};

/**
 * Determines appropriate log level based on environment
 * @returns Log level string
 */
const getLogLevel = (): string => {
  switch (APP_CONSTANTS.NODE_ENV) {
    case 'development':
      return 'debug';
    case 'staging':
      return 'info';
    case 'production':
      return 'warn';
    default:
      return 'info';
  }
};

/**
 * Creates and configures Winston logger instance with appropriate transports
 * @returns Configured Winston logger instance
 */
const createLogger = (): winston.Logger => {
  // Configure console transport with color coding
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(formatLogMessage)
    )
  });

  // Configure file transport for all logs
  const fileTransport = new DailyRotateFile({
    ...DEFAULT_LOG_CONFIG,
    filename: 'application-%DATE%.log',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(formatLogMessage)
    )
  });

  // Configure error file transport for error-level logs
  const errorFileTransport = new DailyRotateFile({
    ...DEFAULT_LOG_CONFIG,
    filename: 'error-%DATE%.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(formatLogMessage)
    )
  });

  // Create and configure logger instance
  return winston.createLogger({
    level: getLogLevel(),
    levels: LOG_LEVELS,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    transports: [
      consoleTransport,
      fileTransport,
      errorFileTransport
    ],
    // Requirement A.1.2: Error Handling States - Handle uncaught exceptions
    exceptionHandlers: [
      new DailyRotateFile({
        ...DEFAULT_LOG_CONFIG,
        filename: 'exceptions-%DATE%.log'
      })
    ],
    // Prevent process exit on handled exceptions
    exitOnError: false
  });
};

// Create and export logger instance
const logger = createLogger();

// Export default logger instance with exposed logging methods
export default logger;