// @jest/globals version ^29.0.0
// @testing-library/react version ^14.0.0
// socket.io-client version ^4.7.0

// Human Tasks:
// 1. Configure test environment variables for socket connection
// 2. Set up test OAuth tokens for authentication testing
// 3. Configure test socket server with 30s update interval
// 4. Verify SSL certificates for test WebSocket connections
// 5. Set up monitoring for test socket connection metrics

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, act, waitFor } from '@testing-library/react';
import { Socket } from 'socket.io-client';
import { createSocketClient, handleSocketError } from '../../src/config/socket';
import { useSocket } from '../../src/hooks/useSocket';
import { SOCKET_EVENTS } from '../../src/constants';

/**
 * Sets up the test environment for socket integration tests
 * Implements test environment setup with authentication and event listeners
 */
const setupSocketTestEnvironment = () => {
  // Mock OAuth token for authentication
  const mockAuthToken = 'test-auth-token-123';
  
  // Create socket client instance
  const socket = createSocketClient(mockAuthToken);
  
  // Setup cleanup function
  const cleanup = () => {
    socket.disconnect();
    jest.clearAllMocks();
  };
  
  return { socket, cleanup };
};

/**
 * Creates mock location update data for testing
 * @param vehicleId - The ID of the vehicle to generate location data for
 */
const mockLocationUpdate = (vehicleId: string) => ({
  vehicleId,
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  timestamp: new Date(),
  speed: 45,
  heading: 90
});

describe('Socket Connection Tests', () => {
  let socket: Socket;
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupSocketTestEnvironment();
    socket = env.socket;
    cleanup = env.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  // Requirement: Real-time data synchronization
  test('should establish connection with valid OAuth token', async () => {
    await act(async () => {
      const connectPromise = new Promise<void>((resolve) => {
        socket.on('connect', () => resolve());
      });
      
      socket.connect();
      await connectPromise;
    });

    expect(socket.connected).toBe(true);
  });

  // Requirement: Two-way communication system
  test('should handle connection errors with invalid token', async () => {
    const errorHandler = jest.fn();
    socket.on('connect_error', errorHandler);

    await act(async () => {
      socket.auth = { token: 'invalid-token' };
      socket.connect();

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });
    });
  });

  // Requirement: Real-time data synchronization
  test('should attempt reconnection with exponential backoff', async () => {
    const reconnectHandler = jest.fn();
    socket.on('reconnect_attempt', reconnectHandler);

    await act(async () => {
      socket.disconnect();
      socket.connect();

      await waitFor(() => {
        expect(reconnectHandler).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });

  // Requirement: Two-way communication system
  test('should clean up listeners and connection on unmount', async () => {
    const disconnectHandler = jest.fn();
    socket.on('disconnect', disconnectHandler);

    await act(async () => {
      cleanup();
      
      await waitFor(() => {
        expect(disconnectHandler).toHaveBeenCalled();
      });
    });

    expect(socket.connected).toBe(false);
  });
});

describe('Real-time Updates Tests', () => {
  let socket: Socket;
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupSocketTestEnvironment();
    socket = env.socket;
    cleanup = env.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  // Requirement: Real-time GPS tracking with 30-second intervals
  test('should receive and handle vehicle location updates every 30 seconds', async () => {
    const locationHandler = jest.fn();
    const vehicleId = 'test-vehicle-1';
    const mockData = mockLocationUpdate(vehicleId);

    await act(async () => {
      socket.on(SOCKET_EVENTS.LOCATION_UPDATE, locationHandler);
      
      // Simulate 3 location updates at 30-second intervals
      for (let i = 0; i < 3; i++) {
        socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, mockData);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

      await waitFor(() => {
        expect(locationHandler).toHaveBeenCalledTimes(3);
        expect(locationHandler).toHaveBeenLastCalledWith(mockData);
      });
    });
  });

  // Requirement: Real-time data synchronization
  test('should handle delivery status changes in real-time', async () => {
    const statusHandler = jest.fn();
    const mockDeliveryUpdate = {
      deliveryId: 'test-delivery-1',
      status: 'COMPLETED',
      timestamp: new Date()
    };

    await act(async () => {
      socket.on(SOCKET_EVENTS.DELIVERY_STATUS_CHANGE, statusHandler);
      socket.emit(SOCKET_EVENTS.DELIVERY_STATUS_CHANGE, mockDeliveryUpdate);

      await waitFor(() => {
        expect(statusHandler).toHaveBeenCalledWith(mockDeliveryUpdate);
      });
    });
  });

  // Requirement: Two-way communication system
  test('should process route updates with correct event type', async () => {
    const routeHandler = jest.fn();
    const mockRouteUpdate = {
      routeId: 'test-route-1',
      status: 'IN_PROGRESS',
      waypoints: [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7589, lng: -73.9851 }
      ]
    };

    await act(async () => {
      socket.on(SOCKET_EVENTS.ROUTE_UPDATE, routeHandler);
      socket.emit(SOCKET_EVENTS.ROUTE_UPDATE, mockRouteUpdate);

      await waitFor(() => {
        expect(routeHandler).toHaveBeenCalledWith(mockRouteUpdate);
      });
    });
  });

  // Requirement: Real-time data synchronization
  test('should maintain connection during rapid update sequences', async () => {
    const updateHandler = jest.fn();
    const vehicleId = 'test-vehicle-1';

    await act(async () => {
      socket.on(SOCKET_EVENTS.LOCATION_UPDATE, updateHandler);
      
      // Simulate rapid sequence of updates
      for (let i = 0; i < 10; i++) {
        socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, mockLocationUpdate(vehicleId));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await waitFor(() => {
        expect(updateHandler).toHaveBeenCalledTimes(10);
        expect(socket.connected).toBe(true);
      });
    });
  });
});

describe('Error Handling Tests', () => {
  let socket: Socket;
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupSocketTestEnvironment();
    socket = env.socket;
    cleanup = env.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  // Requirement: Real-time data synchronization
  test('should handle network disconnections with retry logic', async () => {
    const reconnectHandler = jest.fn();
    socket.on('reconnect', reconnectHandler);

    await act(async () => {
      socket.disconnect();
      socket.connect();

      await waitFor(() => {
        expect(reconnectHandler).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });

  // Requirement: Two-way communication system
  test('should retry failed connections up to 5 times', async () => {
    const attemptHandler = jest.fn();
    socket.on('reconnect_attempt', attemptHandler);

    await act(async () => {
      socket.disconnect();
      socket.connect();

      await waitFor(() => {
        expect(attemptHandler).toHaveBeenCalledTimes(5);
      }, { timeout: 15000 });
    });
  });

  // Requirement: Real-time data synchronization
  test('should handle invalid data formats with error events', async () => {
    const errorHandler = jest.fn();
    socket.on('error', errorHandler);

    await act(async () => {
      // Simulate invalid location update
      socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, {
        vehicleId: 'test-vehicle-1',
        location: 'invalid-location-format'
      });

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      });
    });
  });

  // Requirement: Two-way communication system
  test('should log connection errors for monitoring', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    await act(async () => {
      handleSocketError(new Error('Test connection error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Socket error reported to monitoring:',
        expect.any(Error)
      );
    });
  });
});

describe('Performance Tests', () => {
  let socket: Socket;
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupSocketTestEnvironment();
    socket = env.socket;
    cleanup = env.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  // Requirement: Sub-second response times
  test('should maintain sub-second response times for updates', async () => {
    await act(async () => {
      const start = Date.now();
      
      const responsePromise = new Promise<void>((resolve) => {
        socket.emit('ping', () => {
          const latency = Date.now() - start;
          expect(latency).toBeLessThan(1000);
          resolve();
        });
      });

      await responsePromise;
    });
  });

  // Requirement: Real-time data synchronization
  test('should handle concurrent socket events efficiently', async () => {
    const eventHandler = jest.fn();
    const events = [
      SOCKET_EVENTS.LOCATION_UPDATE,
      SOCKET_EVENTS.DELIVERY_STATUS_CHANGE,
      SOCKET_EVENTS.ROUTE_UPDATE
    ];

    await act(async () => {
      events.forEach(event => socket.on(event, eventHandler));
      
      const start = Date.now();
      
      // Emit multiple events concurrently
      await Promise.all(events.map(event => 
        socket.emit(event, { timestamp: new Date() })
      ));

      await waitFor(() => {
        expect(eventHandler).toHaveBeenCalledTimes(events.length);
        expect(Date.now() - start).toBeLessThan(1000);
      });
    });
  });

  // Requirement: Real-time GPS tracking
  test('should process location updates within latency threshold', async () => {
    const locationHandler = jest.fn();
    const vehicleId = 'test-vehicle-1';

    await act(async () => {
      socket.on(SOCKET_EVENTS.LOCATION_UPDATE, locationHandler);
      
      const start = Date.now();
      socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, mockLocationUpdate(vehicleId));

      await waitFor(() => {
        expect(locationHandler).toHaveBeenCalled();
        expect(Date.now() - start).toBeLessThan(500);
      });
    });
  });

  // Requirement: Real-time data synchronization
  test('should maintain performance during high event frequency', async () => {
    const updateHandler = jest.fn();
    const vehicleId = 'test-vehicle-1';
    const updateCount = 100;
    const maxLatency = 1000;

    await act(async () => {
      socket.on(SOCKET_EVENTS.LOCATION_UPDATE, updateHandler);
      
      const start = Date.now();
      
      // Simulate high-frequency updates
      for (let i = 0; i < updateCount; i++) {
        socket.emit(SOCKET_EVENTS.LOCATION_UPDATE, mockLocationUpdate(vehicleId));
      }

      await waitFor(() => {
        expect(updateHandler).toHaveBeenCalledTimes(updateCount);
        expect(Date.now() - start).toBeLessThan(maxLatency);
      });
    });
  });
});