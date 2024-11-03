/**
 * HUMAN TASKS:
 * 1. Configure Firebase Cloud Messaging in the Google Cloud Console
 * 2. Add google-services.json to android/app directory
 * 3. Configure notification icons in android/app/src/main/res/
 * 4. Update AndroidManifest.xml with required notification permissions
 * 5. Configure notification channels in device settings for Android 8.0+
 */

// @react-native-firebase/messaging ^18.0.0
import messaging from '@react-native-firebase/messaging';
// react-native-push-notification ^8.1.1
import PushNotification from 'react-native-push-notification';
// @react-native-async-storage/async-storage ^1.19.0
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FEATURE_FLAGS, APP_CONFIG } from '../constants/config';

// Global notification channel configuration
const NOTIFICATION_CHANNEL_ID = 'fleet_tracker_channel';
const FCM_TOKEN_KEY = '@fcm_token';

/**
 * Initializes push notification services and requests necessary permissions
 * Requirement: Two-way communication system (1.2 Scope/Core Functionality)
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    // Check if push notifications are enabled in feature flags
    if (!FEATURE_FLAGS.enablePushNotifications) {
      console.log('Push notifications are disabled in feature flags');
      return false;
    }

    // Create the notification channel for Android
    PushNotification.createChannel(
      {
        channelId: NOTIFICATION_CHANNEL_ID,
        channelName: 'Fleet Tracker Notifications',
        channelDescription: 'Delivery and route update notifications',
        playSound: true,
        soundName: 'default',
        importance: 4, // IMPORTANCE_HIGH
        vibrate: true,
      },
      (created) => console.log(`Notification channel created: ${created}`)
    );

    // Configure default notification settings
    PushNotification.configure({
      onRegister: async function(token) {
        await registerFCMToken(token.token);
      },
      onNotification: async function(notification) {
        await handleNotification(notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Initialize Firebase Cloud Messaging
    await messaging().setAutoInitEnabled(true);
    
    // Register FCM token refresh handler
    messaging().onTokenRefresh(async (token) => {
      await registerFCMToken(token);
    });

    // Get and store initial FCM token
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await registerFCMToken(fcmToken);
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    return false;
  }
}

/**
 * Registers FCM token with backend server
 * Requirement: Push Notifications (4.1 High-Level Architecture Overview/External Services)
 */
export async function registerFCMToken(token: string): Promise<void> {
  try {
    // Store token in AsyncStorage
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

    // Send token to backend with retry logic
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;

    while (retryCount < maxRetries && !success) {
      try {
        const response = await fetch(`${APP_CONFIG.environment}/api/notifications/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        success = response.ok;
      } catch (error) {
        console.error(`FCM token registration attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    throw error;
  }
}

/**
 * Processes incoming push notifications
 * Requirement: Mobile Applications (1.1 System Overview/Mobile Applications)
 */
export async function handleNotification(notification: any): Promise<void> {
  try {
    const { title, message, data } = notification;

    // Update notification badge count
    const currentBadge = await AsyncStorage.getItem('@notification_badge') || '0';
    const newBadge = parseInt(currentBadge) + 1;
    await AsyncStorage.setItem('@notification_badge', newBadge.toString());

    // Display local notification
    PushNotification.localNotification({
      channelId: NOTIFICATION_CHANNEL_ID,
      title,
      message,
      data,
      smallIcon: 'ic_notification',
      largeIcon: 'ic_launcher',
      priority: 'high',
      visibility: 'public',
      badge: newBadge,
    });

    // Store notification in history
    const history = JSON.parse(await AsyncStorage.getItem('@notification_history') || '[]');
    history.unshift({
      id: Date.now().toString(),
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem('@notification_history', JSON.stringify(history.slice(0, 100)));
  } catch (error) {
    console.error('Failed to handle notification:', error);
    throw error;
  }
}

/**
 * Clears all notifications
 */
export async function clearNotifications(): Promise<void> {
  try {
    // Clear notification badge
    await AsyncStorage.setItem('@notification_badge', '0');

    // Cancel all local notifications
    PushNotification.cancelAllLocalNotifications();

    // Clear notification history
    await AsyncStorage.setItem('@notification_history', '[]');
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    throw error;
  }
}

/**
 * Main notification service class for handling push notifications
 * Requirement: Two-way communication system (1.2 Scope/Core Functionality)
 */
export class NotificationService {
  private messaging: typeof messaging;
  private initialized: boolean = false;

  constructor() {
    this.messaging = messaging;
    
    // Configure default notification settings
    PushNotification.configure({
      channelId: NOTIFICATION_CHANNEL_ID,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      importance: 'high',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: 'default',
    });
  }

  /**
   * Initializes the notification service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      const success = await initializeNotifications();
      if (success) {
        this.initialized = true;
        
        // Set up background message handler
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          await this.onNotificationReceived(remoteMessage);
        });

        // Set up foreground message handler
        messaging().onMessage(async remoteMessage => {
          await this.onNotificationReceived(remoteMessage);
        });
      }
      return success;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      return false;
    }
  }

  /**
   * Requests notification permissions from the user
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      await AsyncStorage.setItem('@notification_permission', enabled.toString());
      return enabled;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Handles incoming notifications
   */
  public async onNotificationReceived(notification: any): Promise<void> {
    try {
      await handleNotification(notification);
    } catch (error) {
      console.error('Failed to process received notification:', error);
      throw error;
    }
  }
}