/**
 * HUMAN TASKS:
 * 1. Verify accessibility labels and hints are appropriate for screen readers
 * 2. Test pull-to-refresh behavior on different Android versions
 * 3. Validate error messages are user-friendly and translatable
 * 4. Ensure proper handling of large delivery lists for performance
 */

// Third-party imports - versions specified in package.json
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  ViewStyle
} from 'react-native'; // ^0.72.0

// Internal imports
import { Delivery, DeliveryStatus } from '../../types';
import { DeliveryCard } from './DeliveryCard';
import { useDelivery } from '../../hooks/useDelivery';

/**
 * Props interface for the DeliveryList component
 * Implements requirement: Mobile Driver App - Delivery management capabilities
 */
export interface DeliveryListProps {
  /** Callback function when a delivery item is pressed */
  onDeliveryPress: (delivery: Delivery) => void;
  /** Additional styles to apply to the container */
  style?: ViewStyle;
  /** Optional filter for delivery status */
  filter?: DeliveryStatus;
}

/**
 * A React Native component that renders a scrollable list of deliveries with offline support
 * and real-time updates.
 * 
 * Implements requirements:
 * - Mobile Driver App: React Native driver applications with delivery management capabilities
 * - Offline-first architecture: Component that works consistently in both online and offline states
 * - Real-time data synchronization: Real-time delivery updates and synchronization
 */
export const DeliveryList: React.FC<DeliveryListProps> = ({
  onDeliveryPress,
  style,
  filter
}) => {
  // State for pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  // Initialize delivery hook with offline support
  const { deliveries, loading, error, fetchDeliveries } = useDelivery();

  /**
   * Filters deliveries based on status if filter prop is provided
   * Implements requirement: Mobile Driver App - Delivery filtering capabilities
   */
  const filterDeliveries = useCallback((deliveryList: Delivery[]): Delivery[] => {
    if (!filter) return deliveryList;
    return deliveryList.filter(delivery => delivery.status === filter);
  }, [filter]);

  /**
   * Handles pull-to-refresh functionality with offline support
   * Implements requirement: Offline-first architecture - Pull-to-refresh with offline handling
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDeliveries();
    } catch (err) {
      console.error('Error refreshing deliveries:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDeliveries]);

  /**
   * Renders a single delivery item using DeliveryCard
   * Implements requirement: Mobile Driver App - Delivery item rendering
   */
  const renderItem = useCallback(({ item }: { item: Delivery }) => (
    <DeliveryCard
      delivery={item}
      onPress={() => onDeliveryPress(item)}
      key={item.id}
    />
  ), [onDeliveryPress]);

  /**
   * Renders the empty state when no deliveries are available
   * Implements requirement: Mobile Driver App - Empty state handling
   */
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {filter 
          ? `No deliveries with status: ${filter}`
          : 'No deliveries available'}
      </Text>
    </View>
  ), [filter]);

  /**
   * Renders the error state when delivery fetch fails
   * Implements requirement: Mobile Driver App - Error handling
   */
  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  /**
   * Renders the loading state during initial fetch
   * Implements requirement: Mobile Driver App - Loading state handling
   */
  if (loading && !refreshing && deliveries.length === 0) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /**
   * Main render of the delivery list with pull-to-refresh
   * Implements requirements:
   * - Mobile Driver App: Scrollable delivery list
   * - Real-time data synchronization: Pull-to-refresh updates
   */
  return (
    <FlatList
      data={filterDeliveries(deliveries)}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.container,
        deliveries.length === 0 && styles.emptyContainer
      ]}
      ListEmptyComponent={renderEmptyComponent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          accessibilityLabel="Pull to refresh deliveries"
        />
      }
      showsVerticalScrollIndicator={false}
      style={style}
      testID="delivery-list"
    />
  );
};

/**
 * Styles for the DeliveryList component following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});