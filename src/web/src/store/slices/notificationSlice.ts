// @reduxjs/toolkit version ^1.9.5
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SOCKET_EVENTS } from '../../constants';
import type { Vehicle, Delivery } from '../../types';

// Human Tasks:
// 1. Verify socket event names match backend implementation
// 2. Confirm notification retention period with product team
// 3. Review notification sorting criteria with UX team
// 4. Validate unread count calculation logic with QA team

// Notification types based on socket events
export enum NotificationType {
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  DELIVERY_STATUS = 'DELIVERY_STATUS',
  ROUTE_UPDATE = 'ROUTE_UPDATE'
}

// Notification data structure
interface Notification {
  id: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  data: {
    vehicle?: Vehicle;
    delivery?: Delivery;
    message: string;
  };
}

// Notification state interface
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastUpdated: number;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  lastUpdated: Date.now()
};

// Create notification slice with reducers
// Implements requirements: Real-time data synchronization, Two-way communication system
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add new notification with automatic sorting and limit enforcement
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Validate notification payload
      if (!action.payload.id || !action.payload.type || !action.payload.timestamp) {
        return;
      }

      // Add new notification to beginning of array
      state.notifications.unshift({
        ...action.payload,
        read: false
      });

      // Sort notifications by timestamp in descending order
      state.notifications.sort((a, b) => b.timestamp - a.timestamp);

      // Limit to most recent 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }

      // Increment unread count
      state.unreadCount += 1;

      // Update lastUpdated timestamp
      state.lastUpdated = Date.now();
    },

    // Mark multiple notifications as read in batch operation
    markAsRead: (state, action: PayloadAction<string[]>) => {
      const notificationIds = action.payload;
      let unreadUpdated = 0;

      // Update read status for specified notifications
      state.notifications = state.notifications.map(notification => {
        if (notificationIds.includes(notification.id) && !notification.read) {
          unreadUpdated += 1;
          return { ...notification, read: true };
        }
        return notification;
      });

      // Update unread count
      state.unreadCount = Math.max(0, state.unreadCount - unreadUpdated);

      // Update lastUpdated timestamp
      state.lastUpdated = Date.now();
    },

    // Clear all notifications and reset state
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.lastUpdated = Date.now();
    }
  }
});

// Export actions
export const {
  addNotification,
  markAsRead,
  clearNotifications
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationState }) => 
  state.notifications.unreadCount;

// Export reducer
export default notificationSlice.reducer;

// Socket event name constants for notification handling
export const {
  LOCATION_UPDATE,
  DELIVERY_STATUS_CHANGE,
  ROUTE_UPDATE
} = SOCKET_EVENTS;