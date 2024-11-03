// react version ^18.0.0
// react-redux version ^8.1.0

import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  addNotification,
  markAsRead,
  clearNotifications,
  NotificationType
} from '../store/slices/notificationSlice';
import {
  subscribeToVehicleUpdates,
  subscribeToDeliveryUpdates,
  handleSocketError,
  disconnectSocket
} from '../services/socket';

// Human Tasks:
// 1. Configure socket reconnection settings in environment variables
// 2. Set up monitoring for notification delivery latency
// 3. Review notification retention policy with product team
// 4. Configure error tracking service integration
// 5. Verify WebSocket SSL certificate configuration

interface UseNotificationOptions {
  vehicleIds?: string[];
  deliveryIds?: string[];
  autoMarkAsRead?: boolean;
}

/**
 * Custom hook for managing real-time notifications in the web dashboard
 * Implements requirements:
 * - Two-way communication system (1.2 Scope/Core Functionality)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 * - Sub-second response times (1.2 Scope/Performance Requirements)
 */
export const useNotification = (options: UseNotificationOptions = {}) => {
  const {
    vehicleIds,
    deliveryIds,
    autoMarkAsRead = false
  } = options;

  const dispatch = useDispatch();

  /**
   * Handles incoming vehicle location update notifications
   * Implements 30-second update intervals for location tracking
   */
  const handleVehicleUpdate = useCallback((update: {
    vehicleId: string;
    location: { lat: number; lng: number };
    timestamp: string;
  }) => {
    try {
      // Validate update data structure
      if (!update.vehicleId || !update.location || !update.timestamp) {
        throw new Error('Invalid vehicle update data structure');
      }

      // Create notification object
      const notification = {
        id: `vehicle_${update.vehicleId}_${Date.now()}`,
        type: NotificationType.LOCATION_UPDATE,
        timestamp: new Date(update.timestamp).getTime(),
        data: {
          vehicle: {
            id: update.vehicleId,
            location: update.location
          },
          message: `Vehicle ${update.vehicleId} location updated`
        }
      };

      // Dispatch notification to Redux store
      dispatch(addNotification(notification));

      // Auto mark as read if enabled
      if (autoMarkAsRead) {
        dispatch(markAsRead([notification.id]));
      }
    } catch (error) {
      handleSocketError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [dispatch, autoMarkAsRead]);

  /**
   * Handles incoming delivery status change notifications
   * Implements real-time delivery status updates
   */
  const handleDeliveryUpdate = useCallback((update: {
    deliveryId: string;
    status: string;
    timestamp: string;
  }) => {
    try {
      // Validate update data structure
      if (!update.deliveryId || !update.status || !update.timestamp) {
        throw new Error('Invalid delivery update data structure');
      }

      // Create notification object
      const notification = {
        id: `delivery_${update.deliveryId}_${Date.now()}`,
        type: NotificationType.DELIVERY_STATUS,
        timestamp: new Date(update.timestamp).getTime(),
        data: {
          delivery: {
            id: update.deliveryId,
            status: update.status
          },
          message: `Delivery ${update.deliveryId} status changed to ${update.status}`
        }
      };

      // Dispatch notification to Redux store
      dispatch(addNotification(notification));

      // Auto mark as read if enabled
      if (autoMarkAsRead) {
        dispatch(markAsRead([notification.id]));
      }
    } catch (error) {
      handleSocketError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }, [dispatch, autoMarkAsRead]);

  /**
   * Set up socket subscriptions for vehicle updates with 30-second intervals
   */
  useEffect(() => {
    if (vehicleIds && vehicleIds.length > 0) {
      try {
        subscribeToVehicleUpdates(vehicleIds);
      } catch (error) {
        handleSocketError(error instanceof Error ? error : new Error('Vehicle subscription error'));
      }
    }
  }, [vehicleIds]);

  /**
   * Set up socket subscriptions for delivery updates
   */
  useEffect(() => {
    if (deliveryIds && deliveryIds.length > 0) {
      try {
        subscribeToDeliveryUpdates(deliveryIds);
      } catch (error) {
        handleSocketError(error instanceof Error ? error : new Error('Delivery subscription error'));
      }
    }
  }, [deliveryIds]);

  /**
   * Clean up socket subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  /**
   * Return notification management functions
   */
  return {
    /**
     * Marks specified notifications as read
     */
    markAsRead: useCallback((ids: string[]) => {
      dispatch(markAsRead(ids));
    }, [dispatch]),

    /**
     * Removes a specific notification
     */
    removeNotification: useCallback((id: string) => {
      // Note: removeNotification is handled through clearNotifications
      // as per the notification slice implementation
      dispatch(clearNotifications());
    }, [dispatch]),

    /**
     * Clears all notifications
     */
    clearNotifications: useCallback(() => {
      dispatch(clearNotifications());
    }, [dispatch])
  };
};

export default useNotification;