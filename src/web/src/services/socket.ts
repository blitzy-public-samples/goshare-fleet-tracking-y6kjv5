// socket.io-client version ^4.7.0
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../constants';
import { socketConfig } from '../config/socket';

// Human Tasks:
// 1. Ensure WebSocket server URL is configured in environment variables
// 2. Verify SSL certificates for secure WebSocket connections
// 3. Configure monitoring alerts for socket disconnections
// 4. Review reconnection settings with infrastructure team
// 5. Set up error tracking service integration

let socket: Socket | null = null;

/**
 * Initializes and configures a Socket.io client instance with authentication and reconnection settings
 * Implements requirement: Real-time data synchronization (1.2 Scope/Technical Implementation)
 */
export const initializeSocket = (authToken: string): Socket => {
  if (socket) {
    socket.close();
  }

  socket = io(socketConfig.SOCKET_URL, {
    auth: {
      token: authToken
    },
    reconnection: true,
    reconnectionAttempts: socketConfig.RECONNECTION_ATTEMPTS,
    reconnectionDelay: socketConfig.RECONNECTION_DELAY,
    transports: ['websocket'],
    upgrade: false
  });

  // Connection lifecycle event handlers
  socket.on('connect', () => {
    console.info('Socket connection established successfully');
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
 * Subscribes to real-time vehicle location updates for specified vehicles
 * Implements requirement: Real-time GPS tracking (1.2 Scope/Core Functionality)
 */
export const subscribeToVehicleUpdates = (vehicleIds: string[]): void => {
  if (!socket?.connected) {
    throw new Error('Socket connection not initialized');
  }

  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
    throw new Error('Invalid vehicle IDs provided');
  }

  // Emit subscription request
  socket.emit('subscribe:vehicles', vehicleIds);

  // Set up location update listener
  socket.on(SOCKET_EVENTS.LOCATION_UPDATE, (data: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    heading: number;
  }) => {
    // Validate data structure
    if (!data.vehicleId || !data.latitude || !data.longitude) {
      console.error('Invalid location update data received:', data);
      return;
    }

    // Update local state through state management system
    // This should be implemented by the consuming component
    console.debug('Vehicle location update received:', data);
  });
};

/**
 * Subscribes to delivery status changes for active deliveries
 * Implements requirement: Two-way communication system (1.2 Scope/Core Functionality)
 */
export const subscribeToDeliveryUpdates = (deliveryIds: string[]): void => {
  if (!socket?.connected) {
    throw new Error('Socket connection not initialized');
  }

  if (!Array.isArray(deliveryIds) || deliveryIds.length === 0) {
    throw new Error('Invalid delivery IDs provided');
  }

  // Emit subscription request
  socket.emit('subscribe:deliveries', deliveryIds);

  // Set up delivery status change listener
  socket.on(SOCKET_EVENTS.DELIVERY_STATUS_CHANGE, (data: {
    deliveryId: string;
    status: string;
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  }) => {
    // Validate data structure
    if (!data.deliveryId || !data.status) {
      console.error('Invalid delivery status data received:', data);
      return;
    }

    // Update local state through state management system
    // This should be implemented by the consuming component
    console.debug('Delivery status update received:', data);
  });
};

/**
 * Handles socket connection and event errors with retry logic
 * Implements requirement: Sub-second response times (1.2 Scope/Performance Requirements)
 */
export const handleSocketError = (error: Error): void => {
  // Log detailed error information
  console.error('Socket error occurred:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Calculate exponential backoff delay
  const backoffDelay = Math.min(
    1000 * Math.pow(2, socketConfig.RECONNECTION_ATTEMPTS),
    10000
  );

  // Handle different error types
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

  // Report error to monitoring system
  // This should be replaced with your actual error monitoring service
  console.error('Socket error reported to monitoring:', error);
};

/**
 * Safely disconnects the socket connection and cleans up listeners
 */
export const disconnectSocket = (): void => {
  if (!socket) {
    return;
  }

  // Remove all event listeners
  socket.off(SOCKET_EVENTS.LOCATION_UPDATE);
  socket.off(SOCKET_EVENTS.DELIVERY_STATUS_CHANGE);
  socket.off(SOCKET_EVENTS.ROUTE_UPDATE);
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');

  // Close socket connection
  socket.close();
  socket = null;

  console.info('Socket connection closed and cleaned up');
};