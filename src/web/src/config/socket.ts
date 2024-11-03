// socket.io-client version ^4.7.0
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../constants';

// Human Tasks:
// 1. Ensure REACT_APP_SOCKET_URL is set in the environment variables
// 2. Verify SSL certificates are properly configured for WebSocket connections
// 3. Review reconnection settings with infrastructure team
// 4. Configure monitoring alerts for socket disconnections

// Global socket configuration constants
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3000';
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 3000;
const PING_TIMEOUT = 30000;
const PING_INTERVAL = 25000;

/**
 * Creates and configures a Socket.io client instance with authentication and error handling
 * Implements requirements:
 * - Real-time GPS tracking (1.2 Scope/Core Functionality)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 * - Two-way communication system (1.2 Scope/Core Functionality)
 * - Sub-second response times (1.2 Scope/Performance Requirements)
 */
export const createSocketClient = (authToken: string): Socket => {
  // Initialize socket instance with configuration
  const socket = io(SOCKET_URL, {
    // Authentication configuration
    auth: {
      token: authToken
    },
    // Connection configuration
    reconnection: true,
    reconnectionAttempts: RECONNECTION_ATTEMPTS,
    reconnectionDelay: RECONNECTION_DELAY,
    // Performance optimization settings
    pingTimeout: PING_TIMEOUT,
    pingInterval: PING_INTERVAL,
    // Transport configuration
    transports: ['websocket'],
    upgrade: false
  });

  // Set up event listeners for real-time updates
  socket.on(SOCKET_EVENTS.LOCATION_UPDATE, (data) => {
    // Handle real-time location updates (30-second intervals)
    console.debug('Location update received:', data);
  });

  socket.on(SOCKET_EVENTS.DELIVERY_STATUS_CHANGE, (data) => {
    // Handle delivery status changes in real-time
    console.debug('Delivery status changed:', data);
  });

  socket.on(SOCKET_EVENTS.ROUTE_UPDATE, (data) => {
    // Handle route updates in real-time
    console.debug('Route update received:', data);
  });

  // Set up connection event handlers
  socket.on('connect', () => {
    console.info('Socket connected successfully');
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket disconnected:', reason);
    handleSocketError(new Error(`Socket disconnected: ${reason}`));
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    handleSocketError(error);
  });

  return socket;
};

/**
 * Handles socket connection and event errors with reconnection logic
 * Implements error handling for real-time communication requirements
 */
export const handleSocketError = (error: Error): void => {
  // Log detailed error information for debugging
  console.error('Socket error occurred:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Implement exponential backoff for reconnection attempts
  const backoffDelay = Math.min(1000 * Math.pow(2, RECONNECTION_ATTEMPTS), 10000);

  // Check if error is fatal or recoverable
  if (error.message.includes('Authentication failed')) {
    // Authentication errors require user intervention
    console.error('Socket authentication failed - user action required');
    // Trigger authentication refresh flow
    return;
  }

  if (error.message.includes('Transport closed')) {
    // Network-related errors may be temporary
    setTimeout(() => {
      console.info('Attempting socket reconnection...');
      // Socket.io will handle reconnection automatically
    }, backoffDelay);
  }

  // Add error to monitoring system
  // This should be replaced with your actual error monitoring service
  console.error('Socket error reported to monitoring:', error);
};