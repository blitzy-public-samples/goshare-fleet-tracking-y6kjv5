/**
 * HUMAN TASKS:
 * 1. Configure notification icons in android/app/src/main/res/
 * 2. Update AndroidManifest.xml with required notification permissions
 * 3. Configure notification channels in device settings for Android 8.0+
 * 4. Test notification interactions with different notification types
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text
} from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

import Loading from '../../components/common/Loading';
import Card from '../../components/common/Card';
import { NotificationService } from '../../services/notification';

/**
 * Interface for notification data structure
 * Requirement: Two-way communication system (1.2 Scope/Core Functionality)
 */
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'delivery' | 'route' | 'system';
  timestamp: Date;
  read: boolean;
  data: object | null;
}

/**
 * Screen component for displaying and managing driver notifications
 * Requirement: Mobile Applications (1.1 System Overview/Mobile Applications)
 */
const Notifications: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  /**
   * Fetches notifications from local storage and server
   * Requirement: Two-way communication system (1.2 Scope/Core Functionality)
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get notifications from local storage
      const storedNotifications = JSON.parse(
        await AsyncStorage.getItem('@notification_history') || '[]'
      );

      // Transform stored notifications to match interface
      const formattedNotifications: Notification[] = storedNotifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.data?.type || 'system',
        timestamp: new Date(n.timestamp),
        read: n.read || false,
        data: n.data
      }));

      setNotifications(formattedNotifications);

      // Sync with server if online
      try {
        const response = await fetch(`${APP_CONFIG.apiUrl}/notifications`);
        if (response.ok) {
          const serverNotifications = await response.json();
          // Merge server notifications with local ones
          const mergedNotifications = [...serverNotifications, ...formattedNotifications]
            .filter((n, index, self) => 
              index === self.findIndex(t => t.id === n.id)
            )
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          setNotifications(mergedNotifications);
          // Update local storage
          await AsyncStorage.setItem(
            '@notification_history',
            JSON.stringify(mergedNotifications)
          );
        }
      } catch (error) {
        console.error('Failed to sync notifications with server:', error);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handles pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  /**
   * Handles notification item press event
   * Requirement: Mobile Applications (1.1 System Overview/Mobile Applications)
   */
  const handleNotificationPress = useCallback(async (notification: Notification) => {
    try {
      // Mark notification as read
      const updatedNotifications = notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      );
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem(
        '@notification_history',
        JSON.stringify(updatedNotifications)
      );

      // Navigate based on notification type
      switch (notification.type) {
        case 'delivery':
          navigation.navigate('DeliveryDetails', { 
            deliveryId: notification.data?.deliveryId 
          });
          break;
        case 'route':
          navigation.navigate('RouteDetails', { 
            routeId: notification.data?.routeId 
          });
          break;
        case 'system':
          navigation.navigate('AppSettings');
          break;
      }
    } catch (error) {
      console.error('Failed to handle notification press:', error);
    }
  }, [navigation, notifications]);

  /**
   * Renders individual notification item
   */
  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => {
    const formattedDate = new Date(item.timestamp).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <Card
        style={styles.notificationItem}
        onPress={() => handleNotificationPress(item)}
      >
        <View>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTimestamp}>{formattedDate}</Text>
          {!item.read && <View style={styles.unreadIndicator} />}
        </View>
      </Card>
    );
  }, [handleNotificationPress]);

  // Initialize notifications on mount
  useEffect(() => {
    const notificationService = new NotificationService();
    
    // Set up notification listener
    const unsubscribe = notificationService.onNotificationReceived(async (notification) => {
      await fetchNotifications();
    });

    // Initial fetch
    fetchNotifications();

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [fetchNotifications]);

  if (loading) {
    return <Loading size="large" fullScreen />;
  }

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#666666'
  },
  listContainer: {
    flexGrow: 1,
    padding: 16
  },
  notificationItem: {
    marginBottom: 8
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#999999'
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    position: 'absolute',
    top: 8,
    right: 8
  }
});

export default Notifications;