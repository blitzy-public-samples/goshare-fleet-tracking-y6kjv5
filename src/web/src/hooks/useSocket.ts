// react version ^18.0.0
// socket.io-client version ^4.7.0
// react-redux version ^8.1.0

// Human Tasks:
// 1. Configure SOCKET_URL environment variable in deployment settings
// 2. Set up monitoring alerts for socket disconnections
// 3. Review reconnection settings with infrastructure team
// 4. Configure SSL certificates for WebSocket connections
// 5. Set up alerts for tracking data latency

import { useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Socket } from 'socket.io-client';
import { createSocketClient, handleSocketError } from '../config/socket';
import { locationActions } from '../store/slices/locationSlice';
import { useAuth } from './useAuth';

/**
 * Custom React hook for managing Socket.io connections and real-time communication
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals (1.2 Scope/Core Functionality)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 * - Two-way communication system (1.2 Scope/Core Functionality)
 * - Sub-second response times (1.2 Scope/Performance Requirements)
 */
export const useSocket = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Memoized handler for vehicle location updates
   * Implements requirement: Real-time GPS tracking with 30-second intervals
   */
  const handleLocationUpdate = useCallback(
    (data: { vehicleId: string; location: { latitude: number; longitude: number } }) => {
      try {
        // Validate coordinate values
        if (
          !data.location ||
          typeof data.location.latitude !== 'number' ||
          typeof data.location.longitude !== 'number'
        ) {
          throw new Error('Invalid location data received');
        }

        // Dispatch location update to Redux store
        dispatch(
          locationActions.updateVehicleLocation({
            vehicleId: data.vehicleId,
            location: {
              latitude: data.location.latitude,
              longitude: data.location.longitude,
            },
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process location update');
        handleSocketError(err instanceof Error ? err : new Error('Location update error'));
      }
    },
    [dispatch]
  );

  /**
   * Initialize socket connection with authentication
   * Implements requirement: Real-time data synchronization
   */
  const initializeSocket = useCallback(
    (authToken: string): Socket => {
      try {
        // Create new socket instance with auth token
        const newSocket = createSocketClient(authToken);

        // Set up event listeners for real-time updates
        newSocket.on('connect', () => {
          setIsConnected(true);
          setError(null);
        });

        newSocket.on('disconnect', (reason) => {
          setIsConnected(false);
          setError(`Disconnected: ${reason}`);
        });

        newSocket.on('location_update', handleLocationUpdate);

        newSocket.on('connect_error', (err) => {
          setIsConnected(false);
          setError(`Connection error: ${err.message}`);
          handleSocketError(err);
        });

        return newSocket;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize socket');
        throw err;
      }
    },
    [handleLocationUpdate]
  );

  /**
   * Manage socket lifecycle based on authentication state
   * Implements requirements:
   * - Two-way communication system
   * - Sub-second response times
   */
  useEffect(() => {
    let activeSocket: Socket | null = null;

    const setupSocket = async () => {
      try {
        if (isAuthenticated && user?.token) {
          // Initialize socket with authentication token
          activeSocket = initializeSocket(user.token);
          setSocket(activeSocket);

          // Configure ping interval for performance monitoring
          const pingInterval = setInterval(() => {
            if (activeSocket?.connected) {
              const start = Date.now();
              activeSocket.emit('ping', () => {
                const latency = Date.now() - start;
                if (latency > 1000) {
                  // Alert if latency exceeds 1 second
                  console.warn(`High socket latency: ${latency}ms`);
                }
              });
            }
          }, 30000); // 30-second interval

          return () => {
            clearInterval(pingInterval);
          };
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Socket setup failed');
        handleSocketError(err instanceof Error ? err : new Error('Socket setup error'));
      }
    };

    setupSocket();

    // Cleanup function
    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user?.token, initializeSocket]);

  return {
    socket,
    isConnected,
    error,
  };
};

export type { Socket };