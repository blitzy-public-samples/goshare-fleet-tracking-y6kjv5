/**
 * HUMAN TASKS:
 * 1. Verify proper navigation configuration in navigation stack
 * 2. Test offline functionality with various network conditions
 * 3. Validate accessibility features for screen readers
 * 4. Ensure proper error message translations are configured
 */

// Third-party imports - versions specified in package.json
import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { Delivery, DeliveryStatus } from '../../types';
import { DeliveryList as DeliveryListComponent } from '../../components/delivery/DeliveryList';
import { useDelivery } from '../../hooks/useDelivery';

/**
 * Props interface for the DeliveryList screen component
 * Implements requirement: Mobile Driver Applications - Screen navigation
 */
interface DeliveryListScreenProps {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
}

/**
 * A React Native screen component that displays a list of deliveries with offline support
 * and real-time updates.
 * 
 * Implements requirements:
 * - Mobile Driver Applications: React Native driver applications with delivery management capabilities
 * - Offline-first architecture: Screen component that works consistently in both online and offline states
 * - Real-time data synchronization: Real-time delivery updates and synchronization
 */
export const DeliveryListScreen: React.FC<DeliveryListScreenProps> = () => {
  // Initialize hooks
  const navigation = useNavigation();
  const { deliveries, loading, error, fetchDeliveries } = useDelivery();

  /**
   * Handles navigation to delivery details when a delivery is pressed
   * Implements requirement: Mobile Driver Applications - Navigation to delivery details
   */
  const handleDeliveryPress = useCallback((delivery: Delivery) => {
    navigation.navigate('DeliveryDetails', {
      deliveryId: delivery.id
    });
  }, [navigation]);

  /**
   * Handles manual refresh of delivery list with offline support
   * Implements requirement: Offline-first architecture - Manual refresh with offline handling
   */
  const handleRefresh = useCallback(async () => {
    try {
      await fetchDeliveries();
    } catch (err) {
      console.error('Error refreshing deliveries:', err);
    }
  }, [fetchDeliveries]);

  /**
   * Renders error state when delivery fetch fails
   * Implements requirement: Mobile Driver Applications - Error handling
   */
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      </View>
    );
  }

  /**
   * Renders loading state during initial fetch
   * Implements requirement: Mobile Driver Applications - Loading states
   */
  if (loading && deliveries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          accessibilityLabel="Loading deliveries"
        />
      </View>
    );
  }

  /**
   * Main render of the delivery list screen with Material Design principles
   * Implements requirements:
   * - Mobile Driver Applications: Delivery list display
   * - Real-time data synchronization: Real-time updates
   * - Offline-first architecture: Offline-first functionality
   */
  return (
    <View style={styles.container}>
      <DeliveryListComponent
        onDeliveryPress={handleDeliveryPress}
        style={styles.list}
        filter={undefined} // No filter by default, can be added based on requirements
      />
    </View>
  );
};

/**
 * Styles for the DeliveryList screen following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  list: {
    flex: 1
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});